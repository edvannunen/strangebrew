/* ============================================================
   STRANGE BREW — brouwdashboard
   ============================================================ */

const FONT_BODY = "Work Sans, sans-serif";
const FONT_MONO = "IBM Plex Mono, monospace";

const COLORS = {
  gold:   "#F4B942",
  amber:  "#F0921F",
  orange: "#EE7B2E",
  red:    "#D8432A",
  cream:  "#EFE6D6",
  creamDim: "#ABA294",
  line:   "rgba(241,230,201,0.14)",
};

/* ---------- EBC -> kleur (bierkleur-schaal) ---------------- */
const EBC_STOPS = [
  [4,   "#F7E389"],
  [6,   "#F3D250"],
  [8,   "#EFBF3E"],
  [10,  "#E8A722"],
  [13,  "#DE9111"],
  [17,  "#D27E0A"],
  [20,  "#C66C0C"],
  [24,  "#B75A0E"],
  [28,  "#A84C10"],
  [33,  "#954012"],
  [39,  "#7F3512"],
  [47,  "#6B2C10"],
  [55,  "#58230D"],
  [65,  "#45190A"],
  [80,  "#331207"],
  [100, "#220B04"],
  [130, "#150604"],
];

function hexToRgb(hex){
  const n = parseInt(hex.slice(1), 16);
  return [(n>>16)&255, (n>>8)&255, n&255];
}
function rgbToHex(r,g,b){
  return "#" + [r,g,b].map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,"0")).join("");
}
function ebcToHex(ebc){
  if (ebc == null) return "#5B5B5B";
  const v = Math.max(EBC_STOPS[0][0], Math.min(EBC_STOPS[EBC_STOPS.length-1][0], ebc));
  for (let i=0; i<EBC_STOPS.length-1; i++){
    const [e0, c0] = EBC_STOPS[i];
    const [e1, c1] = EBC_STOPS[i+1];
    if (v >= e0 && v <= e1){
      const t = (v - e0) / (e1 - e0);
      const [r0,g0,b0] = hexToRgb(c0);
      const [r1,g1,b1] = hexToRgb(c1);
      return rgbToHex(r0+(r1-r0)*t, g0+(g1-g0)*t, b0+(b1-b0)*t);
    }
  }
  return EBC_STOPS[EBC_STOPS.length-1][1];
}
function ebcGradientCss(){
  const stops = EBC_STOPS.map(([e,c]) => {
    const pct = ((e - EBC_STOPS[0][0]) / (EBC_STOPS[EBC_STOPS.length-1][0] - EBC_STOPS[0][0])) * 100;
    return `${c} ${pct.toFixed(1)}%`;
  });
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

/* ---------- Helpers ------------------------------------------------ */
function esc(str){
  if (str == null) return "";
  return String(str).replace(/[&<>"']/g, s => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[s]));
}
function normLabelName(fname){
  return fname
    .replace(/\.jpg$/i, "")
    .replace(/^\s*batch\d+\s*-?\s*/i, "")
    .trim();
}

let RECIPES = [];
let activeFilter = null; // { type: "style"|"hop"|"yeast", value: string|string[] }
let searchQuery = "";

/* ============================================================
   INIT
   ============================================================ */
fetch("data.json")
  .then(r => r.json())
  .then(data => {
    RECIPES = data.slice().sort((a,b) => (a.batch ?? 999) - (b.batch ?? 999));
    initTabs();
    buildHeroAndStats();
    buildStyleChart();
    buildAbvChart();
    buildBatchChart();
    buildHopChart();
    buildMoutChart();
    initMoutToggle();
    buildYeastList();
    buildEbcScale();
    buildTimeline();
    initModal();
    initFilterBar();
    initSearchBox();
  })
  .catch(err => {
    console.error("Kon data.json niet laden:", err);
    document.querySelector("main").innerHTML =
      '<p style="padding:60px 0;color:#ABA294;">Kon de brouwdata niet laden. Zorg dat dit bestand als webpagina wordt geopend (niet rechtstreeks vanaf schijf), zodat data.json bereikbaar is.</p>';
  });

/* ============================================================
   TABS
   ============================================================ */
function initTabs(){
  document.getElementById("tab-cijfers").addEventListener("click", () => showPage("cijfers"));
  document.getElementById("tab-tijdlijn").addEventListener("click", () => showPage("tijdlijn"));
}
function showPage(which){
  const tabCijfers = document.getElementById("tab-cijfers");
  const tabTijdlijn = document.getElementById("tab-tijdlijn");
  const pageCijfers = document.getElementById("page-cijfers");
  const pageTijdlijn = document.getElementById("page-tijdlijn");
  const cijfers = which === "cijfers";
  tabCijfers.classList.toggle("active", cijfers);
  tabTijdlijn.classList.toggle("active", !cijfers);
  tabCijfers.setAttribute("aria-selected", cijfers);
  tabTijdlijn.setAttribute("aria-selected", !cijfers);
  pageCijfers.hidden = !cijfers;
  pageTijdlijn.hidden = cijfers;
  window.scrollTo({top:0, behavior: "instant" in window ? "instant" : "auto"});
}

/* ============================================================
   TIJDLIJN FILTER (klik in grafieken op stijl/hop/gist)
   ============================================================ */
function initFilterBar(){
  document.getElementById("timeline-filter-clear").addEventListener("click", clearFilter);
}
function applyFilter(type, value){
  activeFilter = { type, value };
  showPage("tijdlijn");
  buildTimeline();
}
function clearFilter(){
  activeFilter = null;
  buildTimeline();
}
function matchesFilter(r){
  if (!activeFilter) return true;
  const { type, value } = activeFilter;
  if (type === "style") return Array.isArray(value) ? value.includes(r.style) : r.style === value;
  if (type === "hop") return (r.hops||[]).some(h => h.name === value);
  if (type === "yeast") return (r.yeasts||[]).includes(value);
  if (type === "grain") return (r.fermentables||[]).some(f => f.name === value);
  return true;
}
function filterLabel(){
  if (!activeFilter) return "";
  const { type, value } = activeFilter;
  if (type === "style") return Array.isArray(value) ? `Stijl: overig (${value.length})` : `Stijl: ${value}`;
  if (type === "hop") return `Hop: ${value}`;
  if (type === "yeast") return `Gist: ${value}`;
  if (type === "grain") return `Mout: ${value}`;
  return "";
}
function updateFilterBar(){
  const bar = document.getElementById("timeline-filter");
  const labelEl = document.getElementById("timeline-filter-label");
  if (activeFilter){
    bar.hidden = false;
    labelEl.textContent = filterLabel();
  } else {
    bar.hidden = true;
    labelEl.textContent = "";
  }
}

/* ============================================================
   TIJDLIJN ZOEKEN (naam + ingrediënten)
   ============================================================ */
function initSearchBox(){
  document.getElementById("timeline-search").addEventListener("input", (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    buildTimeline();
  });
}
function matchesSearch(r){
  if (!searchQuery) return true;
  const haystack = [
    r.name, r.style,
    ...(r.fermentables||[]).map(f=>f.name),
    ...(r.hops||[]).map(h=>h.name),
    ...(r.yeasts||[]),
    ...(r.misc||[]),
  ].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(searchQuery);
}
function matchesTimeline(r){
  return matchesFilter(r) && matchesSearch(r);
}

/* ============================================================
   HERO + KERNCIJFERS
   ============================================================ */
function buildHeroAndStats(){
  const withDate = RECIPES.filter(r => r.date_iso);
  const years = withDate.map(r => parseInt(r.date_iso.slice(0,4)));
  const firstYear = years.length ? Math.min(...years) : "----";
  const lastYear = years.length ? Math.max(...years) : "----";

  document.getElementById("hero-count").textContent = RECIPES.length;
  document.getElementById("hero-firstyear").textContent = firstYear;

  const abvVals = RECIPES.map(r=>r.abv).filter(v=>v!=null);
  const sizeVals = RECIPES.map(r=>r.batch_size_l).filter(v=>v!=null);
  const avgAbv = abvVals.reduce((a,b)=>a+b,0) / abvVals.length;
  const avgSize = sizeVals.reduce((a,b)=>a+b,0) / sizeVals.length;
  const totalLiters = sizeVals.reduce((a,b)=>a+b,0);
  const styleCount = new Set(RECIPES.map(r=>r.style)).size;

  const stats = [
    { value: RECIPES.length, unit:"", label:"Brouwsels totaal" },
    { value: `${firstYear}–${lastYear}`, unit:"", label:"Tijdspanne", mono:true },
    { value: avgAbv.toFixed(1), unit:"% vol", label:"Gemiddeld alcohol" },
    { value: avgSize.toFixed(1), unit:"L", label:"Gemiddelde batch" },
    { value: Math.round(totalLiters), unit:"L", label:"Totaal gebrouwen" },
    { value: styleCount, unit:"", label:"Verschillende stijlen" },
  ];

  const wrap = document.getElementById("stats-strip");
  wrap.innerHTML = stats.map(s => `
    <div class="stat-cell">
      <div class="stat-value${s.mono ? " stat-value-mono" : ""}">${esc(s.value)}${s.unit ? `<span class="unit">${esc(s.unit)}</span>` : ""}</div>
      <div class="stat-label">${esc(s.label)}</div>
    </div>
  `).join("");
}

/* ============================================================
   CHART: BIERSTIJLEN
   ============================================================ */
function chartBaseOptions(extra={}){
  return Object.assign({
    responsive:true, maintainAspectRatio:false,
    plugins:{
      legend:{display:false},
      tooltip:{
        backgroundColor:"#15161A", titleColor:COLORS.cream, bodyColor:COLORS.creamDim,
        borderColor:COLORS.line, borderWidth:1, padding:10,
        titleFont:{family:FONT_BODY, weight:"600"}, bodyFont:{family:FONT_MONO, size:12},
      }
    }
  }, extra);
}

function buildStyleChart(){
  const counts = {};
  RECIPES.forEach(r => { counts[r.style] = (counts[r.style]||0) + 1; });
  const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const top = entries.slice(0, 10);
  const restEntries = entries.slice(10);
  const rest = restEntries.reduce((s,[,c])=>s+c, 0);
  if (rest > 0) top.push(["Overig", rest]);

  new Chart(document.getElementById("chart-stijl"), {
    type:"bar",
    data:{
      labels: top.map(e=>e[0]),
      datasets:[{
        data: top.map(e=>e[1]),
        backgroundColor: top.map((_,i)=> i % 2 === 0 ? COLORS.orange : COLORS.amber),
        borderRadius:4,
        maxBarThickness:26,
      }]
    },
    options: chartBaseOptions({
      indexAxis:"y",
      onClick: (evt, elements) => {
        if (!elements.length) return;
        const [label] = top[elements[0].index];
        if (label === "Overig"){
          applyFilter("style", restEntries.map(e=>e[0]));
        } else {
          applyFilter("style", label);
        }
      },
      onHover: (evt, elements) => { evt.native.target.style.cursor = elements.length ? "pointer" : "default"; },
      plugins:{
        legend:{display:false},
        tooltip:{
          backgroundColor:"#15161A", titleColor:COLORS.cream, bodyColor:COLORS.creamDim,
          borderColor:COLORS.line, borderWidth:1, padding:10,
          titleFont:{family:FONT_BODY, weight:"600"}, bodyFont:{family:FONT_MONO, size:12},
          callbacks:{
            label: (ctx) => {
              const [label, count] = top[ctx.dataIndex];
              if (label === "Overig"){
                return restEntries.map(([name,c]) => `${name}: ${c}`);
              }
              return `${count} brouwsels`;
            }
          }
        }
      },
      scales:{
        x:{ ticks:{color:COLORS.creamDim, font:{family:FONT_MONO, size:11}}, grid:{color:COLORS.line}, beginAtZero:true, ticks:{precision:0, color: COLORS.creamDim, font:{family:FONT_MONO, size:11}} },
        y:{ ticks:{color:COLORS.cream, font:{family:FONT_BODY, size:12}}, grid:{display:false} }
      }
    })
  });
}

/* ============================================================
   CHART: ABV histogram
   ============================================================ */
function histogram(values, binSize, min, max){
  const bins = [];
  for (let b=min; b<max; b+=binSize) bins.push({from:b, to:b+binSize, count:0});
  values.forEach(v => {
    const idx = Math.min(bins.length-1, Math.max(0, Math.floor((v-min)/binSize)));
    if (bins[idx]) bins[idx].count++;
  });
  return bins;
}

function buildAbvChart(){
  const vals = RECIPES.map(r=>r.abv).filter(v=>v!=null);
  const min = Math.floor(Math.min(...vals));
  const max = Math.ceil(Math.max(...vals));
  const bins = histogram(vals, 1, min, max);

  new Chart(document.getElementById("chart-abv"), {
    type:"bar",
    data:{
      labels: bins.map(b => `${b.from}–${b.to}%`),
      datasets:[{
        data: bins.map(b=>b.count),
        backgroundColor: COLORS.gold,
        borderRadius:4,
        maxBarThickness:30,
      }]
    },
    options: chartBaseOptions({
      scales:{
        x:{ ticks:{color:COLORS.creamDim, font:{family:FONT_MONO, size:10}}, grid:{display:false} },
        y:{ ticks:{precision:0, color:COLORS.creamDim, font:{family:FONT_MONO, size:11}}, grid:{color:COLORS.line}, beginAtZero:true }
      }
    })
  });
}

/* ============================================================
   CHART: batchgrootte histogram
   ============================================================ */
function buildBatchChart(){
  const vals = RECIPES.map(r=>r.batch_size_l).filter(v=>v!=null);
  const min = 0;
  const max = Math.ceil(Math.max(...vals)/5)*5;
  const bins = histogram(vals, 5, min, max);

  new Chart(document.getElementById("chart-batch"), {
    type:"bar",
    data:{
      labels: bins.map(b => `${b.from}–${b.to}L`),
      datasets:[{
        data: bins.map(b=>b.count),
        backgroundColor: COLORS.red,
        borderRadius:4,
        maxBarThickness:30,
      }]
    },
    options: chartBaseOptions({
      scales:{
        x:{ ticks:{color:COLORS.creamDim, font:{family:FONT_MONO, size:10}}, grid:{display:false} },
        y:{ ticks:{precision:0, color:COLORS.creamDim, font:{family:FONT_MONO, size:11}}, grid:{color:COLORS.line}, beginAtZero:true }
      }
    })
  });
}

/* ============================================================
   CHART: hopsoorten
   ============================================================ */
function buildHopChart(){
  const byHop = {};
  RECIPES.forEach(r => {
    (r.hops||[]).forEach(h => {
      if (!byHop[h.name]) byHop[h.name] = {count:0, grams:0};
      byHop[h.name].count += 1;
      byHop[h.name].grams += (h.grams||0);
    });
  });
  const entries = Object.entries(byHop).sort((a,b)=>b[1].count-a[1].count).slice(0,12);

  new Chart(document.getElementById("chart-hop"), {
    type:"bar",
    data:{
      labels: entries.map(e=>e[0]),
      datasets:[
        {
          label:"Aantal brouwsels",
          data: entries.map(e=>e[1].count),
          backgroundColor: COLORS.orange,
          borderRadius:4,
          maxBarThickness:22,
          yAxisID:"y",
        },
      ]
    },
    options: chartBaseOptions({
      onClick: (evt, elements) => {
        if (!elements.length) return;
        const e = entries[elements[0].index];
        applyFilter("hop", e[0]);
      },
      onHover: (evt, elements) => { evt.native.target.style.cursor = elements.length ? "pointer" : "default"; },
      plugins:{
        legend:{display:false},
        tooltip:{
          backgroundColor:"#15161A", titleColor:COLORS.cream, bodyColor:COLORS.creamDim,
          borderColor:COLORS.line, borderWidth:1, padding:10,
          titleFont:{family:FONT_BODY, weight:"600"}, bodyFont:{family:FONT_MONO, size:12},
          callbacks:{
            label: (ctx) => {
              const e = entries[ctx.dataIndex];
              return [`${e[1].count} brouwsels`, `${Math.round(e[1].grams)} g totaal`];
            }
          }
        }
      },
      scales:{
        x:{ ticks:{color:COLORS.cream, font:{family:FONT_BODY, size:11}, maxRotation:55, minRotation:55}, grid:{display:false} },
        y:{ ticks:{precision:0, color:COLORS.creamDim, font:{family:FONT_MONO, size:11}}, grid:{color:COLORS.line}, beginAtZero:true }
      }
    })
  });
}

/* ============================================================
   CHART: mout
   ============================================================ */
let hideBaseMalt = false;
let moutChart = null;

// Herkent de basismouten (Pils/Pale) die vrijwel elk brouwsel domineren,
// zonder ze te verwarren met moutsoorten die toevallig "pils"/"pale" in
// hun naam hebben maar specialty mout zijn (Cara-Pils, Pale Wheat, Pale
// Chocolate Malt).
function isBaseMalt(name){
  const n = name.toLowerCase();
  if (n.includes("cara") || n.includes("wheat") || n.includes("chocolate")) return false;
  if (n.includes("pils")) return true;
  if (n.startsWith("pale malt")) return true;
  if (n === "pale ale (dingemans)") return true;
  return false;
}

function buildMoutChart(){
  const byMout = {};
  RECIPES.forEach(r => {
    (r.fermentables||[]).forEach(f => {
      if (f.type !== "Grain") return;
      if (hideBaseMalt && isBaseMalt(f.name)) return;
      if (!byMout[f.name]) byMout[f.name] = {count:0, grams:0};
      byMout[f.name].count += 1;
      byMout[f.name].grams += (f.grams||0);
    });
  });
  const entries = Object.entries(byMout).sort((a,b)=>b[1].count-a[1].count).slice(0,12);

  if (moutChart) moutChart.destroy();
  moutChart = new Chart(document.getElementById("chart-mout"), {
    type:"bar",
    data:{
      labels: entries.map(e=>e[0]),
      datasets:[
        {
          label:"Aantal brouwsels",
          data: entries.map(e=>e[1].count),
          backgroundColor: COLORS.amber,
          borderRadius:4,
          maxBarThickness:22,
          yAxisID:"y",
        },
      ]
    },
    options: chartBaseOptions({
      onClick: (evt, elements) => {
        if (!elements.length) return;
        const e = entries[elements[0].index];
        applyFilter("grain", e[0]);
      },
      onHover: (evt, elements) => { evt.native.target.style.cursor = elements.length ? "pointer" : "default"; },
      plugins:{
        legend:{display:false},
        tooltip:{
          backgroundColor:"#15161A", titleColor:COLORS.cream, bodyColor:COLORS.creamDim,
          borderColor:COLORS.line, borderWidth:1, padding:10,
          titleFont:{family:FONT_BODY, weight:"600"}, bodyFont:{family:FONT_MONO, size:12},
          callbacks:{
            label: (ctx) => {
              const e = entries[ctx.dataIndex];
              return [`${e[1].count} brouwsels`, `${Math.round(e[1].grams)} g totaal`];
            }
          }
        }
      },
      scales:{
        x:{ ticks:{color:COLORS.cream, font:{family:FONT_BODY, size:11}, maxRotation:55, minRotation:55}, grid:{display:false} },
        y:{ ticks:{precision:0, color:COLORS.creamDim, font:{family:FONT_MONO, size:11}}, grid:{color:COLORS.line}, beginAtZero:true }
      }
    })
  });
}

function initMoutToggle(){
  const btn = document.getElementById("mout-toggle");
  btn.addEventListener("click", () => {
    hideBaseMalt = !hideBaseMalt;
    btn.textContent = hideBaseMalt ? "Pils & Pale Ale tonen" : "Pils & Pale Ale verbergen";
    buildMoutChart();
  });
}

/* ============================================================
   GIST LIJST
   ============================================================ */
function buildYeastList(){
  const counts = {};
  RECIPES.forEach(r => (r.yeasts||[]).forEach(y => { counts[y] = (counts[y]||0)+1; }));
  const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const max = entries.length ? entries[0][1] : 1;

  document.getElementById("yeast-list").innerHTML = entries.map(([name,count]) => `
    <li class="yeast-row" data-yeast="${esc(name)}" tabindex="0" role="button" aria-label="Filter tijdlijn op gist ${esc(name)}">
      <span class="yeast-name" title="${esc(name)}">${esc(name)}</span>
      <span class="yeast-bar-track"><span class="yeast-bar-fill" style="width:${(count/max*100).toFixed(0)}%"></span></span>
      <span class="yeast-count">${count}</span>
    </li>
  `).join("");

  document.querySelectorAll("#yeast-list .yeast-row").forEach(el => {
    el.addEventListener("click", () => applyFilter("yeast", el.dataset.yeast));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " "){
        e.preventDefault();
        applyFilter("yeast", el.dataset.yeast);
      }
    });
  });
}

