# SUBTERRA v2.1 — Total Station First / Adaptive XYZ Reconstruction

This is a **new implementation**. The old v0.16 interface, Pipe 56 phase buttons, orange/green comparison and old scoring scripts are retired. The application root loads only `index.html`, `v2.css`, `v2-engine.js`, `v2-app.js` and the 430-field dictionary `data/field-catalog-v2.json`.

## Ready-to-open NCSF 87-manhole competition simulation (v2.1)

Open **`https://plainact-crypto.github.io/subterra-ui/?demo=ncsf&v=2.1`** to load a real saved `subterra-v2` project **with explicitly SIMULATED observation data**, not an uploaded historic drawing and not a contemporary field survey.

Dataset provenance and separation:

- `data/demo/NCSF_87_Manholes_Historical_Source.json`: 87 historical NCSF manhole locations, original WGS84 lat/lon and attribute references extracted from commit `92486ace69b87d134cf9504d250cbafc3a7b72ba`. 38 cover elevations recorded; **49 missing covers are synthetically interpolated** strictly for competition demonstration. Original vertical datum unconfirmed. WGS84 manhole positions convert to metres under **EPSG:32617**, with synthetic centimeter-scale measurement perturbation.
- `data/demo/NCSF_87_MH_Pipe56_Four_Rounds.json`: fully serialized, replayable four-stage project. Every staged "total station" and "survey pen" observation is **invented** (no real instrument visit). Pipe 56 is scoped `NCSF-MH-42 → NCSF-MH-45`; other 85 known manholes provide survey context.
- `data/demo/NCSF_103_Historical_Pipes_HOLDOUT.json`: all 103 historical GIS pipe geometries held separately. **Never loaded or used by the reconstruction engine or the scenario builder.** The UI only fetches this file on user request **after Round 03**, when it presents a table comparing differently defined lengths, not a misleading second route line.
- Synthetic CCTV/Sonde and "reviewed" claims are **fictional benchmark fixtures**, not evidence that any physical pipe has been found, exposed, viewed, or independently certified.

Replay sequence:

| Stage | Verification index | What the simulation adds |
|---|---:|---|
| ROUND-00 | 14/100 | 87 simulated Total Station cover XYZ observations; provisional segment; pipe invert Z UNKNOWN |
| ROUND-01 | 49/100 | Register six opening records across MH-42/MH-45, simulated chamber/pipe-face XYZ, five ladder-step points per chamber and associated atomic checklist fields |
| ROUND-02 | 70/100 | Independently recorded **synthetic** invert XYZ, synthetic flow-channel points and constraint notes; newly calculable pipe gradient (~3.12% in current fixture) |
| ROUND-03 | 100/100 | Five fictional intermediate trace XYZ points, simulated CCTV and sonde "review" and simulated QA; score is 100% of the versioned *fictional evidence-coverage rubric*, NOT actual route accuracy |

Use the **Run Next Synthetic Survey Round** control to advance; select any of the frozen rounds from **Rounds**, switch between **Pipe 56 sector** and **all 87 manholes**, and optionally unlock the historical comparison only in final stage. The regular Total Station-first workflow for real projects is unchanged; the simulation opens only by explicit link/button. Existing browser-local projects are not replaced silently.

See Node tests `tests/test-v2.js` for exact four-stage score and geometry assertions. No AI/ML models calculate route positions or scores.

## Correct survey-first user sequence

