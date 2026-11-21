/* SUBTERRA v0.11 — Phase 2A: geometric + gravity constraints only.
   Strict input: SubterraInferenceEvidence.build(project) payload.
   No import, retrieval, or reading of historical GIS pipe routes or lengths.
   Candidate connects preselected manhole top points; not proof of pipe routing. */
(() => {
  'use strict';
  const R = 6371008.8;
  const rad = v => v*Math.PI/180;
  const degrees = v => v*180/Math.PI;
  const CASE = 'NCSF-P56-BLIND-V1';
  const pickOpening=(m,name,role) => {
    const options=(m.openings||[]).filter(o=>o.name===name && o.role===role && o.presence==='present');
    if(options.length!==1)throw Error('Missing or ambiguous documented '+role+' opening '+m.name+':'+name);
    return options[0];
  };
  const known = (f,label) => {
    if(f?.mode!=='measured' || typeof f.value!=='number' || !Number.isFinite(f.value))
      throw Error('Missing recorded '+label);
    return f.value;
  };
  const material = (f,label) => {
    if(f?.mode!=='measured' || typeof f.value!=='string' || !f.value.trim())
      throw Error('Missing recorded '+label);
    return f.value.trim();
  };
  function geodesic(a,b) {
    const aLat=rad(a.lat),bLat=rad(b.lat),dLat=bLat-aLat,dLon=rad(b.lon-a.lon);
    const h=Math.sin(dLat/2)**2+Math.cos(aLat)*Math.cos(bLat)*Math.sin(dLon/2)**2;
    const distanceM=2*R*Math.asin(Math.min(1,Math.sqrt(Math.max(0,h))));
    const y=Math.sin(dLon)*Math.cos(bLat);
    const x=Math.cos(aLat)*Math.sin(bLat)-Math.sin(aLat)*Math.cos(bLat)*Math.cos(dLon);
    const bearingDegrees=(degrees(Math.atan2(y,x))+360)%360;
    return {distanceM,bearingDegrees};
  }
  function compute(evidence) {
    if(evidence?.schema!=='subterra-inference-evidence/v1' || evidence.coordMode!=='geographic')
      throw Error('Invalid evidence-only WGS84 input');
    if(!Array.isArray(evidence.manholes)||evidence.manholes.length!==2)
      throw Error('Phase 2A needs exactly two frozen manholes');
    const find=name=>{
      const found=evidence.manholes.filter(m=>m.name===name);
      if(found.length!==1)throw Error('Missing or ambiguous '+name);
      return found[0];
    };
    const u=find('NCSF-MH-42'),v=find('NCSF-MH-45');
    for(const m of [u,v]){
      if(!Number.isFinite(m.topPosition?.lat)||!Number.isFinite(m.topPosition?.lon) ||
        Math.abs(m.topPosition.lat)>90||Math.abs(m.topPosition.lon)>180)
        throw Error('Missing valid WGS84 top position for '+m.name);
    }
    const o=pickOpening(u,'OUT-01','outlet'),i=pickOpening(v,'IN-01','inlet');
    const outletRL=known(o.fields?.invert,'MH-42 outlet invert RL');
    const inletRL=known(i.fields?.invert,'MH-45 inlet invert RL');
    const diameterUp=known(o.fields?.diameter,'MH-42 outlet diameter');
    const diameterDown=known(i.fields?.diameter,'MH-45 inlet diameter');
    const materialUp=material(o.fields?.material,'MH-42 outlet material');
    const materialDown=material(i.fields?.material,'MH-45 inlet material');
    if(diameterUp<=0||diameterDown<=0||Math.abs(diameterUp-diameterDown)>0.1)
      throw Error('Incompatible documented opening diameters');
    if(materialUp.toLowerCase()!==materialDown.toLowerCase())
      throw Error('Incompatible documented opening materials');
    const {distanceM,bearingDegrees}=geodesic(u.topPosition,v.topPosition);
    if(!Number.isFinite(distanceM)||distanceM<=0.01)throw Error('Invalid manhole endpoint separation');
    const invertDropM=outletRL-inletRL;
    if(invertDropM<=0)throw Error('Assumed flow direction is not downhill');
    const coverUp=known(u.coverRL,'MH-42 cover RL'),coverDown=known(v.coverRL,'MH-45 cover RL');
    const candidate={
      from:u.name,to:v.name,fromOpening:o.name,toOpening:i.name,
      coordinates:[[u.topPosition.lon,u.topPosition.lat],[v.topPosition.lon,v.topPosition.lat]],
      distanceM,dropM:invertDropM,slopePercent:invertDropM/distanceM*100,
      diameterMm:diameterUp,material:materialUp,
      status:'STRAIGHT_LINE_HYPOTHESIS',
      openingAssociation:'UNVERIFIED',
      method:'two preselected manholes; great-circle shortest horizontal baseline; gravity consistency'
    };
    const result={
      schema:'subterra-pipe56-phase2a-result/v1',
      caseId:CASE,
      phase:'PHASE_2A_GEOMETRY_GRAVITY',
      stage:'CALCULATED_FROZEN',
      source:'MANHOLE_EVIDENCE_ONLY',
      inputPolicy:'No historical GIS pipe geometry, length, or connectivity reference',
      candidate,
      engineering:{
        azimuthDegFromNorthClockwise:bearingDegrees,
        horizontalDistanceM:distanceM,
        straightLineInvertDropM:invertDropM,
        straightLineSlopePercent:100*invertDropM/distanceM,
        straightLineSlopeMmPerM:1000*invertDropM/distanceM,
        upstreamOutletInvertRL:outletRL,
        downstreamInletInvertRL:inletRL,
        upstreamCoverRL:coverUp,downstreamCoverRL:coverDown,
        upstreamCoverToInvertDepthM:coverUp-outletRL,
        downstreamCoverToInvertDepthM:coverDown-inletRL,
        documentedNominalDiameterMm:diameterUp,
        documentedPipeMaterial:materialUp,
        manholeBearingField:'UNKNOWN_REQUEST_INFERENCE',
        verticalDatum:'UNKNOWN',
        pipePolylineLength:'WITHHELD',
        hydraulicVelocity:'NOT_CALCULATED',
        confidence:'NOT_CALIBRATED'
      },
      checks:{
        outletToInletRole:'PASS_ON_RECORDED_ROLES',
        diameterMatch:'PASS_RECORDED',
        materialMatch:'PASS_RECORDED',
        positiveGravityDrop:'PASS_CONDITIONAL_ON_COMMON_VERTICAL_DATUM',
        manholeConnection:'HYPOTHESIS_NOT_INDEPENDENTLY_PROVEN',
        asBuiltAlignment:'UNKNOWN',
        historicalGISMatch:'NOT_EVALUATED'
      },
      equations:{
        distance:'haversine(R=6371008.8 m, WGS84 latitude/longitude) — approximate spherical surface distance',
        azimuth:'atan2(sin(dLon)*cos(lat2), cos(lat1)*sin(lat2) - sin(lat1)*cos(lat2)*cos(dLon))',
        drop:'MH-42.OUT-01.invertRL - MH-45.IN-01.invertRL',
        slope:'drop / straight-line endpoint distance * 100%',
        coverDepth:'coverRL - corresponding opening invertRL'
      },
      limitations:[
        'Only the supplied two manhole endpoints are known; a straight line between them is a geometric baseline, not a discovered underground alignment.',
        'Opening association was preselected and is not proved by allowed manhole-only evidence.',
        'Vertical datum and elevation accuracy of the historical source are not established.',
        'No GIS pipe polyline, historical pipe length, hydraulic flow rate, roughness, terrain, or field verification was used.',
        'No independent spatial accuracy or confidence percentage is claimed.'
      ]
    };
    return result;
  }
  function verify(evidence,stored) {
    if(!stored||typeof stored!=='object')return {pass:false,reason:'No stored calculation'};
    try {
      const expected=compute(evidence);
      const isSame=JSON.stringify(expected)===JSON.stringify(stored);
      return {pass:isSame,reason:isSame?'Recalculation agrees with frozen snapshot':'Stored calculation differs from current input/equations'};
    }catch(e){return {pass:false,reason:e.message};}
  }
  window.SubterraPipe56Phase2={compute,verify,geodesic};
})();