/* ============================================================
   EBC KLEURENSCHAAL
   ============================================================ */
function buildEbcScale(){
  document.getElementById("ebc-scale").style.background = ebcGradientCss();

  const minE = EBC_STOPS[0][0], maxE = EBC_STOPS[EBC_STOPS.length-1][0];
  const withEbc = RECIPES.filter(r => r.ebc != null);
  const dotsWrap = document.getElementById("ebc-dots");

  dotsWrap.innerHTML = withEbc.map(r => {
    const v = Math.max(minE, Math.min(maxE, r.ebc));
    const pct = ((v-minE)/(maxE-minE))*100;
    const jitter = (r.batch % 5) * 7; // klein verticaal jitterpatroon zodat bolletjes niet overlappen
    return `<button class="ebc-dot" style="left:${pct.toFixed(2)}%; top:${jitter}px; background:${ebcToHex(r.ebc)};"
      data-batch="${r.batch}" title="#${r.batch} ${esc(r.name)} — ${r.ebc.toFixed(0)} EBC" aria-label="#${r.batch} ${esc(r.name)}, ${r.ebc.toFixed(0)} EBC"></button>`;
  }).join("");

  dotsWrap.querySelectorAll(".ebc-dot").forEach(el => {
    el.addEventListener("click", () => openModalForBatch(parseInt(el.dataset.batch)));
  });
}

