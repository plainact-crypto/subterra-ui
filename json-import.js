/* SUBTERRA v0.5 — additive, evidence-only JSON import. No reconstruction calculations. */
(() => {
  'use strict';
  const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const label = (x, max=500) => String(x ?? '').slice(0,max);
  function scalar(x, name, bounds=null) {
    if (x === '' || x === undefined || x === null) return '';
    if (typeof x !== 'number' && typeof x !== 'string') throw Error(name + ' must be a number');
    if (typeof x === 'string' && !x.trim()) return '';
    const n=Number(x);
    if (!Number.isFinite(n) || (bounds && (n<bounds[0] || n>bounds[1])))
      throw Error('Invalid ' + name);
    return String(x);
  }
  function choice(x, allowed, fallback) {
    return allowed.includes(x) ? x : fallback;
  }
  const knowledge=['measured','unknown','infer'];
  const keys=['diameter','invert','center','height','bearing','material','notes'];
  const componentKeys=['accessCover','frame','neck','shaft','baseSlab','channel','benching','steps','drop','sump','seals','lining','vent','other'];
  function knowledgeField(raw, key, prefix) {
    const f=isObject(raw) ? raw : {};
    const mode=choice(f.mode,knowledge,'unknown');
    let value='';
    if(mode==='measured') value=['diameter','invert','center','height','bearing'].includes(key)
      ? scalar(f.value,prefix+' '+key,key==='bearing'?[0,360]:key==='diameter'||key==='height'?[0,100000]:null)
      : label(f.value,2000);
    return {mode, value};
  }
  function normalizeOpening(raw, n) {
    if(!isObject(raw)) throw Error('Opening '+n+' is not an object');
    const fields={};
    for(const key of keys) fields[key]=knowledgeField(raw.fields?.[key],key,'Opening '+n);
    return {
      id: 'import-'+n+'-'+Math.random().toString(36).slice(2),
      name:label(raw.name || ('Opening '+n),90),
      presence:choice(raw.presence,['present','absent','unknown'],'unknown'),
      role:choice(raw.role,['inlet','outlet','both','unknown'],'unknown'),
      fields
    };
  }
  function normalizeManhole(raw,i,coordMode) {
    if(!isObject(raw)) throw Error('Manhole '+(i+1)+' is not an object');
    const m={
      name:label(raw.name,90),
      customName:label(raw.customName || raw.name,90),
      lat:scalar(raw.lat,'Latitude',[-90,90]),lon:scalar(raw.lon,'Longitude',[-180,180]),
      x:scalar(raw.x,'Easting'),y:scalar(raw.y,'Northing'),
      cover:scalar(raw.cover,'Top RL'),invert:scalar(raw.invert,'Invert RL'),
      notes:label(raw.notes,5000),
      invertPosition:{
        lat:scalar(raw.invertPosition?.lat,'Invert Latitude',[-90,90]),
        lon:scalar(raw.invertPosition?.lon,'Invert Longitude',[-180,180]),
        x:scalar(raw.invertPosition?.x,'Invert Easting'),
        y:scalar(raw.invertPosition?.y,'Invert Northing')
      },
      classification:{}, evidence:{levels:{},openingCount:{mode:'unknown',value:''},openings:[],components:{}}
    };
    for(const cat of window.SubterraWizard.TAXONOMY){
      const v=raw.classification?.[cat.key] ?? '';
      if(v!=='' && v!=='__infer__' && !cat.options.some(([name])=>name===v))
        throw Error('Invalid '+cat.key+' classification in manhole '+(i+1));
      m.classification[cat.key]=v;
    }
    for(const key of ['cover','invert']) {
      const original=raw.evidence?.levels?.[key];
      const mode=choice(original,knowledge,m[key]!==''?'measured':'unknown');
      m.evidence.levels[key]=mode;
      if(mode!=='measured')m[key]='';
      if(mode==='measured' && m[key]==='') throw Error('Missing recorded '+key+' RL in manhole '+(i+1));
    }
    const count=raw.evidence?.openingCount;
    if(isObject(count)){
      const mode=choice(count.mode,knowledge,'unknown');
      let value='';
      if(mode==='measured'){
        value=scalar(count.value,'Total opening count',[0,10000]);
        if(value==='' || !Number.isInteger(+value)) throw Error('Invalid total opening count');
      }
      m.evidence.openingCount={mode,value};
    }
    const openings=raw.evidence?.openings || [];
    if(!Array.isArray(openings)||openings.length>100)throw Error('Invalid opening list in manhole '+(i+1));
    m.evidence.openings=openings.map((o,j)=>normalizeOpening(o,j+1));
    for(const k of componentKeys) {
      const c=raw.evidence?.components?.[k];
      if(!isObject(c))continue;
      const presence=choice(c.presence,['present','absent','unknown'],'unknown');
      const mode=presence==='present'?choice(c.mode,knowledge,'unknown'):'unknown';
      m.evidence.components[k]={presence,mode,value:mode==='measured'?label(c.value,500):'',notes:label(c.notes,1000)};
    }
    if(coordMode==='geographic' && ((m.lat==='') !== (m.lon==='')))
      throw Error('Incomplete WGS84 coordinates for '+(m.name || 'manhole '+(i+1)));
    if(coordMode==='projected' && ((m.x==='') !== (m.y==='')))
      throw Error('Incomplete XY coordinates for '+(m.name || 'manhole '+(i+1)));
    return m;
  }
  function normalizePipe(raw,i) {
    if(!isObject(raw)) throw Error('Pipe '+(i+1)+' is not an object');
    if(!raw.id || !raw.source)throw Error('Observed pipe requires an ID and documented source');
    const coords=raw.coordinates;
    if(!Array.isArray(coords)||coords.length<2||coords.length>2000)
      throw Error('Observed pipe '+raw.id+' needs at least two geometry vertices');
    return {
      id:label(raw.id,120),source:label(raw.source,500),
      name:label(raw.name || raw.id,120),
      diameter_mm:scalar(raw.diameter_mm,'Pipe diameter',[0,100000]),
      material:label(raw.material,100),
      coordinates:coords.map((v,j)=>{
        if(!Array.isArray(v)||v.length<2)throw Error('Invalid pipe vertex '+j);
        const lon=scalar(v[0],'Pipe longitude',[-180,180]);
        const lat=scalar(v[1],'Pipe latitude',[-90,90]);
        if(lon===''||lat==='')throw Error('Missing documented pipe coordinate');
        return [Number(lon),Number(lat)];
      })
    };
  }
  function parse(content,coordMode) {
    let doc;
    try {doc=JSON.parse(content);}catch{throw Error('Invalid JSON syntax');}
    if(!isObject(doc)||!Array.isArray(doc.manholes))throw Error('JSON must contain a manholes array');
    if(doc.coordMode && doc.coordMode!==coordMode)throw Error('Coordinate system does not match the open project');
    if(doc.manholes.length>1000)throw Error('Maximum 1,000 manholes per import');
    if(doc.observedPipes?.length && coordMode!=='geographic')throw Error('Observed pipe geometry currently requires WGS84');
    if(doc.observedPipes && (!Array.isArray(doc.observedPipes)||doc.observedPipes.length>2000))
      throw Error('Invalid observedPipes array');
    const manholes=doc.manholes.map((m,i)=>normalizeManhole(m,i,coordMode));
    const observedPipes=(doc.observedPipes || []).map(normalizePipe);
    if(!manholes.length && !observedPipes.length)throw Error('JSON contains no observations');
    return {manholes,observedPipes};
  }
  window.SubterraJsonImport={parse};
})();
