# Strange Brew — brouwdashboard

## Structuur

```
index.html          de website zelf
styles.css           opmaak
script.js             logica
data.json              alle brouwseldata (dit bestand bewerk je bij nieuwe bieren)
images/logo.png            logo, versie voor lichte achtergronden
images/logo-creme.png    logo, versie voor donkere achtergronden
images/labels/                originele etiketafbeeldingen
images/thumbs/              verkleinde versies voor de tijdlijn (max ~420px breed/hoog)
vendor/                    lokaal gebundelde lettertypen en Chart.js (geen internetverbinding nodig)
tools/beheer.html      hulpprogramma om nieuwe brouwsels toe te voegen
```

## Nieuw brouwsel toevoegen — makkelijkste manier

Open `tools/beheer.html` in je browser (gewoon dubbelklikken, geen server nodig). Dat programma:

1. leest je huidige `data.json` in,
2. kan een BeerSmith XML-export automatisch uitlezen (of je vult het formulier met de hand in),
3. laat je etiketafbeeldingen uploaden (maakt zelf een thumbnail),
4. levert een bijgewerkte `data.json` en de juiste afbeeldingsbestanden om te downloaden.

Daarna: het gedownloade `data.json` in de hoofdmap zetten (overschrijven), de afbeeldingen in `images/labels/` en `images/thumbs/` zetten, en `index.html` verversen. Geen herbouwen nodig.

## Nieuw brouwsel toevoegen — handmatig

Als je liever direct `data.json` bewerkt: het is een JSON-lijst van objecten met dit schema (voorbeeld):

```json
{
  "batch": 82,
  "name": "Naam van het bier",
  "full_name": "#82 Naam van het bier",
  "date_display": "14-07-2026",
  "date_iso": "2026-07-14",
  "style": "American IPA",
  "batch_size_display": "22.00 L",
  "batch_size_l": 22,
  "abv": 5.6,
  "ebc": 12,
  "ibu": 45,
  "hops": [
    { "name": "Citra", "grams": 100, "uses": [] }
  ],
  "fermentables": [
    { "name": "Pale Ale Mout", "type": "Grain", "grams": 4000 }
  ],
  "yeasts": ["Safale US-05"],
  "labels": ["batch82 Naam van het bier.jpg"]
}
```

Let op een paar dingen:
- **`batch`** moet uniek zijn en bepaalt de sortering.
- **`ebc`** is altijd al in EBC (niet SRM) — bij twijfel: EBC ≈ SRM × 1,97.
- **`date_display`** is `dd-mm-jjjj`, **`date_iso`** is `jjjj-mm-dd` (die laatste bepaalt de sortering op de tijdlijn).
- **`labels`** is een lijst van bestandsnamen (zonder `#`-teken, dat breekt de link) die moeten bestaan in zowel `images/labels/` (origineel) als `images/thumbs/` (verkleind, max ~420px). Geen labels? Laat de lijst leeg (`[]`) — dan toont het dashboard automatisch het logo als placeholder.
- Sla `NOTES`/proefnotities bewust over — die horen niet op het dashboard.

## Losse HTML-versie

De `strange-brew-dashboard.html` (het ene grote bestand) is een **momentopname** — handig om snel te bekijken of te delen, maar niet gekoppeld aan `data.json`. Nieuwe brouwsels voeg je toe via de losse bestanden hierboven; wil je daarna weer één deelbaar bestand, dan is dat samenvoegen de enige stap die wél opnieuw moet gebeuren.