/* ============================================================
   TIJDLIJN (pagina 2)
   ============================================================ */
function buildTimeline(){
  updateFilterBar();

  const filtered = RECIPES.filter(matchesTimeline);
  const withDate = filtered.filter(r => r.date_iso).sort((a,b)=> a.date_iso.localeCompare(b.date_iso));
  const withoutDate = filtered.filter(r => !r.date_iso).sort((a,b)=> a.batch-b.batch);

  if (!filtered.length){
    document.getElementById("timeline").innerHTML = `<p class="timeline-empty">Geen brouwsels gevonden.</p>`;
    return;
  }

  const byYear = {};
  withDate.forEach(r => {
    const y = r.date_iso.slice(0,4);
    (byYear[y] = byYear[y] || []).push(r);
  });

  const years = Object.keys(byYear).sort();
  let html = "";

  if (withoutDate.length){
    html += renderYearBlock("Datum onbekend", withoutDate);
  }
  years.forEach(y => { html += renderYearBlock(y, byYear[y]); });

  document.getElementById("timeline").innerHTML = html;

  document.querySelectorAll(".label-tile").forEach(el => {
    el.addEventListener("click", () => openModalForBatch(parseInt(el.dataset.batch), filtered));
  });
}

function renderYearBlock(yearLabel, recipes){
  return `
    <div class="timeline-year">
      <span class="num">${esc(yearLabel)}</span>
      <span class="rule"></span>
      <span class="count">${recipes.length} brouwsel${recipes.length===1?"":"s"}</span>
    </div>
    <div class="label-grid">
      ${recipes.map(renderLabelTile).join("")}
    </div>
  `;
}

