/* SUBTERRA v2 deterministic XYZ survey engine — no AI, no historical seeding. */
(function(root){
"use strict";
const W=[["control","Survey control",8],["centers","Chamber positions",10],["inventory","All openings",10],["ports","Opening XYZ",15],["inverts","Invert XYZ / gravity",12],["attributes","Pipe attributes",6],["channels","Channel XYZ",5],["continuity","Connection evidence",12],["trace","Buried trace evidence",12],["constraints","Spatial constraints",4],["qa","Independent QA",6]];
const num=n=>typeof n==="number"&&Number.isFinite(n),round=n=>Math.round(n*10)/10,copy=o=>JSON.parse(JSON.stringify(o)),id=()=>Math.random().toString(36).slice(2,12);
const note="Score is a verification-coverage index / 100, NOT the probability that the hidden pipe is in the displayed location.";
const validPt=p=>p&&num(p.x)&&num(p.y)&&num(p.z);
function project(x){
 const name=(x.name||"").trim(),crs=(x.crs||"").trim(),datum=(x.verticalDatum||"").trim();
 if(!name||!crs||!datum)throw Error("Name, projected CRS and vertical datum required");
 return {schema:"subterra-v2",id:id(),name,network:x.network==="storm"?"storm":"sanitary",
 control:{method:"TOTAL_STATION",crs,verticalDatum:datum,instrumentId:x.instrumentId||"",surveyor:x.surveyor||""},
 manholes:[],points:[],fieldValues:[],evidence:[],pair:[],rounds:[],accepted:null,surfaceSurveyComplete:false};
}
function addManhole(p,m){
 const name=String(m.id||"").trim(),sxy=Number(m.sigmaXY),sz=Number(m.sigmaZ);
 if(!name||p.manholes.some(x=>x.id.toLowerCase()===name.toLowerCase()))throw Error("Unique manhole ID required");
 if(!validPt(m)||!num(sxy)||!num(sz)||sxy<=0||sz<=0||sxy>5||sz>5)throw Error("Total Station X,Y,Z and positive precision values required");
 return {...p,manholes:[...p.manholes,{id:name,x:m.x,y:m.y,z:m.z,sigmaXY:sxy,sigmaZ:sz,method:"TOTAL_STATION",pointDefinition:"COVER_CENTER",openings:[],inventoryComplete:false}],surfaceSurveyComplete:false,accepted:null};
}
function setSurfaceSurveyComplete(p,complete){
 if(complete&&p.manholes.length<2)throw Error("Total Station survey requires at least two manholes");
 return {...p,surfaceSurveyComplete:complete===true,accepted:null};
}
function setPair(p,a,b){
 if(a===b||!p.manholes.some(x=>x.id===a)||!p.manholes.some(x=>x.id===b))throw Error("Choose two distinct surveyed manholes");
 return {...p,pair:[a,b],accepted:null};
}
function addOpening(p,mhId,raw){
 const m=p.manholes.find(x=>x.id===mhId),oid=String(raw.id||"").trim();
 if(!m||!oid||m.openings.some(x=>x.id===oid))throw Error("Select manhole and unique opening ID");
 const role=["INLET","OUTLET","LATERAL","DROP","BRANCH","CAPPED","UNKNOWN"].includes(raw.role)?raw.role:"UNKNOWN";
 const material=String(raw.material||"").trim()||null,dm=Number(raw.diameterMm);
 const o={id:oid,role,condition:raw.condition||"UNKNOWN",material,diameterMm:dm>0&&Number.isFinite(dm)?dm:null};
 return {...p,manholes:p.manholes.map(x=>x.id===mhId?{...x,openings:[...x.openings,o],inventoryComplete:false}:x),accepted:null};
}
function inventory(p,mhId,state){
 return {...p,manholes:p.manholes.map(x=>x.id===mhId?{...x,inventoryComplete:state===true&&x.openings.length>0}:x),accepted:null};
}
function addPoint(p,r){
 const m=p.manholes.find(x=>x.id===r.manholeId),k=String(r.kind||""),o=String(r.openingId||"");
 const kinds=["CHAMBER_CENTER","OPENING_CENTER","PIPE_INVERT","CHANNEL_POINT","BENCH_POINT","STEP_POINT","PIPE_TRACE_POINT","OTHER_POINT"];
 if(!m||!kinds.includes(k))throw Error("Select known manhole and point type");
 if(["OPENING_CENTER","PIPE_INVERT","CHANNEL_POINT"].includes(k)&&!m.openings.some(t=>t.id===o))throw Error("Select a registered opening for this point");
 const sxy=Number(r.sigmaXY),sz=Number(r.sigmaZ);
 if(!validPt(r)||!num(sxy)||!num(sz)||sxy<=0||sz<=0||sxy>5||sz>5)throw Error("XYZ and positive sigma XY/Z required");
 const rec={id:id(),mhId:m.id,openingId:o||null,kind:k,x:r.x,y:r.y,z:r.z,sigmaXY:sxy,sigmaZ:sz,
  method:r.method||"SURVEY_PEN_SIMULATED",evidenceRef:r.evidenceRef||null,crs:p.control.crs,
  verticalDatum:p.control.verticalDatum,sourceType:r.method==="SURVEY_PEN_SIMULATED"?"SIMULATED":"USER_DECLARED",observedAt:new Date().toISOString()};
 return {...p,points:[...p.points,rec],accepted:null};
}
function field(p,scope,fid,value){
 if(!/^([A-Z]{2,4}-\d{3}|SFP-(REVIEW|QA))$/.test(fid))throw Error("Invalid field reference");
 return {...p,fieldValues:[...p.fieldValues,{id:id(),scope,fid,value,at:new Date().toISOString()}],accepted:null};
}
function evidence(p,r){
 if(p.pair.length!==2||!r.type||!String(r.ref||"").trim())throw Error("Select pair and evidence type/reference");
 return {...p,evidence:[...p.evidence,{id:id(),pair:p.pair.join("|"),type:r.type,ref:String(r.ref),reviewed:r.reviewed===true,reviewer:r.reviewer||null,at:new Date().toISOString()}],accepted:null};
}
function getPoint(p,m,k,o){
 for(let i=p.points.length-1;i>=0;i--){
  const z=p.points[i];if(z.mhId===m.id&&z.kind===k&&(!o||z.openingId===o))return z;
 }return null;
}
function assess(p){
 const pair=p.pair||[],a=p.manholes.find(m=>m.id===pair[0]),b=p.manholes.find(m=>m.id===pair[1]);
 if(!a||!b||a.id===b.id||!p.surfaceSurveyComplete)return {status:"AWAITING_SURVEY",score:null,route:null,completeness:null,factors:[],warnings:[],
  tasks:[{key:"survey",label:"Total Station XYZ for at least two visible manholes",priority:100,method:"TOTAL_STATION"}],meaning:note};
 const opA=a.openings.find(x=>x.role==="OUTLET"),opB=b.openings.find(x=>x.role==="INLET");
 const centerA=getPoint(p,a,"CHAMBER_CENTER"),centerB=getPoint(p,b,"CHAMBER_CENTER");
 const pA=opA?getPoint(p,a,"OPENING_CENTER",opA.id):null,pB=opB?getPoint(p,b,"OPENING_CENTER",opB.id):null;
 const invA=opA?getPoint(p,a,"PIPE_INVERT",opA.id):null,invB=opB?getPoint(p,b,"PIPE_INVERT",opB.id):null;
 const qA=pA||a,qB=pB||b;
 const key=pair.join("|");
 const has=e=>p.evidence.some(x=>x.pair===key&&x.reviewed&&e.includes(x.type));
 const continuity=has(["CCTV_CONTINUITY","DIRECT_EXPOSURE"]);
 const traceRef=has(["SONDE_TRACE","EM_TRACE","CCTV_TRACE","GPR_TRACE","DIRECT_EXPOSURE"]);
 const tracePts=p.points.filter(x=>x.kind==="PIPE_TRACE_POINT"&&[a.id,b.id].includes(x.mhId));
 const trace=traceRef&&tracePts.length>=2;
 const vec=[qB.x-qA.x,qB.y-qA.y],vecLength=Math.hypot(...vec);
 const middle=trace?tracePts.slice().sort((u,v)=>((u.x-qA.x)*vec[0]+(u.y-qA.y)*vec[1])-((v.x-qA.x)*vec[0]+(v.y-qA.y)*vec[1])||u.id.localeCompare(v.id)):[];
 const routeGeom=[qA,...middle,qB].map(pt=>({x:pt.x,y:pt.y,z:null}));
 let length=0;for(let i=1;i<routeGeom.length;i++)length+=Math.hypot(routeGeom[i].x-routeGeom[i-1].x,routeGeom[i].y-routeGeom[i-1].y);
 const dz=invA&&invB?invA.z-invB.z:null,conflict=num(dz)&&dz<=0;
 const match=opA&&opB&&opA.material&&opB.material&&opA.diameterMm&&opA.diameterMm===opB.diameterMm&&opA.material.toLowerCase()===String(opB.material).toLowerCase();
 const hasChan=[a,b].every(m=>!!getPoint(p,m,"CHANNEL_POINT"));
 const val=(fid,value)=>p.fieldValues.some(x=>x.fid===fid&&x.scope===key&&x.value===value);
 const scores={control:p.control.method==="TOTAL_STATION"&&p.control.crs&&p.control.verticalDatum?8:0,
   centers:6+(centerA?2:0)+(centerB?2:0),
   inventory:(a.inventoryComplete?5:0)+(b.inventoryComplete?5:0),
   ports:(pA?7.5:0)+(pB?7.5:0),
   inverts:invA&&invB&&!conflict?12:invA||invB?2:0,
   attributes:match?6:0,channels:hasChan?5:0,continuity:continuity?12:0,
   trace:trace?12:0,constraints:val("SFP-REVIEW","COMPLETE")?4:0,qa:val("SFP-QA","INDEPENDENT_REVIEWED")?6:0};
 const factors=W.map(([k,label,max])=>({key:k,label,max,score:scores[k]}));
 let score=round(factors.reduce((acc,z)=>acc+z.score,0));if(conflict)score=Math.min(35,score);
 const tasks=[
  ["centers","Survey chamber centers separately from cover centers","TOTAL_STATION",4,3],
  ["inventory","Record every visible opening and confirm inventories","FIELD_VISUAL",10,1],
  ["ports","Measure opening-center XYZ at outlet and inlet","CALIBRATED_SURVEY_PEN",15,2],
  ["inverts","Measure both true PIPE INVERT XYZ, with shared benchmark","TOTAL_STATION / CALIBRATED_PEN",12,2],
  ["attributes","Confirm portal sizes and materials","MANHOLE_INSPECTION",6,2],
  ["channels","Survey channel XYZ in both manholes","CALIBRATED_PEN",5,3],
  ["continuity","Get independently reviewed connection-continuity evidence","CCTV / DIRECT_EXPOSURE",12,5],
  ["trace","Survey intermediate underground trace positions","SONDE / EM / CCTV",12,5],
  ["constraints","Review and locate external route constraints","SURFACE_SURVEY",4,3],
  ["qa","Independent measurement / engineering quality review","QA",6,3]
 ].filter(x=>scores[x[0]]<W.find(t=>t[0]===x[0])[2])
 .map(x=>({key:x[0],label:x[1],method:x[2],maxMissing:round(W.find(y=>y[0]===x[0])[2]-scores[x[0]]),priority:round(x[3]/x[4])}))
 .sort((a,b)=>b.priority-a.priority||a.key.localeCompare(b.key));
 const warnings=[];
 if(!pA||!pB)warnings.push("Unmeasured opening XYZ: displayed route uses manhole cover positions where necessary");
 if(!invA||!invB)warnings.push("Pipe invert Z UNKNOWN; surveyed cover Z is NOT invert Z");
 if(conflict)warnings.push("Non-positive gravity fall — check assumed flow direction / vertical datum");
 if(!continuity)warnings.push("Physical continuity of selected openings not independently verified");
 if(!trace)warnings.push("Underground intermediate alignment unverified; endpoint line is a hypothesis, not an as-built");
 const status=conflict?"CONFLICT":trace&&continuity?"TRACE_SUPPORTED":"PROVISIONAL_ENDPOINT_CONNECTOR";
 const completeCount=[a.inventoryComplete,b.inventoryComplete,!!centerA,!!centerB,!!pA,!!pB,!!invA,!!invB,!!opA,!!opB].filter(Boolean).length;
 return {schema:"subterra-assessment/v2",status,score,completeness:round(completeCount*10),factors,tasks,warnings,meaning:note,
  route:{geometry:routeGeom,lengthM:round(length*100)/100,bearingDeg:round((Math.atan2(vec[0],vec[1])*180/Math.PI+360)%360),
   gradePercent:num(dz)&&dz>0&&length>0?round(1000*dz/length)/10:null,invertFromZ:invA?.z??null,invertToZ:invB?.z??null,
   xyInputSigmaM:round(1000*Math.hypot(qA.sigmaXY||a.sigmaXY,qB.sigmaXY||b.sigmaXY))/1000,
   hiddenAlignmentUnquantified:!trace,sourceId:a.id,targetId:b.id},
  fullRubricSatisfied:score===100,simulationFlag:p.points.some(x=>x.method==="SURVEY_PEN_SIMULATED")};
}
function nextRound(p){
 const result=assess(p);if(result.score===null)throw Error("Select at least two surveyed manholes");
 const id="ROUND-"+String(p.rounds.length).padStart(2,"0");
 const roundObject={id,at:new Date().toISOString(),pair:[...p.pair],data:JSON.parse(JSON.stringify({control:p.control,manholes:p.manholes,points:p.points,fieldValues:p.fieldValues,evidence:p.evidence})),result:JSON.parse(JSON.stringify(result))};
 return {...p,rounds:[...p.rounds,roundObject],accepted:null};
}
function accept(p,reason){
 const r=assess(p);if(r.score===null)throw Error("No route to accept");
 return {...p,accepted:{at:new Date().toISOString(),score:r.score,reason:String(reason||""),remaining:r.tasks.map(x=>x.key),status:"USER_ACCEPTED_WITH_UNRESOLVED_RISK"}};
}
function selfTest(){
 let p=project({name:"Synthetic",crs:"LOCAL_ENU_METRES",verticalDatum:"SYNTHETIC_BM"});
 p=addManhole(p,{id:"A",x:0,y:0,z:104,sigmaXY:.01,sigmaZ:.01});
 p=addManhole(p,{id:"B",x:60,y:0,z:102,sigmaXY:.01,sigmaZ:.01});
 p=setPair(p,"A","B");p=setSurfaceSurveyComplete(p,true);
 let r=assess(p);if(r.score!==14||r.route.gradePercent!==null)throw Error("Initial assumption invalid "+r.score);
 p=addOpening(p,"A",{id:"OUT",role:"OUTLET",material:"PVC",diameterMm:300});
 p=addOpening(p,"B",{id:"IN",role:"INLET",material:"PVC",diameterMm:300});
 for(let t of ["A","B"]){
  const x=t==="A"?0:60,z=t==="A"?103:101,openingId=t==="A"?"OUT":"IN";
  p=inventory(p,t,true);
  p=addPoint(p,{manholeId:t,kind:"CHAMBER_CENTER",x,y:0,z,method:"TOTAL_STATION",sigmaXY:.01,sigmaZ:.01});
  p=addPoint(p,{manholeId:t,openingId,kind:"OPENING_CENTER",x:x+(x===0?.75:-.75),y:0,z,method:"SURVEY_PEN_SIMULATED",sigmaXY:.02,sigmaZ:.02});
  p=addPoint(p,{manholeId:t,openingId,kind:"PIPE_INVERT",x:x+(x===0?.75:-.75),y:0,z:z-1,method:"SURVEY_PEN_SIMULATED",sigmaXY:.02,sigmaZ:.02});
  p=addPoint(p,{manholeId:t,openingId,kind:"CHANNEL_POINT",x,y:0,z:z-1,method:"SURVEY_PEN_SIMULATED",sigmaXY:.02,sigmaZ:.02});
 }
 p=evidence(p,{type:"CCTV_CONTINUITY",ref:"SIM_CCTV",reviewed:true,reviewer:"SIM_QA"});
 for(const x of [10,30,50])p=addPoint(p,{manholeId:"A",kind:"PIPE_TRACE_POINT",x,y:0,z:99,method:"SURVEY_PEN_SIMULATED",sigmaXY:.02,sigmaZ:.02});
 p=evidence(p,{type:"SONDE_TRACE",ref:"SIM_TRACE",reviewed:true,reviewer:"SIM_QA"});
 p=field(p,"A|B","SFP-REVIEW","COMPLETE");p=field(p,"A|B","SFP-QA","INDEPENDENT_REVIEWED");
 const best=assess(p);if(best.score!==100||best.status!=="TRACE_SUPPORTED"||best.route.gradePercent===null)throw Error("100 scoring test failed "+best.score);
 const z=nextRound(p),was=JSON.stringify(z.rounds[0]);
 const edited=addPoint(z,{manholeId:"A",kind:"OTHER_POINT",x:3,y:2,z:4,method:"SURVEY_PEN_SIMULATED",sigmaXY:.02,sigmaZ:.02});
 if(JSON.stringify(edited.rounds[0])!==was)throw Error("Immutable snapshot changed");
 return {initial:r.score,full:best.score,initialZ:r.route.gradePercent,finalZ:best.route.gradePercent,immutable:true};
}
root.SubterraV2={W,project,addManhole,setSurfaceSurveyComplete,setPair,addOpening,inventory,addPoint,field,evidence,assess,nextRound,accept,selfTest};
})(window);