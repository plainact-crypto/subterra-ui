/* SUBTERRA v0.16 — transparent, deterministic evidence-readiness index.
   IMPORTANT: Score /100 is a checklist index, NOT a probability, measured route accuracy,
   independent field verification or a claim that an underground pipe was found. */
(() => {
  'use strict';
  const MAX={completeness:30,geometry:30,precision:20,independentValidation:20};
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const finite=x=>typeof x==='number'&&Number.isFinite(x);
  const round=x=>Math.round(x*10)/10;
  const noData=(reason)=>({
    schema:'subterra-confidence-dashboard/v1',
    status:'NOT_SCORED',reason,score:null,maxScore:100,scoreType:'HEURISTIC_EVIDENCE_READINESS_NOT_PROBABILITY',
    fieldRouteVerification:'NOT_ESTABLISHED',isActualFieldMeasurement:false,
    factors:[
      {key:'completeness',label:'Observation coverage',score:null,max:30},
      {key:'geometry',label:'Geometry consistency',score:null,max:30},
      {key:'precision',label:'Stated input precision',score:null,max:20},
      {key:'independentValidation',label:'Independent verification',score:0,max:20}
    ]
  });
  function compute(run) {
    if(!run)return noData('No field-survey scenario. The frozen geometric baseline alone cannot establish field confidence.');
    const d=run.input,r=run.result;
    if(!d||!r)return noData('Missing field-survey evidence or correction result');
    if(d.schema!=='subterra-manhole-field-survey/v1' || r.schema!=='subterra-field-deterministic-correction/v1')
      return noData('Unsupported survey/correction schema');
    const manholes=Array.isArray(d.manholes)?d.manholes:[];
    const source=manholes.find(m=>m.manholeId===d.targetConnection?.from?.manholeId);
    const target=manholes.find(m=>m.manholeId===d.targetConnection?.to?.manholeId);
    const from=source?.openings?.find(o=>o.openingId===d.targetConnection?.from?.openingId);
    const to=target?.openings?.find(o=>o.openingId===d.targetConnection?.to?.openingId);
    if(!source||!target||!from||!to) return noData('Target openings are missing from the survey');
    // Exactly 30 points, with no subjective or AI-derived values.
    const centers=[source,target].reduce((sum,m)=>
      sum+(finite(m.surveyedCenter?.latitude)&&finite(m.surveyedCenter?.longitude)&&finite(m.surveyedCenter?.horizontalAccuracyM)?4:0),0);
    const portals=[from,to].reduce((sum,o)=>sum+(
      finite(o.bearingOutwardDeg)&&finite(o.radialOffsetFromChamberCenterM)&&finite(o.radialOffsetAccuracyM)&&
      finite(o.invertElevationRL)&&finite(o.invertAccuracyM)&&finite(o.bearingAccuracyDeg)?4:0),0);
    const coverage=[source,target].reduce((sum,m)=>
      sum+(m.completeness?.allOpeningsEnumerated===true?4:0),0);
    const signoff=[source,target].reduce((sum,m)=>
      sum+(m.completeness?.surveyorConfirmedComplete===true?3:0),0);
    const completeness=clamp(centers+portals+coverage+signoff,0,MAX.completeness);
    const b=r.bearingConsistency||{};
    const geo=r.gravity||{};
    const allowed=finite(b.maximumAllowedDifferenceDeg)&&b.maximumAllowedDifferenceDeg>0?b.maximumAllowedDifferenceDeg:12;
    const residual=finite(b.fromDifferenceDeg)&&finite(b.toDifferenceDeg)
      ?Math.max(Math.abs(b.fromDifferenceDeg),Math.abs(b.toDifferenceDeg)):null;
    // Up to 24 points for compatible portal bearings; up to 6 for positive gravity drop
    // with a common vertical datum. Reported measurement accuracies remain separate.
    const heading=(b.compatible===true&&finite(residual))
      ?24*(1-clamp(residual/allowed,0,1)):0;
    const drop=geo.datumVerifiedForPair===true&&geo.positiveDrop===true?6:0;
    const geometry=clamp(heading+drop,0,MAX.geometry);
    // A declared 0.2m input uncertainty maps to 0 points and 0m maps to 20. This
    // reference is a DOCUMENTED DISPLAY HEURISTIC, not a survey acceptance standard.
    const sigma=r.geometry?.combinedApprox1SigmaM;
    const precision=finite(sigma)&&sigma>=0
      ?20*(1-clamp(sigma/0.20,0,1)):0;
    // No externally audited ground truth exists in this workflow. Do not credit
    // a user-provided boolean claiming continuity, a filename, or synthetic photos.
    const independentValidation=0;
    const factors=[
      {key:'completeness',label:'Observation coverage',score:round(completeness),max:30,explain:'Centers (8) + target portals (8) + opening inventory (8) + surveyor sign-off (6).'},
      {key:'geometry',label:'Geometry consistency',score:round(geometry),max:30,explain:'Bearing consistency (24 × (1 − worst deviation / allowed tolerance)) + positive gravity drop on common datum (6).'},
      {key:'precision',label:'Stated input precision',score:round(precision),max:20,explain:'20 × max(0, 1 − propagated input σ / 0.20 m). The 0.20 m reference is a display heuristic, not an accepted accuracy threshold.'},
      {key:'independentValidation',label:'Independent verification',score:0,max:20,explain:'No separately audited pipe trace or proof of continuity; this category remains 0 regardless of self-declared connection.'}
    ];
    const provisional=round(completeness+geometry+precision+independentValidation);
    // Contradictory field geometry must not appear as a trustworthy 'high score'.
    const compatible=r.stage==='CORRECTED_STRAIGHT_ROUTE_HYPOTHESIS'&&r.geometry?.lineDrawingAllowed===true&&b.compatible===true;
    const score=compatible?provisional:Math.min(35,provisional);
    const simulated=d.recordType==='SIMULATED_DEMO'||r.recordType==='SIMULATED_DEMO';
    return {
      schema:'subterra-confidence-dashboard/v1',
      status:compatible?(simulated?'SIMULATED_SCENARIO':'USER_DECLARED_FIELD_SCENARIO'):'GEOMETRY_CONFLICT',
      reason:compatible?(simulated?'Synthetic example only; never field verified.':'User-declared field inputs; not independently audited.'):'Geometric or vertical conflict — do not rely on corrected line.',
      score,maxScore:100,scoreType:'HEURISTIC_EVIDENCE_READINESS_NOT_PROBABILITY',
      uncertaintyApprox1SigmaM:finite(sigma)?sigma:null,
      simulated,isActualFieldMeasurement:!simulated,
      fieldRouteVerification:'NOT_ESTABLISHED',
      geometricCompatibility:compatible,
      maxPossibleWithoutIndependentVerification:80,
      factorCapApplied:!compatible,
      factors,
      limitations:[
        'This score is not the probability of a correct buried route, nor a percentage positional accuracy.',
        'Component weights and 0.20m precision reference are explicit engineering-display heuristics, not calibrated against field truth.',
        'Simulated JSON cannot establish any real-world survey confidence.',
        'No independent reference pipe trace, CCTV, tracer wire or excavation corroboration has been supplied.'
      ]
    };
  }
  window.SubterraConfidence={compute,version:1};
})();