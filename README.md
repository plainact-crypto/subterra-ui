# Subterra — Infrastructure Reconstruction UI (v0.1)

A **front-end-only** concept prototype for an evidence-led underground infrastructure reconstruction platform.

## Current features

1. Create a named infrastructure **project** and choose the coordinate format.
2. Select from 14 **infrastructure systems** (Sanitary Sewer is the first active workspace).
3. In the sewer workspace, add **manholes** with automatic names (`MH-001`, `MH-002`, ...), or edit names manually.
4. Enter WGS84 latitude/longitude or local/projected Easting/Northing plus observed Cover and Invert levels.
5. Entered locations immediately appear on a **pan-and-zoom infinite canvas**. Click a point to edit it. A fit-to-content tool is available.
6. Define reusable **manhole types** in a separate library with code, name, material, shape, and typical diameter; assign types to individual manholes.
7. Export the schedule to **CSV**, project data to **JSON**, and WGS84 manhole points to **Google Earth KML**.
8. Persist data locally in your browser using `localStorage` (the current prototype has **no server-side database**).

**Not implemented yet:** sewer pipe reconstruction, automatic pipe connections, invert interpolation, AI inference, probabilistic utility zones, 3D sections, authentic historical imagery inside the app, Revit integration. These will be specified and implemented in later iterations, not portrayed as already working.

## Launch locally

Open `index.html` in a browser, or serve the folder:

```sh
python -m http.server 8000
```

Then open http://localhost:8000.

## Publish with GitHub Pages

1. Create a new GitHub repository (e.g. `subterra-ui`).
2. Upload `index.html`, `styles.css`, and `app.js` to the repository root.
3. Go to **Settings → Pages → Build and deployment**.
4. Choose **Deploy from a branch** → `main` → `/(root)` → Save.
5. The demo will be served at `https://<username>.github.io/<repo>/` after deployment finishes.

## Engineering / geospatial notes

- Coordinates entered as **WGS84** are converted to a *local approximate metric display only*. The canvas is **not** georeferenced survey output; a proper GIS CRS and surveying transformations are required for engineering accuracy and for any eventual section model.
- The canvas initially plots surveyed points only. No connections or hypothetical pipe locations are generated.
- Google Earth integration in v0.1 means **KML export**, not embedding Google Earth's historical imagery or extracting coordinates from proprietary basemaps.
- A real manhole-entry workflow should account for confined-space safety; no procedure for entering a manhole is included here.

## License

No open-source licence is granted by this prototype. Add a licence only after deciding on distribution and ownership terms.


## V0.2 — manhole evidence capture
Each manhole can hold an unlimited number of pipe openings (inlets/outlets) and record opening invert RL, centre RL, diameter, bearing, material, and notes. Every opening can be marked present, absent or unknown. Each attribute can be marked known/measured, unknown, or request inference; inference is a **status only** at this stage. The project also has an actual-component checklist and a separate known/unknown/infer status for cover RL, channel invert RL and total opening count. Manhole type library remains independent from surveyed instances. JSON exports preserve all metadata; a separate openings CSV is provided. Existing saved projects are automatically compatible, and remain stored locally in the browser. No underground routing or inference engine has been implemented yet.
