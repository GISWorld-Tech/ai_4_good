# AI for Good 2025 — Workshop Project

This repository contains a small CesiumJS + Webpack project used in the AI for Good 2025 workshop. It demonstrates loading 3D Tiles from Cesium ion, basic analysis/visualization utilities, and hooks for querying energy‑related APIs.


## Prerequisites

- Node.js 18 LTS or newer
  - Download: https://nodejs.org
  - Verify after install: `node -v` and `npm -v`
- QGIS (for viewing/editing GIS data used by the workshop)
  - Download: https://qgis.org
- A Cesium ion account and access token (free)
  - Sign up: https://ion.cesium.com/signup/

Optional but useful:
- A GISWorld‑Tech account for the Energy APIs (you may also use the guest account below)
  - Register/login: https://gisworld-tech.com/register-login


## Quick Start

There are two similar apps in this repo:
- `start/` — a minimal starting point
- `final/` — a more complete, feature‑rich version

You can run either one. The steps are identical; just choose which folder you want to use.

1) Install dependencies

```bash
cd start        # or: cd final
npm install
```

2) Set your Cesium ion access token and asset id

Open the config file and paste your token:

- For the starter app: `start/src/js/CesiumConfig.js`
- For the final app:   `final/src/js/CesiumConfig.js`

```js
// CesiumConfig.js
const accessToken = "<paste-your-cesium-ion-access-token-here>";
// Replace 3123354 with your actual numeric ion Asset ID, e.g., 123456
const assetIds = { cityGml: 3123354 };
export { accessToken, assetIds };
```

Notes:
- Get a token from https://ion.cesium.com/tokens
- Upload your 3D Tiles (e.g., CityGML converted to 3D Tiles) to ion and copy the Asset ID, or use an existing ion asset you already have access to. Replace `assetIds.cityGml` accordingly.
- Do NOT commit private tokens to git.

3) Start the dev server

```bash
npm run start
```

Then open http://localhost:8080 in your browser. The app copies Cesium static assets at build‑time and uses Webpack Dev Server for local development.

4) Build a static bundle (optional)

```bash
npm run build
# To serve the built bundle locally (from /dist):
npm run start:built
```


## Energy APIs access

For workshop exercises that call Energy APIs, you have two options:

- Use the guest account:
  - Username: `guest`
  - Password: `guest20252025`
- Or create your own account: https://gisworld-tech.com/register-login

If the app requires credentials, it will reference them per the exercise instructions. Never hard‑code real credentials into the repository.


## Working with data (QGIS)

The repo includes a `data/` directory with example inputs (e.g., ALKIS/CityGML). Use QGIS to:
- Inspect shapefiles, GeoPackages, or other formats before converting/uploading to ion
- Reproject datasets and check attribute schemas
- Export to formats supported by your 3D Tiles pipeline

Download QGIS: https://qgis.org


## Project structure

```
ai_for_good/
├─ data/
│  ├─ alkis/
│  └─ citygml/
├─ start/
│  ├─ src/
│  │  ├─ index.html
│  │  ├─ index.js
│  │  └─ js/
│  │     └─ CesiumConfig.js   # set your ion token + asset id here
│  ├─ package.json            # npm scripts (build/start)
│  └─ webpack.config.js       # copies Cesium assets to /cesiumStatic
├─ final/
│  ├─ src/
│  │  ├─ index.html
│  │  ├─ index.js
│  │  └─ js/
│  │     └─ CesiumConfig.js   # set your ion token + asset id here
│  ├─ package.json
│  └─ webpack.config.js
└─ README.md (this file)
```


## Troubleshooting

- Blank globe or errors about Cesium assets
  - Make sure `CESIUM_BASE_URL` is configured by Webpack (already done in this project) and that you run via `npm run start` or serve the `/dist` folder after `npm run build`.
- 401/403 from Cesium ion
  - Your token may be missing, expired, or has insufficient scopes. Update `CesiumConfig.js` with a valid token and verify the asset ID is accessible to your account.
- CORS or network errors calling external APIs
  - When developing locally, use the provided dev server. If an API blocks localhost, use a proxy or enable CORS per the API’s guidance.
- Node version issues
  - Use Node 18 LTS or newer. Re‑install dependencies after changing Node: `rm -rf node_modules` (or delete the folder on Windows) and run `npm install` again.


## FAQ

- Where exactly do I put my ion token?
  - In `start/src/js/CesiumConfig.js` or `final/src/js/CesiumConfig.js` (depending on which app you run).
- Can I use multiple assets?
  - Yes. Add more keys to `assetIds` with numeric ion Asset IDs and load them in your code.
- Is QGIS required to run the web app?
  - No. It’s recommended for preparing/viewing geospatial data but not required just to view the app.


## License

Apache-2.0 — see `package.json` for metadata.


## Credits

- CesiumJS — https://cesium.com/platform/cesiumjs/
- GISWorld‑Tech — https://gisworld-tech.com
- die STEG Stadtentwicklung GmbH — https://www.steg.de