function renderLabelTile(r){
  const hasLabel = r.labels && r.labels.length > 0;
  const firstLabel = hasLabel ? `images/thumbs/${encodeURIComponent(r.labels[0])}` : "images/logo.png";
  const variantNote = hasLabel && r.labels.length > 1 ? `<span class="label-variant-badge">${r.labels.length}x</span>` : "";
  const ebcHex = r.ebc != null ? ebcToHex(r.ebc) : "#5B5B5B";

  return `
    <button class="label-tile" data-batch="${r.batch}">
      <div class="label-thumb-wrap ${hasLabel ? "" : "placeholder"}">
        <img src="${firstLabel}" alt="Etiket ${esc(r.name)}" loading="lazy">
        <span class="label-batch-badge">#${String(r.batch).padStart(2,"0")}</span>
        ${variantNote}
        <span class="label-ebc-chip" style="background:${ebcHex}" title="${r.ebc != null ? r.ebc.toFixed(0)+' EBC' : ''}"></span>
      </div>
      <span class="label-name">${esc(r.name)}</span>
      <span class="label-meta">${r.date_display || "datum onbekend"}</span>
    </button>
  `;
}

/* ============================================================
   MODAL / DETAILKAART
   ============================================================ */
let currentModalIndex = -1;
let modalList = []; // list prev/next navigates through — the timeline's current filter+search, or all RECIPES from the EBC scale

