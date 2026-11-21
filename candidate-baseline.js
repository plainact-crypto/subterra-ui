/* SUBTERRA v0.8 — explicitly limited two-manhole geometry/hydraulic baseline.
   Consumes ONLY the whitelisted inference-evidence payload, never historical GIS pipes.
   The straight segment is a candidate, not a reconstructed/verified buried pipe. */
(() => {
  'use strict';
  const R=6371008.8;
  const rad=x=>x*Math.PI/180;
  function distanceMeters(a,b) {
    const lat1=rad(a.lat),lat2=rad(b.lat),dLat=lat2-lat1,dLon=rad(b.lon-a.lon);
    const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.min(1,Math.sqrt(Math.max(0,h))));
  }
  function measured(opening,key) {
    if(opening?.presence!=='present')return null;
    const f=opening?.fields?.[key];
    return f?.mode==='measured' && typeof f.value==='number' && Number.isFinite(f.value) ? f.value : null;
  }
  function candidateFromEvidence(evidence) {
    if(evidence?.schema!=='subterra-inference-evidence/v1'||evidence.coordMode!=='geographic')return null;
    const located=(evidence.manholes||[]).filter(m=>Number.isFinite(m?.topPosition?.lat)&&Number.isFinite(m?.topPosition?.lon));
    // Pilot explicitly requires exactly two nodes; it is NOT an all-pairs network generator.
    if(located.length!==2)return null;
    const [a,b]=located, options=[];
    for(const [from,to] of [[a,b],[b,a]]) {
      const outputs=(from.openings||[]).filter(x=>x.role==='outlet'&&x.presence==='present');
      const inputs=(to.openings||[]).filter(x=>x.role==='inlet'&&x.presence==='present');
      for(const out of outputs)for(const input of inputs){
        const high=measured(out,'invert'),low=measured(input,'invert');
        const d1=measured(out,'diameter'),d2=measured(input,'diameter');
        if(high===null||low===null||d1===null||d2===null||Math.abs(d1-d2)>0.1)continue;
        if(high<=low)continue;
        const length=distanceMeters(from.topPosition,to.topPosition);
        if(length<0.1||length>2000)continue;
        const drop=high-low,gradient=drop/length;
        if(gradient<=0||gradient>0.4)continue;
        options.push({
          from:from.name,to:to.name,
          coordinates:[[from.topPosition.lon,from.topPosition.lat],[to.topPosition.lon,to.topPosition.lat]],
          distanceM:length,dropM:drop,slopePercent:100*gradient,
          diameterMm:d1,
          method:'two-node straight-line geometric baseline',
          status:'hypothesis'
        });
      }
    }
    // Don't invent a unique route if multiple opening combinations remain possible.
    return options.length===1 ? options[0] : null;
  }
  window.SubterraCandidate={candidateFromEvidence,distanceMeters};
})();