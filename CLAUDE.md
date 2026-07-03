# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Context

This is **Strange Brew**, a homebrewing dashboard. It's the third of a small family of sibling projects deployed on the same Hetzner + Coolify server — see `../Fietsen/CLAUDE.md` for the full family overview (De Sprong, Fietsen, Home) and shared decisions (path-based routing, local dev conventions, the planned shared-login gate in Part 3). Unlike the other two apps, Strange Brew isn't linked from Home's landing page yet — that tile is a separate follow-up to be done in the `../Home` project itself.

## What this is

A static dashboard, no build step, no framework: `index.html` + `styles.css` + `script.js`, reading brew data from `data.json` at load time via `fetch()`. Two tabs:
- **Cijfers** (`#page-cijfers`) — stats and charts (Chart.js) over style, ABV, batch size, hops, yeast, and an EBC color-spread visualization.
- **Tijdlijn** (`#page-tijdlijn`) — chronological wall of every batch's label, click for a detail modal with the full recipe.

`vendor/` bundles Chart.js and self-hosted webfonts (Big Shoulders Display, Work Sans, IBM Plex Mono) — no CDN/internet dependency at runtime.

`tools/beheer.html` is a standalone, self-contained management tool (no server, no relative asset dependencies — inline everything, uses the browser File API) for adding new brouwsels: reads the current `data.json`, can parse a BeerSmith XML export or take manual form input, handles label image + thumbnail upload, and outputs an updated `data.json` plus image files to drop into place by hand. See the root `README.md` for the full add-a-batch workflow (via the tool, or by hand-editing `data.json` — schema documented there).

`backup/` holds working zip snapshots and is gitignored — not needed to run the site.

## Local dev

Because production serves this under the `/strangebrew` path (see Deploy below), `index.html` has `<base href="/strangebrew/">` baked in — the same fix Fietsen uses for its `/fietsen` prefix. That means serving this folder alone at a bare port root will 404 on relative assets (styles.css, data.json, images, vendor/...), same trade-off documented in Fietsen's CLAUDE.md.

**Workaround used for local testing**: serve the *parent* folder (`d:\Dropbox\App`) instead of this one, and browse to `http://localhost:PORT/strangebrew/`. Windows' case-insensitive filesystem matches the lowercase URL segment to the `StrangeBrew` folder automatically, so no symlink/junction is needed:

```
npx serve d:\Dropbox\App
# then open http://localhost:3000/strangebrew/
```

Confirmed working: index, `styles.css`, `data.json`, images, `vendor/chart/chart.umd.min.js`, `vendor/fonts/fonts.css`, and `tools/beheer.html` all return 200 under that path.

## Deploy (Coolify) — done, live at `bier-en-brood.nl/strangebrew`

- Repo: public, [github.com/Edvannunen/strangebrew](https://github.com/Edvannunen/strangebrew) — connected via **Public GitHub** source (no deploy key needed, same as Home; unlike Fietsen's private repo which uses a deploy key). Branch `master`.
- Application: Build Pack `Static`, Base Directory `.` (repo root — `index.html` is at the top level, no `src/` subfolder like Fietsen has). No separate Publish Directory field exists for the Static pack in this Coolify version — Base Directory alone controls it.
- Domain: `https://bier-en-brood.nl/strangebrew`. The **"Strip Prefixes"** toggle lives under the **Advanced** tab (not next to Domains) and must be turned **off** — same fix as documented in Fietsen's CLAUDE.md (De Sprong broke temporarily when Traefik stripped a prefix its app still expected). Confirmed here: with Strip Prefixes off, the container receives the full `/strangebrew/...` path unstripped.
- Custom Nginx Configuration (Configuration → General):
  ```nginx
  server {
      location = /strangebrew {
          return 301 /strangebrew/;
      }

      location / {
          root /usr/share/nginx/html;
          index index.html index.htm;
          try_files $uri $uri.html $uri/index.html $uri/index.htm $uri/ =404;
      }

      location /strangebrew/ {
          alias /usr/share/nginx/html/;
          try_files $uri $uri/ /strangebrew/index.html;
      }

      error_page 404 /404.html;
      location = /404.html {
          root /usr/share/nginx/html;
          internal;
      }

      error_page 500 502 503 504 /50x.html;
      location = /50x.html {
          root /usr/share/nginx/html;
          internal;
      }
  }
  ```
  **Gotcha #1**: Coolify's Custom Nginx Configuration field is the *entire* `/etc/nginx/conf.d/default.conf` file, not a snippet injected into an existing `server {}` block — a bare `location /strangebrew/ { ... }` with no wrapper fails at container start with `nginx: [emerg] "location" directive is not allowed here`. Fix: click **"Generate Default Nginx Configuration"** first to get Coolify's real Static-pack template (with the `server {}` wrapper, the default `location /`, and the 404/50x error pages), then add the `/strangebrew/` block inside it, as above.

  **Gotcha #2 (build cache)**: after fixing the config text and saving, a redeploy reused a cached image layer with the *old* broken config still baked in — identical error, identical line number, even though the saved form field was correct. Fix: **Advanced → Disable Build Cache** for one deploy to force a real rebuild, then it can be re-enabled.

  **Gotcha #3 (bare path, unlike Fietsen's version of this problem)**: `location /strangebrew/` (trailing slash) only matches requests that already end in `/`. A bare `https://bier-en-brood.nl/strangebrew` (no trailing slash) doesn't match that prefix, falls through to the catch-all `location /`, and 404s (no file literally named `strangebrew` in the html root). Fietsen worked around the equivalent problem with `<base href>` alone since its bare path returned 200 by other means; here it genuinely 404'd, so an explicit exact-match redirect was needed: `location = /strangebrew { return 301 /strangebrew/; }`. Confirmed working after this — Strip Prefixes being off means our own Nginx (not Traefik) reliably sees and handles the exact bare path.
- Still relies on `<base href="/strangebrew/">` (see Local dev above) so relative asset links resolve correctly once past the redirect.
- No existing domain claimed `/strangebrew`, so unlike the earlier Home/De Sprong root-domain conflict, no path fight was needed this time.

## Still open / to decide later

- [ ] Add a Strange Brew tile to `../Home`'s landing page (separate follow-up, done in that project)
- [ ] Part 3 of the family plan (shared login gate) will eventually need to cover this app too once built