1. **New project:** choose sanitary or storm sewer; provide projected horizontal coordinate reference and confirmed vertical datum/benchmark.
2. **Total Station:** survey accurate X,Y,Z of **all visible manhole covers** with separate horizontal/vertical standard uncertainty. For every added manhole record source `TOTAL_STATION`. The cover Z is NOT a pipe invert.
3. **Confirm total survey complete:** route inference is blocked until >= 2 manholes and the user explicitly confirms the visible-manhole inventory is complete.
4. **Round 00 initial hypothesis:** one provisional line between selected manholes with an intentionally low evidence-verification score (example `14/100`); underground Z and actual hidden alignment are explicitly unknown.
5. **Targeted between-two-manhole field verification:** register **every opening**, then add measured XYZ to the proper opening/manhole component. The future calibrated pen source is separated from the total-station anchor; simulated pen points are labeled as such.
6. **Recalculate and save next round:** derive portal location, plan length, reciprocal direction / gradient (only with actual invert points), any independently traced intermediate points and score contributions. Each round freezes its complete inputs and result.
7. **Next best task:** rank missing measurements by unfulfilled weighted evidence requirements divided by indicative effort; user can return to the complete 430-field checklist and add evidence. More measurements can raise or lower credibility if they reveal conflicts.
8. **Accept current confidence:** user may stop at any score with a persisted explicit acceptance and residual tasks; the app does not misrepresent this as technical certification.

## Full checklist

`data/field-catalog-v2.json` contains **all 430 atomic field entries** transcribed from the user-provided `SUBTERRA_Field_Checklist.csv`. Records are indexed by original ID, definition, unit, repeat scope, requirement, validation rule and provenance. The UI lets users filter, browse, enter observations and associate them with the project, selected two-manhole sector or manhole.

Geometric observations should be captured as XYZ `point` measurements, with `kind`, `manholeId`, `openingId`, capture `method`, instrument reference, uncertainties and timestamp. The descriptive attributes (materials, condition, access, media) remain typed field observations and do not become invented coordinates.

## Deterministic score (not a probability)

The `v2-engine.js` uses 11 explicit verification coverage categories with weights [8,10,10,15,12,6,5,12,12,4,6] = 100. A synthetic complete verification fixture reaches **100/100**. The score is **not a percentage physical accuracy**. Contradictions can cap displayed score, and unverified buried alignment remains a qualified hypothesis. The blue-gray-to-deep-blue route color is continuous according to the single current score. No permanent orange/green two-line comparison.

## Engineering restrictions

- Each manhole center starts from surveyed **cover-center XYZ**; the actual chamber-center is measured independently to account for eccentric lids.
- Pipe invert elevation is never inferred from cover level without physical evidence. If two shared-datum invert XYZ are absent, the pipe slope is **UNKNOWN**.
- An endpoint chord does not demonstrate a buried straight pipe, physical continuity, or a known actual buried depth. An intermediate surveyed trace requires independent source evidence.
- Opening count is not enough to prove connection; all unknown/capped openings must be logged without silently assigning roles.
- Historical GIS / construction reference geometry is not loaded into initial reconstruction.
- Pen hardware is **NOT IMPLEMENTED**; only its intended input contract and simulated/manual point sources are implemented. Actual pen precision must be field validated against a total station.
- The current competition site is browser-local (`localStorage`) with project JSON export/import. **Online mobile synchronization requires a dedicated authenticated backend and has NOT been implemented**.
- The app does not certify surveys or authorize confined-space manhole entry. Survey work requires qualified personnel, permits and relevant safety procedures.
- Independent review fields are currently **user-declared** and not authenticated by a third-party reviewer; treat them as documentary claims.

## Running

Open GitHub Pages or `index.html` through a static HTTP server. The 430-field JSON is fetched from `data/field-catalog-v2.json`, so opening the page directly from a `file://` URL may block catalog loading.

## Reproducible checks

`SubterraV2.selfTest()` verifies a **14/100 provisional cover-based initial route with null invert grade**, a synthetic complete **100/100** scenario and immutable round history. Additional UI DOM smoke tests cover project creation, Total Station sign-off, route rendering, 430-field lookup, opening capture and round history.

## Scope for future implementations

3D datum/covariance matrix transformations and survey-control least squares; full 430-field conditional forms with repeatable entities; authenticated online mobile event ingestion; robust alternative-route search; properly independently reviewed source evidence and georeferenced CCTV/sonde trace validation; exportable engineering-grade reports. The current implementation is a functional **competition prototype**, not production-certified infrastructure location software.
