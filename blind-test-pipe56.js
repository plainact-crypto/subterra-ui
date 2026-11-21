/* SUBTERRA v0.10 — frozen, reference-free Phase 1 evidence fixture.
   The HISTORICAL GIS PIPE 56 geometry is deliberately NOT present in this file.
   One-click creation is append-only to existing browser projects. */
(() => {
  'use strict';
  const CASE_ID='NCSF-P56-BLIND-V1';
  const fixture={
  "fixtureVersion": "NCSF-P56-BLIND-V1",
  "sourceSnapshotCommit": "92486ace69b87d134cf9504d250cbafc3a7b72ba",
  "source": {
    "layerId": 1,
    "featureServer": "https://services6.arcgis.com/3Sj1fiIDvQtFfbvg/ArcGIS/rest/services/Sanitary_Sewer_edit/FeatureServer/1",
    "sourceDetail": "Stantec 2004 survey; AutoCAD-derived manhole records",
    "records": [
      42,
      45
    ],
    "status": "documented historical GIS values, NOT independently measured today",
    "elevationUnits": "foot source values converted using 0.3048 m/ft",
    "verticalDatum": "UNCONFIRMED",
    "geometryCRS": "EPSG:4326"
  },
  "assumption": {
    "openingLink": "MH-42 OUT-01 -> MH-45 IN-01",
    "status": "HYPOTHESIS_NOT_PROVEN"
  },
  "manholes": [
    {
      "name": "NCSF-MH-42",
      "customName": "NCSF-MH-42",
      "lat": 35.795386290128114,
      "lon": -78.7127936533158,
      "x": "",
      "y": "",
      "cover": "146.980656",
      "invert": "145.060416",
      "invertPosition": {
        "lat": "",
        "lon": "",
        "x": "",
        "y": ""
      },
      "classification": {
        "geometry": "",
        "material": "",
        "depth": "",
        "function": "",
        "utility": "Sanitary Sewer Manhole",
        "method": ""
      },
      "notes": "ArcGIS Layer 1 OBJECTID 42. Original units: feet; elevations converted to metres with 0.3048. Source: AutoCAD Data. Source detail: Stantec; 2004 survey; stantec-revised Dorton Triangle Area Site Utilities.dwg.. GIS values: RimElev=482.22 ft; Invert_Out=475.92 ft; Depth=6.3 ft; MHDiameter=Unknown; MHMaterial=not recorded; MH_Setting=Flush. Main Invert RL, if populated, is copied from the documented outlet invert, not independently measured at the channel. Historical records may be outdated or incomplete; opening count is not proven by the entries.",
      "evidence": {
        "levels": {
          "cover": "measured",
          "invert": "measured"
        },
        "openingCount": {
          "mode": "unknown",
          "value": ""
        },
        "openings": [
          {
            "name": "IN-01",
            "presence": "present",
            "role": "inlet",
            "fields": {
              "diameter": {
                "mode": "measured",
                "value": "304.8"
              },
              "invert": {
                "mode": "measured",
                "value": "145.090896"
              },
              "center": {
                "mode": "unknown",
                "value": ""
              },
              "height": {
                "mode": "unknown",
                "value": ""
              },
              "bearing": {
                "mode": "infer",
                "value": ""
              },
              "material": {
                "mode": "measured",
                "value": "Terra Cotta Pipe (TCP)"
              },
              "notes": {
                "mode": "measured",
                "value": "ArcGIS Sanitary Sewer Manhole Layer 1 OBJECTID 42; Inv_In_1=476.02 ft; Diam_In_1=12\"; Matl_In_1=TCP. Source=AutoCAD Data. Source material code is retained here if it cannot be mapped exactly to a SUBTERRA picklist. Historic GIS, not newly field-verified."
              }
            }
          },
          {
            "name": "OUT-01",
            "presence": "present",
            "role": "outlet",
            "fields": {
              "diameter": {
                "mode": "measured",
                "value": "304.8"
              },
              "invert": {
                "mode": "measured",
                "value": "145.060416"
              },
              "center": {
                "mode": "unknown",
                "value": ""
              },
              "height": {
                "mode": "unknown",
                "value": ""
              },
              "bearing": {
                "mode": "infer",
                "value": ""
              },
              "material": {
                "mode": "measured",
                "value": "Terra Cotta Pipe (TCP)"
              },
              "notes": {
                "mode": "measured",
                "value": "ArcGIS Sanitary Sewer Manhole Layer 1 OBJECTID 42; Invert_Out=475.92 ft; Diam_Out=12\"; Matl_Out=TCP. Source=AutoCAD Data. Source material code is retained here if it cannot be mapped exactly to a SUBTERRA picklist. Historic GIS, not newly field-verified."
              }
            }
          }
        ],
        "components": {}
      }
    },
    {
      "name": "NCSF-MH-45",
      "customName": "NCSF-MH-45",
      "lat": 35.79566816389703,
      "lon": -78.7136681814628,
      "x": "",
      "y": "",
      "cover": "144.176496",
      "invert": "142.393416",
      "invertPosition": {
        "lat": "",
        "lon": "",
        "x": "",
        "y": ""
      },
      "classification": {
        "geometry": "",
        "material": "",
        "depth": "",
        "function": "",
        "utility": "Sanitary Sewer Manhole",
        "method": ""
      },
      "notes": "ArcGIS Layer 1 OBJECTID 45. Original units: feet; elevations converted to metres with 0.3048. Source: AutoCAD Data. Source detail: Stantec; 2004 survey; stantec-revised Dorton Triangle Area Site Utilities.dwg.. GIS values: RimElev=473.02 ft; Invert_Out=467.17 ft; Depth=5.85 ft; MHDiameter=Unknown; MHMaterial=not recorded; MH_Setting=Flush. Main Invert RL, if populated, is copied from the documented outlet invert, not independently measured at the channel. Historical records may be outdated or incomplete; opening count is not proven by the entries.",
      "evidence": {
        "levels": {
          "cover": "measured",
          "invert": "measured"
        },
        "openingCount": {
          "mode": "unknown",
          "value": ""
        },
        "openings": [
          {
            "name": "IN-01",
            "presence": "present",
            "role": "inlet",
            "fields": {
              "diameter": {
                "mode": "measured",
                "value": "304.8"
              },
              "invert": {
                "mode": "measured",
                "value": "142.454376"
              },
              "center": {
                "mode": "unknown",
                "value": ""
              },
              "height": {
                "mode": "unknown",
                "value": ""
              },
              "bearing": {
                "mode": "infer",
                "value": ""
              },
              "material": {
                "mode": "measured",
                "value": "Terra Cotta Pipe (TCP)"
              },
              "notes": {
                "mode": "measured",
                "value": "ArcGIS Sanitary Sewer Manhole Layer 1 OBJECTID 45; Inv_In_1=467.37 ft; Diam_In_1=12\"; Matl_In_1=TCP. Source=AutoCAD Data. Source material code is retained here if it cannot be mapped exactly to a SUBTERRA picklist. Historic GIS, not newly field-verified."
              }
            }
          },
          {
            "name": "OUT-01",
            "presence": "present",
            "role": "outlet",
            "fields": {
              "diameter": {
                "mode": "measured",
                "value": "304.8"
              },
              "invert": {
                "mode": "measured",
                "value": "142.393416"
              },
              "center": {
                "mode": "unknown",
                "value": ""
              },
              "height": {
                "mode": "unknown",
                "value": ""
              },
              "bearing": {
                "mode": "infer",
                "value": ""
              },
              "material": {
                "mode": "measured",
                "value": "Terra Cotta Pipe (TCP)"
              },
              "notes": {
                "mode": "measured",
                "value": "ArcGIS Sanitary Sewer Manhole Layer 1 OBJECTID 45; Invert_Out=467.17 ft; Diam_Out=12\"; Matl_Out=TCP. Source=AutoCAD Data. Source material code is retained here if it cannot be mapped exactly to a SUBTERRA picklist. Historic GIS, not newly field-verified."
              }
            }
          }
        ],
        "components": {}
      }
    }
  ]
};
  const protocol={
  "schema": "subterra-blind-test-protocol/v1",
  "caseId": "NCSF-P56-BLIND-V1",
  "title": "PIPE-56 Blind Reconstruction — Phase 1",
  "stage": "PHASE_1_PREPARED",
  "frozenOn": "2026-11-21",
  "sourceSnapshotCommit": "92486ace69b87d134cf9504d250cbafc3a7b72ba",
  "legalStatus": "Retrospective controlled replay; Pipe 56 geometry and endpoint connection have been seen earlier in the project. This is NOT a previously unseen prospective blind study.",
  "inputEvidence": {
    "sourceLayer": 1,
    "sourceObjects": [
      42,
      45
    ],
    "allowed": [
      "Documented manhole name and top WGS84 latitude/longitude",
      "Historical rim elevation, outlet/main invert elevation and documented inlet levels",
      "Historical pipe-opening inlet/outlet roles, recorded nominal diameters and recorded TCP material",
      "Explicit unknown and request-inference flags"
    ],
    "blocked": [
      "All Gravity Main Line Layer 4 geometries, including OBJECTID 56",
      "Historical pipe 56 recorded or measured length",
      "Any precomputed line, route vertices, bearing derived from Pipe 56, or benchmark-derived connectivity",
      "Any other information about the hidden pipe that is not independently documented as an allowed input"
    ],
    "selectedEndpoints": "Two manhole locations were preselected by the tester. Existence of a connecting pipe must NOT be credited as independently discovered.",
    "references": "Layer 1 attributes are historical AutoCAD-derived; not independently field-verified",
    "coordinateReference": "WGS84 (EPSG:4326)",
    "validationDistanceReference": "EPSG:32617 metres for future route comparisons; define exact projection implementation before metric calculation",
    "levelConversion": "ft to m using factor 0.3048 for the values previously recorded",
    "verticalDatum": "Unknown / not established from reviewed GIS description; no absolute-depth correctness claim"
  },
  "openingLink": {
    "proposed": "MH-42 OUT-01 -> MH-45 IN-01",
    "status": "HYPOTHESIS",
    "reason": "opening role, diameters, gravity levels are consistent, but specific pipe-to-opening identity not independently documented in allowed manhole-only evidence"
  },
  "benchmark": {
    "referenceFile": "data/validation-reference/NCSF_PIPE56_reference_v1.json",
    "allowedToLoadDuringPhase1": false,
    "referenceQuality": "Historical digitized GIS record. Not a current subsurface survey or independent physical truth."
  },
  "prospectiveRules": {
    "phase1": "Create one separate local Test Case with exactly two evidenced manholes, zero observedPipes, zero calculated route outputs; preserve all existing projects",
    "phase2": "Freeze inference input / candidate before opening reference. Do not modify selection parameters using withheld geometry.",
    "phase3": "Any depth/crown/terrain assumptions must be documented independently, and unverified datum remains unknown.",
    "phase4": "Only then reveal separate reference and compute comparison metrics."
  },
  "acceptanceCriteria": {
    "A1": "Exactly 2 manholes with expected IDs 42 and 45 and recorded source values",
    "A2": "No observedPipes, GIS route geometry, reference length or historical benchmark values in the model input",
    "A3": "No currently rendered calculated pipe in Stage 1 (run not started)",
    "A4": "Original local project(s) and all imported records unchanged; test creation idempotent",
    "A5": "Source provenance and units captured; missing Vertical Datum and specific opening-to-pipe link marked Unverified",
    "A6": "Protocol and source snapshot committed before controlled rerun; the earlier exposure to Pipe 56 must be declared",
    "A7": "Only after Phase 2 lock, quantify reference agreement in metres: planimetric mean offset <= 1 m and maximum <= 2 m is a DEMO benchmark target, not field accuracy or guarantee",
    "A8": "Exact endpoint-based straight line matches are treated as a trivial baseline, not evidence of underground route discovery"
  },
  "successDefinition": "Passing internal historical GIS agreement metrics is a limited retrospective demo, NOT proof of real-world 100% location accuracy or TRL4."
};
  const copy=x=>JSON.parse(JSON.stringify(x));
  const expectedNames=['NCSF-MH-42','NCSF-MH-45'];
  const requiredValues={
    'NCSF-MH-42':{lat:35.795386290128114,lon:-78.7127936533158,cover:'146.980656',invert:'145.060416'},
    'NCSF-MH-45':{lat:35.79566816389703,lon:-78.7136681814628,cover:'144.176496',invert:'142.393416'}
  };
  function buildTemplate(){
    return {
      name:'PIPE-56 Blind Reconstruction',
      location:'NC State Fairgrounds, Raleigh, NC, USA',
      coordMode:'geographic',
      types:['sewer'],
      manholes:copy(fixture.manholes),
      observedPipes:[],
      mapLayer:'satellite',
      showHistoricalPipes:false,
      showCalculatedCandidate:false,
      blindCase:{
        caseId:CASE_ID,protocolVersion:1,
        stage:'PHASE_1_FROZEN',locked:true,
        referenceIncluded:false,inputsFrozen:true,
        sourceSnapshotCommit:fixture.sourceSnapshotCommit,
        referenceRecord:'Layer 4 / OBJECTID 56',
        benchmarkStatus:'WITHHELD',
        studyType:'RETROSPECTIVE_REPLAY',
        createdFrom:'SOURCE_RECORDED_MH_ONLY'
      }
    };
  }
  function validate(project){
    if(!project||project.blindCase?.caseId!==CASE_ID)return {pass:false,issues:['Not this blind test case']};
    const issues=[];
    if(project.coordMode!=='geographic')issues.push('Wrong coordinate mode');
    if(!Array.isArray(project.manholes)||project.manholes.length!==2)issues.push('Expected exactly two recorded manholes');
    for(const name of expectedNames){
      const m=project.manholes?.find(x=>x.name===name);
      if(!m){issues.push('Missing '+name);continue;}
      const ref=requiredValues[name];
      for(const key of ['lat','lon','cover','invert']) {
        if(String(m[key])!==String(ref[key]))issues.push(name+' '+key+' deviated from frozen evidence');
      }
      const orig=fixture.manholes.find(x=>x.name===name);
      for(const key of ['customName','x','y','invertPosition','classification','notes','evidence']){
        if(JSON.stringify(m[key])!==JSON.stringify(orig[key]))
          issues.push(name+' frozen field '+key+' changed');
      }
    }
    if(!Array.isArray(project.observedPipes)||project.observedPipes.length)
      issues.push('Historical pipe geometry must be absent from test project');
    for(const key of ['inferredPipes','candidateResults','validationReference','historicalPipe','pipeRoutes']){
      if(project[key]!==undefined)issues.push('Unexpected reference or calculated field: '+key);
    }
    const stage=project.blindCase?.stage;
    if(project.blindCase?.locked!==true ||
      !['PHASE_1_FROZEN','PHASE_2A_CALCULATED'].includes(stage))
      issues.push('Case is not in an allowed frozen stage');
    if(stage==='PHASE_2A_CALCULATED'&&!project.blindCase?.phase2)
      issues.push('Phase 2A stage missing frozen calculation');
    if(stage==='PHASE_1_FROZEN'&&project.blindCase?.phase2)
      issues.push('Phase 2A output exists before declared run');
    return {pass:!issues.length,issues};
  }
  window.SubterraBlindTest={
    caseId:CASE_ID,
    buildTemplate,
    getProtocol:()=>copy(protocol),
    getFixtureInfo:()=>copy({fixtureVersion:fixture.fixtureVersion,source:fixture.source,assumption:fixture.assumption}),
    validate
  };
})();