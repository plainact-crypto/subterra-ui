/* SUBTERRA v0.9 — Multi-manhole preliminary gravity candidates.
   Uses ONLY whitelisted manhole evidence; no historical pipe geometry. */
(()=>{
'use strict';
const R=6371008.8,rad=v=>v*Math.PI/180;
const MAX_DISTANCE_M=180,MIN_SLOPE=0.0001,MAX_SLOPE=0.15; // exploratory bounds; not standards
function distanceMeters(a,b) {
 const p=rad(a.lat),q=rad(b.lat),d=q-p,g=rad(b.lon-a.lon);
 const h=Math.sin(d/2)**2+Math.cos(p)*Math.cos(q)*Math.sin(g/2)**2;
 return 2*R*Math.asin(Math.min(1,Math.sqrt(Math.max(0,h))));
}
function known(o,key) {
 const f=o?.fields?.[key];
 return o?.presence==='present' && f?.mode==='measured' && typeof f.value==='number' && Number.isFinite(f.value) ? f.value : null;
}
function available(nodes,role) {
 const ports=[];
 for(const node of nodes)for(const opening of node.openings||[]){
  if(opening.role!==role||opening.presence!=='present')continue;
  const invert=known(opening,'invert'),diameter=known(opening,'diameter');
  if(invert===null||diameter===null||diameter<=0)continue;
  const mat=opening.fields?.material;
  ports.push({node,name:String(opening.name),key:node.name+':'+opening.name+':'+role,invert,diameter,
    material:mat?.mode==='measured'?String(mat.value||'').trim().toLowerCase():''});
 }
 return ports;
}
function candidatesFromEvidence(evidence){
 const empty={candidates:[],eligiblePairs:0,screenedFrom:0,screenedTo:0,reason:''};
 if(evidence?.schema!=='subterra-inference-evidence/v1'||evidence.coordMode!=='geographic')
  return {...empty,reason:'WGS84 evidence required'};
 const nodes=(evidence.manholes||[]).filter(m=>m?.name&&Number.isFinite(m?.topPosition?.lat)&&Number.isFinite(m?.topPosition?.lon));
 if(nodes.length<2)return {...empty,reason:'At least two manholes required'};
 const from=available(nodes,'outlet'),to=available(nodes,'inlet');
 if(!from.length||!to.length)return {...empty,screenedFrom:from.length,screenedTo:to.length,reason:'Missing measured opening evidence'};
 const eligible=[];
 for(const o of from)for(const i of to){
  if(o.node===i.node||Math.abs(o.diameter-i.diameter)>0.1)continue;
  if(o.material&&i.material&&o.material!==i.material)continue;
  const distance=distanceMeters(o.node.topPosition,i.node.topPosition);
  if(!(distance>=1&&distance<=MAX_DISTANCE_M))continue;
  const drop=o.invert-i.invert,slope=drop/distance;
  if(!(slope>=MIN_SLOPE&&slope<=MAX_SLOPE))continue;
  eligible.push({o,i,distance,drop,slope});
 }
 eligible.sort((a,b)=>a.distance-b.distance || a.slope-b.slope);
 const usedOut=new Set(),usedIn=new Set(),selected=[];
 const alternatives=new Map();
 for(const item of eligible) alternatives.set(item.o.key,(alternatives.get(item.o.key)||0)+1);
 for(const item of eligible){
  if(usedOut.has(item.o.key)||usedIn.has(item.i.key))continue;
  usedOut.add(item.o.key);usedIn.add(item.i.key);
  selected.push({
   from:item.o.node.name,to:item.i.node.name,
   fromOpening:item.o.name,toOpening:item.i.name,
   coordinates:[[item.o.node.topPosition.lon,item.o.node.topPosition.lat],
     [item.i.node.topPosition.lon,item.i.node.topPosition.lat]],
   distanceM:item.distance,dropM:item.drop,slopePercent:item.slope*100,
   diameterMm:item.o.diameter,alternativeCount:alternatives.get(item.o.key)-1,
   method:'shortest gravity-compatible opening-pair straight-line baseline',
   status:'hypothesis'
  });
 }
 return {candidates:selected,eligiblePairs:eligible.length,screenedFrom:from.length,screenedTo:to.length,
   reason:selected.length?'':'No gravity-compatible pairs within exploratory search bounds'};
}
function candidateFromEvidence(evidence){
 const n=(evidence?.manholes||[]).filter(m=>Number.isFinite(m?.topPosition?.lat)&&Number.isFinite(m?.topPosition?.lon));
 if(n.length!==2)return null;
 const r=candidatesFromEvidence(evidence);
 return r.candidates.length===1?r.candidates[0]:null;
}
window.SubterraCandidate={candidateFromEvidence,candidatesFromEvidence,distanceMeters};
})();