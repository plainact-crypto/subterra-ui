/* SUBTERRA Field Survey v0.15 - deterministic, transparent geometry only.
   Works on explicit manhole/opening observations, NEVER historical sewer GIS.
   No AI, trained model, inferred hidden bends, or measured-flow claims. */
(() => {
 'use strict';
 const RAD=Math.PI/180,R=6371008.8;
 const CASE="NCSF-P56-BLIND-V1",SCHEMA="subterra-manhole-field-survey/v1";
 const isNum=x=>typeof x==="number"&&Number.isFinite(x);
 function mustNum(v,path,min,max){
   if(!isNum(v)||(min!==undefined&&v<min)||(max!==undefined&&v>max))
     throw Error(path+" must be a number in ["+min+", "+max+"]");
   return v;
 }
 function mustString(x,path){if(typeof x!=="string"||!x.trim())throw Error(path+" is missing");return x.trim();}
 function validate(data){
   if(!data||typeof data!=="object"||Array.isArray(data))throw Error("Expected JSON object");
   if(data.schema!==SCHEMA)throw Error("Unsupported field survey schema: "+String(data.schema));
   if(!["FIELD_OBSERVATION","SIMULATED_DEMO"].includes(data.recordType))throw Error("recordType must be FIELD_OBSERVATION or SIMULATED_DEMO");
   mustString(data.metadata?.surveyId,"metadata.surveyId");
   if(data.spatialReference?.horizontalCrs!=="EPSG:4326")throw Error("Only WGS84 EPSG:4326 coordinates supported in v1");
   if(!Array.isArray(data.manholes)||data.manholes.length<2||data.manholes.length>50)throw Error("manholes array must have 2-50 observations");
   const seen=new Set();
   const warnings=[];
   for(const mh of data.manholes){
     const id=mustString(mh.manholeId,"manholes[].manholeId");
     if(seen.has(id))throw Error("Duplicate manhole "+id);
     seen.add(id);
     mustNum(mh.surveyedCenter?.latitude,id+".surveyedCenter.latitude",-90,90);
     mustNum(mh.surveyedCenter?.longitude,id+".surveyedCenter.longitude",-180,180);
     mustNum(mh.surveyedCenter?.horizontalAccuracyM,id+".surveyedCenter.horizontalAccuracyM",0,30);
     if(mh.surveyedCenter.measuredReference!=="SURVEYED_CHAMBER_CENTER")
       throw Error(id+": surveyedCenter must refer to the actual chamber center, not the off-center cover");
     if(!Array.isArray(mh.openings)||mh.openings.length<1||mh.openings.length>50)throw Error(id+" must enumerate its visible openings");
     const portIds=new Set();
     for(const op of mh.openings){
       const pid=mustString(op.openingId,id+".openings[].openingId");
       if(portIds.has(pid))throw Error(id+" duplicate opening "+pid);
       portIds.add(pid);
       if(op.bearingOutwardDeg!==null && op.bearingOutwardDeg!==undefined)
         mustNum(op.bearingOutwardDeg,pid+".bearingOutwardDeg",0,360);
       if(op.radialOffsetFromChamberCenterM!==null && op.radialOffsetFromChamberCenterM!==undefined)
         mustNum(op.radialOffsetFromChamberCenterM,pid+".radialOffsetFromChamberCenterM",0,8);
       if(op.invertElevationRL!==null && op.invertElevationRL!==undefined)
         mustNum(op.invertElevationRL,pid+".invertElevationRL",-500,9000);
     }
     if(!mh.completeness?.allOpeningsEnumerated)warnings.push(id+": possible missing openings; type inference tentative");
   }
   const from=data.targetConnection?.from,to=data.targetConnection?.to;
   if(!from||!to||!seen.has(from.manholeId)||!seen.has(to.manholeId)||from.manholeId===to.manholeId)
     throw Error("targetConnection must connect two distinct surveyed manholes");
   const find=(where)=>data.manholes.find(m=>m.manholeId===where.manholeId)?.openings.find(o=>o.openingId===where.openingId);
   const a=find(from),b=find(to);
   if(!a||!b)throw Error("targetConnection references an opening not listed in the JSON");
   if(a.visible!==true||b.visible!==true)throw Error("Target openings must be explicitly visible");
   if(a.operationalStatus!=="ACTIVE"||b.operationalStatus!=="ACTIVE")throw Error("Target openings must be active, not capped or abandoned");
   const required=[["from",a],["to",b]];
   for(const [where,op] of required){
     mustNum(op.bearingOutwardDeg,where+".bearingOutwardDeg",0,360);
     mustNum(op.radialOffsetFromChamberCenterM,where+".radialOffsetFromChamberCenterM",0,8);
     mustNum(op.invertElevationRL,where+".invertElevationRL",-500,9000);
     mustNum(op.bearingAccuracyDeg,where+".bearingAccuracyDeg",0,90);
     mustNum(op.invertAccuracyM,where+".invertAccuracyM",0,10);
     mustNum(op.radialOffsetAccuracyM,where+".radialOffsetAccuracyM",0,5);
   }
   if(a.roleObserved!==null&&a.roleObserved!=="outlet")throw Error("Selected source opening is not identified as outlet");
   if(b.roleObserved!==null&&b.roleObserved!=="inlet")throw Error("Selected destination opening is not identified as inlet");
   if(a.orientationReference!=="OUTWARD_FROM_CHAMBER_TRUE_NORTH"||b.orientationReference!=="OUTWARD_FROM_CHAMBER_TRUE_NORTH")
     throw Error("Bearing reference must be OUTWARD_FROM_CHAMBER_TRUE_NORTH");
   if(!data.spatialReference?.verticalDatumConfirmedForBothManholes ||
       !data.spatialReference?.verticalDatum)
      warnings.push("Two manhole invert elevations lack a verified common vertical datum: slope suppressed");
   if(data.recordType==="SIMULATED_DEMO")warnings.push("ALL field-survey values are SIMULATED; not a visit or field verification");
   if(data.recordType==="FIELD_OBSERVATION")warnings.push("User-declared field data; independent verification of observations is NOT performed by this software");
   if(data.safety?.confinedSpaceEntered===true&&(!data.safety.entryPermitId||data.safety.gasTestStatus!=="PASSED"))
     warnings.push("Reported confined-space entry is missing documented permit or passed gas check; safety records incomplete");
   return {warnings,a,b};
 }
 function coords(origin,target){
   const lat0=origin[1]*RAD;
   return [(target[0]-origin[0])*RAD*R*Math.cos(lat0),(target[1]-origin[1])*RAD*R];
 }
 function invert(origin,xy){
   return [origin[0]+xy[0]/(R*Math.cos(origin[1]*RAD))*180/Math.PI,origin[1]+xy[1]/R*180/Math.PI];
 }
 const len=v=>Math.hypot(v[0],v[1]),toBearing=v=>(Math.atan2(v[0],v[1])/RAD+360)%360;
 const angleDiff=(a,b)=>((a-b+540)%360)-180;
 const xyOf=(lat,lon,origin)=>coords(origin,[lon,lat]);
 function classify(m){
   const observed=m.geometry?.chamberTypeObserved;
   if(observed)return {type:observed,method:"REPORTED_BY_SURVEYOR",status:"USER_REPORTED_NOT_AUTOMATICALLY_VERIFIED"};
   const active=m.openings.filter(o=>o.visible===true&&o.operationalStatus==="ACTIVE");
   const complete=m.completeness?.surveyorConfirmedComplete===true&&m.completeness?.allOpeningsEnumerated===true;
   let type="UNKNOWN";
   if(m.geometry?.dropConnectionObserved===true)type="DROP";
   else if(active.length>2)type="JUNCTION";
   else if(active.length===2)type="THROUGH";
   else if(active.length===1)type="TERMINAL";
   return {type,method:"DETERMINISTIC_VISIBLE_CONNECTION_COUNT",status:complete?"RULE_BASED_CLASSIFICATION":"TENTATIVE_INCOMPLETE_FIELD_COVERAGE",
     activeOpenings:active.length,visibleOpenings:m.openings.filter(o=>o.visible).length};
 }
 function typeOfOpening(op){
   return {
    openingId:op.openingId,role:op.roleObserved||"UNKNOWN",
    roleSource:op.roleObserved?"USER_OBSERVED":"UNDETERMINED",
    pipeMaterial:op.pipeMaterialObserved||"UNKNOWN",
    pipeMaterialSource:op.pipeMaterialObserved?"USER_REPORTED":"NOT_INFERRED_WITHOUT_OBSERVATION",
    pipeType:op.pipeTypeObserved||"UNKNOWN",
    pipeTypeSource:op.pipeTypeObserved?"USER_REPORTED":"NOT_INFERRED_WITHOUT_OBSERVATION",
    connectionType:op.connectionType||"UNKNOWN"
   };
 }
 function compute(data,prior){
   const checked=validate(data);
   if(prior?.schema!=="subterra-pipe56-phase2a-result/v1"||prior?.caseId!==CASE)
     throw Error("Valid frozen Pipe 56 Phase 2A snapshot required");
   const list=prior.candidate?.coordinates;
   if(!Array.isArray(list)||list.length!==2)throw Error("No original orange baseline");
   const origin=list[0],originalFrom=[0,0],originalTo=coords(origin,list[1]);
   const aM=data.manholes.find(m=>m.manholeId===data.targetConnection.from.manholeId);
   const bM=data.manholes.find(m=>m.manholeId===data.targetConnection.to.manholeId);
   // Chamber center = surveyed chamber center; eccentric frame offsets are recorded separately.
   // Field radial offsets are referenced to that chamber center, not to the lid center.
   const centerA=xyOf(aM.surveyedCenter.latitude,aM.surveyedCenter.longitude,origin);
   const centerB=xyOf(bM.surveyedCenter.latitude,bM.surveyedCenter.longitude,origin);
   const radial=(op)=>[op.radialOffsetFromChamberCenterM*Math.sin(op.bearingOutwardDeg*RAD),
      op.radialOffsetFromChamberCenterM*Math.cos(op.bearingOutwardDeg*RAD)];
   const ra=radial(checked.a),rb=radial(checked.b);
   const faceA=[centerA[0]+ra[0],centerA[1]+ra[1]];
   const faceB=[centerB[0]+rb[0],centerB[1]+rb[1]];
   const sigmaFace=(center,op)=>Math.hypot(center.horizontalAccuracyM,op.radialOffsetAccuracyM,
      op.radialOffsetFromChamberCenterM*op.bearingAccuracyDeg*RAD);
   const sigmaA=sigmaFace(aM.surveyedCenter,checked.a);
   const sigmaB=sigmaFace(bM.surveyedCenter,checked.b);
   const combinedOpeningUncertaintyM=Math.hypot(sigmaA,sigmaB);
   const delta=[faceB[0]-faceA[0],faceB[1]-faceA[1]];
   const length=len(delta),originalLength=len(originalTo);
   if(length<1)throw Error("Computed face-to-face span is less than 1 m");
   const bearing=toBearing(delta),bErrA=angleDiff(checked.a.bearingOutwardDeg,bearing),
      bErrB=angleDiff(checked.b.bearingOutwardDeg,(bearing+180)%360);
   const threshold=data.modelSettings?.maximumBearingMismatchDeg??12;
   mustNum(threshold,"maximumBearingMismatchDeg",0,60);
   const angularCompatible=Math.abs(bErrA)<=threshold&&Math.abs(bErrB)<=threshold;
   const cross=(p)=>Math.abs(originalTo[0]*p[1]-originalTo[1]*p[0])/originalLength;
   const offsets=[cross(faceA),cross([(faceA[0]+faceB[0])/2,(faceA[1]+faceB[1])/2]),cross(faceB)];
   const midOriginal=[originalTo[0]/2,originalTo[1]/2];
   const midpointCorrected=[(faceA[0]+faceB[0])/2,(faceA[1]+faceB[1])/2];
   const endpointCross=offs=>Number(offs.toFixed(8));
   const datumOK=data.spatialReference.verticalDatumConfirmedForBothManholes===true&&
      !!data.spatialReference.verticalDatum;
   const drop=checked.a.invertElevationRL-checked.b.invertElevationRL;
   const positiveDrop=drop>0;
   const outputOK=angularCompatible&&datumOK&&positiveDrop;
   return {
    schema:"subterra-field-deterministic-correction/v1",
    recordType:data.recordType,surveyId:data.metadata.surveyId,
    caseId:CASE,source:"USER_SUPPLIED_FIELD_SURVEY_JSON",
    evidenceStatus:data.recordType==="SIMULATED_DEMO"?"SIMULATION_NOT_FIELD_VERIFIED":"USER_DECLARED_FIELD_DATA_NOT_INDEPENDENTLY_VERIFIED",
    stage:outputOK?"CORRECTED_STRAIGHT_ROUTE_HYPOTHESIS":"GEOMETRIC_OR_VERTICAL_CONFLICT",
    rule:"TWO_EXPLICIT_OPENING_CENTERS_PLUS_TRUE_NORTH_BEARING_CONSISTENCY",
    geometry:{
      originalCenterToCenterM:prior.candidate.distanceM,
      resurveyedCenterToCenterM:len([centerB[0]-centerA[0],centerB[1]-centerA[1]]),
      openingFaceToFaceLengthM:length,
      referenceOriginalBearingDeg:prior.candidate.azimuthDegFromNorthClockwise??toBearing(originalTo),
      openingFaceToFaceBearingDeg:bearing,
      sourceCenterOffsetFromOldM:len(centerA),
      destinationCenterOffsetFromOldM:len([centerB[0]-originalTo[0],centerB[1]-originalTo[1]]),
      sourceOpeningRadialOffsetM:len(ra),
      destinationOpeningRadialOffsetM:len(rb),
      referenceLinePerpendicularOffsetsM:offsets.map(endpointCross),
      measuredOpeningAApprox1SigmaM:sigmaA,
      measuredOpeningBApprox1SigmaM:sigmaB,
      combinedApprox1SigmaM:combinedOpeningUncertaintyM,
      uncertaintyStatement:"FIRST_ORDER_INPUT_ERROR_PROPAGATION_ONLY; older GIS baseline error is unknown; not a certified accuracy estimate",
      // Comparing face-to-face end points to old center-to-center ends includes physical chamber radii.
      faceToFaceLengthDeltaVsCenterBaselineM:length-prior.candidate.distanceM,
      midpointVectorDeltaVsReferenceMidpointM:len([midpointCorrected[0]-midOriginal[0],midpointCorrected[1]-midOriginal[1]]),
      sourceOpeningWgs84:invert(origin,faceA),
      destinationOpeningWgs84:invert(origin,faceB),
      correctedLineCoordinatesWgs84:[invert(origin,faceA),invert(origin,faceB)],
      lineDrawingAllowed:outputOK
    },
    bearingConsistency:{
      fromOutwardMeasuredDeg:checked.a.bearingOutwardDeg,toOutwardMeasuredDeg:checked.b.bearingOutwardDeg,
      lineBearingDeg:bearing,fromDifferenceDeg:bErrA,toDifferenceDeg:bErrB,
      maximumAllowedDifferenceDeg:threshold,compatible:angularCompatible
    },
    gravity:{
      sourceOpeningInvertRL:checked.a.invertElevationRL,
      destinationOpeningInvertRL:checked.b.invertElevationRL,
      commonVerticalDatum:data.spatialReference.verticalDatum||null,
      datumVerifiedForPair:datumOK,
      dropM:datumOK?drop:null,
      faceToFaceSlopePercent:datumOK?100*drop/length:null,
      positiveDrop:datumOK?positiveDrop:null
    },
    classifications:data.manholes.map(m=>({
      manholeId:m.manholeId,manhole:classify(m),openings:m.openings.map(typeOfOpening),
      ladderOrSteps:m.access?.ladderOrSteps||"UNKNOWN",
      stepCount:m.access?.numberOfSteps??null,
      missingStepsCount:m.access?.missingStepsCount??null,
      visibleDefects:{wallCrackCount:m.barrel?.wallCrackCount??null,sedimentDepthMm:m.bench?.sedimentDepthMm??null,activeInfiltration:m.serviceAndSafety?.activeInfiltration??null}
    })),
    checks:{
      manholesExplicitlySurveyed:true,
      allTargetOpeningsVisible:true,
      connectionPhysicalContinuityVerified:data.targetConnection.physicalContinuityVerified===true,
      noHiddenBendsAssumed:true,
      noHistoricalGISReference:true,
      correctedLineIsObservationConstrainedHypothesis:true
    },
    warnings:[
      ...checked.warnings,
      ...(!angularCompatible?["Bearing mismatch exceeds configured threshold; do not draw corrected line"]:[]),
      ...(!positiveDrop?["Selected source-to-destination connection has zero or negative gravity drop"]:[]),
      "Shortened face-to-face span must NOT be interpreted as a real reduction of pipe center-to-center length.",
      "The reported uncertainty is first-order propagation of user-entered accuracies, not independent ground-truth accuracy.",
      "Manhole and opening observations alone do NOT prove physical continuity between chambers.",
      "Do not interpret deviation versus old straight line as ground-truth positional error.",
      "Photographs and survey-grade methods must be independently audited for genuine field verification."
    ]
   };
 }
 function verify(data,prior,stored){
   if(!stored||typeof stored!=="object")return {pass:false,reason:"No saved correction"};
   try{const expected=compute(data,prior);
      return {pass:JSON.stringify(expected)===JSON.stringify(stored),reason:"Independent deterministic recomputation"};
   }catch(err){return {pass:false,reason:String(err?.message||err)};}
 }
 window.SubterraFieldSurvey={validate,compute,verify,classify,version:1};
})();