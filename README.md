# AllClear

**Your neighborhood isn't AllClear until you are.**

Parcel-level fire preparedness platform for Jackson County, Oregon. Every property gets a unique QR code linking to a personalized fire safety survey. Responses are tied to tax lot account numbers, enabling community-level analytics by HOA, evacuation zone, and neighborhood.

## What It Does

- **108,927 parcels** across Jackson County with owner data, building codes, and assessed values
- **Unique QR codes** per parcel — scan to open a survey pre-filled with your property data
- **Evacuation zones** tagged per parcel from the county's official zone service (11,237 Ashland parcels matched)
- **Owner + occupant postcards** — absentee owners get a named card at their mailing address, tenants get "Current Resident" at the property
- **31 HOA dossiers** with board contacts, CC&Rs, Firewise status, and meeting schedules
- **Print-ready CSV export** for variable data postcard printing

## Pages

| Page | Path | Purpose |
|------|------|---------|
| Home | `/` | Problem statement, stats, how it works |
| Postcard | `/postcard` | Interactive postcard preview with scannable QR |
| Database | `/database` | Browse 108k parcels, search, filter by Ashland/County |
| Survey | `/s/:hash` | Pre-filled survey (what recipients see when they scan) |
| Print Guide | `/print` | Step-by-step instructions for printing and mailing |
| API | `/api` | Integration docs for connecting other projects |

## Quick Start

```bash
# Install dependencies
npm install

# Seed the database (included pre-seeded in data/fireready.db)
# Only needed if you want to rebuild from source CSVs:
# npx tsx server/seed-all.ts
# npx tsx server/seed-evac.ts

# Start the API server
npx tsx server/api.ts

# In another terminal, start the frontend
npx vite --port 5180

# Open http://localhost:5180
```

## Architecture

```
AllClear/
  server/
    api.ts          Express REST API (parcel lookup, survey submit, search)
    db.ts           SQLite schema (parcels + survey_responses)
    seed.ts         Seed from Ashland hash lookup CSV
    seed-all.ts     Seed from both Ashland + county CSVs
    seed-evac.ts    Seed evacuation zones from county API lookup
  src/
    pages/
      Home.tsx          Landing page with problem/solution/stats
      PostcardPreview.tsx  Interactive postcard mockup with live QR
      Database.tsx      Searchable parcel browser with QR per entry
      Survey.tsx        Fire preparedness survey form
      PrintGuide.tsx    Instructions for print house integration
      ApiDocs.tsx       REST API documentation
    App.tsx           Router + navigation
    App.css           All styles
  data/
    fireready.db    SQLite database (108,927 parcel records)
```

## Data Pipeline

The data was collected from public sources and processed through a pipeline in the companion `pdo-scraper/` project:

1. **Jackson County ArcGIS REST API** — 104,617 parcels with owner, address, building type, assessed value, tax lot ID
2. **Jackson County PDO** — 198 subdivision plats linking parcels to platted communities
3. **Oregon Secretary of State** — HOA nonprofit registrations
4. **HOA websites** — Board contacts, CC&Rs, Firewise certifications
5. **County Evacuation Zone API** — 357 zones, spatially queried per parcel centroid
6. **Hash generation** — HMAC-SHA256 per account+maplot+role, 8-char base62 codes

## Postcard System

Each parcel generates 1-2 postcards:

- **Owner card**: Sent to the owner's mailing address, addressed by name
- **Occupant card**: Only when owner lives elsewhere — sent to the property address, addressed to "CURRENT RESIDENT"

Both cards share the same tax account but have different hash codes (owner vs occupant role), so survey responses indicate who responded.

**Ashland**: 11,473 parcels = 17,032 postcards (~$9,400 postage)
**Jackson County**: 103,433 parcels = 158,634 postcards (~$87,200 postage)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/parcel/:hash` | Look up parcel by QR hash code |
| GET | `/api/parcels?search=&city=&role=&page=&limit=` | Search and browse parcels |
| GET | `/api/random-parcel` | Random Ashland parcel (for demo) |
| POST | `/api/survey/:hash` | Submit survey response |
| GET | `/api/stats` | Dashboard statistics |

## Data Sources

All data sourced from public records:

- [Jackson County ArcGIS](https://spatial.jacksoncountyor.gov/arcgis/rest/services/OpenData/ReferenceData/MapServer/3) — Tax lot feature service
- [Jackson County PDO](https://pdo.jacksoncountyor.gov/pdo/) — Property Data Online subdivision records
- [Jackson County Evacuation Zones](https://services1.arcgis.com/DwYBkWQPdaJNWrPG/arcgis/rest/services/Evacuation_Zones_Jackson_County_Public_ViewTemp/FeatureServer/4) — County-wide evacuation zone polygons
- [Oregon Secretary of State](https://data.oregon.gov/Business/HOA-Oregon/6rb9-k6mw) — HOA nonprofit registrations

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Express + better-sqlite3
- **QR Codes**: qrcode.react (client-side rendering)
- **Database**: SQLite (108k records, ~31MB)
- **Data Pipeline**: Python (shapely, qrcode, urllib)
