/* SUBTERRA v0.7 — explicit evidence-only input boundary for future inference.
   The historical GIS polyline collection (observedPipes) is validation reference
   data and is deliberately absent from this projection. The client has no
   inverse-engineering engine yet; future calculations must consume build(). */
(() => {
  'use strict';
  const numberOrNull = value => {
    if (value === '' || value == null || (typeof value === 'string' && !value.trim())) return null;
    const x = Number(value);
    return Number.isFinite(x) ? x : null;
  };
  const modeOrUnknown = mode => ['measured','unknown','infer'].includes(mode) ? mode : 'unknown';
  const asEvidence = (mode, value, numeric=true) => {
    const status=modeOrUnknown(mode);
    return {mode:status,value:status==='measured'
      ? (numeric ? numberOrNull(value) : String(value ?? '').slice(0,120))
      : null};
  };
  const numericFields=['diameter','invert','center','height','bearing'];
  function location(raw,mode){
    const keys=mode==='projected'?['x','y']:['lat','lon'];
    return Object.fromEntries(keys.map(k=>[k,numberOrNull(raw?.[k])]));
  }
  function opening(raw) {
    const fields={};
    for (const key of numericFields) {
      const f=raw?.fields?.[key];
      fields[key]=asEvidence(f?.mode,f?.value);
    }
    const mat=raw?.fields?.material;
    fields.material=asEvidence(mat?.mode,mat?.value,false);
    return {
      name:String(raw?.name??'').slice(0,90),
      presence:['present','absent','unknown'].includes(raw?.presence)?raw.presence:'unknown',
      role:['inlet','outlet','both','unknown'].includes(raw?.role)?raw.role:'unknown',
      fields
    };
  }
  function build(project) {
    if(!project || !Array.isArray(project.manholes))throw Error('Invalid SUBTERRA project');
    const coordMode=project.coordMode==='projected'?'projected':'geographic';
    return {
      schema:'subterra-inference-evidence/v1',
      coordMode,
      manholes:project.manholes.map(m=>{
        const levels=m?.evidence?.levels||{};
        const cl=m?.classification||{};
        const classifications={};
        for(const key of ['geometry','material','depth','function','utility','method']){
          const value=cl[key];
          classifications[key]=value==='__infer__'?'infer':(typeof value==='string'&&value.trim()?value:'unknown');
        }
        const count=m?.evidence?.openingCount;
        return {
          name:String(m?.name||'').slice(0,90),
          topPosition:location(m,coordMode),
          invertPosition:location(m?.invertPosition,coordMode),
          coverRL:asEvidence(levels.cover ?? (m?.cover!==''&&m?.cover!=null?'measured':'unknown'),m?.cover),
          mainInvertRL:asEvidence(levels.invert ?? (m?.invert!==''&&m?.invert!=null?'measured':'unknown'),m?.invert),
          classifications,
          openingCount:asEvidence(count?.mode,count?.value),
          openings:Array.isArray(m?.evidence?.openings)?m.evidence.openings.map(opening):[]
        };
      })
    };
  }
  // Excludes raw project notes, metadata, observedPipes, imported pipe
  // geometry, source details, and all other fields by construction.
  window.SubterraInferenceEvidence={build};
})();