function initModal(){
  const overlay = document.getElementById("modal-overlay");
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-content").addEventListener("click", (e) => {
    if (e.target.closest(".ticket-nav-prev")) showModalAtIndex(currentModalIndex - 1);
    if (e.target.closest(".ticket-nav-next")) showModalAtIndex(currentModalIndex + 1);
  });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (document.getElementById("modal-overlay").hidden) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowLeft") showModalAtIndex(currentModalIndex - 1);
    if (e.key === "ArrowRight") showModalAtIndex(currentModalIndex + 1);
  });
}
function closeModal(){
  document.getElementById("modal-overlay").hidden = true;
}
function showModalAtIndex(idx){
  if (idx < 0 || idx >= modalList.length) return;
  currentModalIndex = idx;
  renderModalContent(modalList[idx]);
  document.getElementById("modal-card").scrollTop = 0;
}
function openModalForBatch(batchNum, list){
  modalList = list || RECIPES;
  const idx = modalList.findIndex(x => x.batch === batchNum);
  if (idx === -1) return;
  currentModalIndex = idx;
  renderModalContent(modalList[idx]);
  document.getElementById("modal-overlay").hidden = false;
}
function renderModalContent(r){
  const hasLabel = r.labels && r.labels.length > 0;
  const ebcHex = r.ebc != null ? ebcToHex(r.ebc) : "#5B5B5B";

  const thumbHtml = hasLabel
    ? `<div class="ticket-thumb"><img src="${"images/labels/"+encodeURIComponent(r.labels[0])}" alt="Etiket ${esc(r.name)}"></div>`
    : `<div class="ticket-thumb placeholder"><img src="images/logo.png" alt="Geen etiket beschikbaar"></div>`;

  const fermHtml = (r.fermentables && r.fermentables.length)
    ? r.fermentables.map(f => `<span class="grain-pill">${esc(f.name)}${f.grams != null ? `<span class="grams">${Math.round(f.grams)}g</span>` : ""}</span>`).join("")
    : `<span class="grain-pill">geen gegevens</span>`;

  const hopsHtml = (r.hops && r.hops.length)
    ? r.hops.map(h => `<span class="hop-pill">${esc(h.name)}<span class="grams">${Math.round(h.grams)}g</span></span>`).join("")
    : `<span class="hop-pill">geen hopgegevens</span>`;

  const yeastHtml = (r.yeasts && r.yeasts.length)
    ? r.yeasts.map(y => `<span class="yeast-tag">${esc(y)}</span>`).join("")
    : `<span class="yeast-tag">onbekend</span>`;

  const variantsHtml = hasLabel && r.labels.length > 1
    ? `<div class="ticket-section-title">Labelvarianten (${r.labels.length})</div>
       <div class="hop-pills">${r.labels.map(l => `<span class="hop-pill">${esc(normLabelName(l))}</span>`).join("")}</div>`
    : "";

  const miscHtml = (r.misc && r.misc.length)
    ? `<div class="ticket-section-title">Overig</div>
       <div class="hop-pills">${r.misc.map(m => `<span class="grain-pill">${esc(m)}</span>`).join("")}</div>`
    : "";

  document.getElementById("modal-content").innerHTML = `
    <div class="ticket-head">
      ${thumbHtml}
      <div class="ticket-head-text">
        <div class="ticket-batch">Batch #${String(r.batch).padStart(2,"0")}</div>
        <div class="ticket-title-row">
          <button class="ticket-nav-btn ticket-nav-prev" ${currentModalIndex <= 0 ? "disabled" : ""} aria-label="Vorig brouwsel">&#10094;</button>
          <div class="ticket-title">${esc(r.name)}</div>
          <button class="ticket-nav-btn ticket-nav-next" ${currentModalIndex >= modalList.length - 1 ? "disabled" : ""} aria-label="Volgend brouwsel">&#10095;</button>
        </div>
        <div class="ticket-style">${esc(r.style)}</div>
      </div>
    </div>
    <div class="ticket-body">
      <div class="ticket-row">
        <div class="ticket-field">
          <span class="k">Brouwdatum</span>
          <span class="v">${r.date_display || "onbekend"}</span>
        </div>
        <div class="ticket-field">
          <span class="k">Batchgrootte</span>
          <span class="v">${r.batch_size_display || (r.batch_size_l ? r.batch_size_l+" L" : "onbekend")}</span>
        </div>
        <div class="ticket-field">
          <span class="k">Alcohol</span>
          <span class="v">${r.abv != null ? r.abv.toFixed(1)+"%" : "onbekend"} <small>vol</small></span>
        </div>
      </div>
      <div class="ticket-row">
        <div class="ticket-field">
          <span class="k">Kleur</span>
          <span class="v ticket-swatch"><span class="dot" style="background:${ebcHex}"></span>${r.ebc != null ? Math.round(r.ebc)+" EBC" : "onbekend"}</span>
        </div>
        ${r.ibu != null ? `
        <div class="ticket-field">
          <span class="k">Bitterheid</span>
          <span class="v">${r.ibu.toFixed(0)} <small>IBU</small></span>
        </div>` : ""}
      </div>

      <div class="ticket-section-title">Mout &amp; grondstoffen</div>
      <div class="hop-pills">${fermHtml}</div>

      <div class="ticket-section-title">Hopgiften</div>
      <div class="hop-pills">${hopsHtml}</div>

      <div class="ticket-section-title">Gist</div>
      <div class="yeast-tags">${yeastHtml}</div>

      ${miscHtml}
      ${variantsHtml}

      <div class="ticket-foot">
        <span>STRANGE BREW</span>
        <span>batch №${String(r.batch).padStart(2,"0")}</span>
      </div>
    </div>
  `;
}
