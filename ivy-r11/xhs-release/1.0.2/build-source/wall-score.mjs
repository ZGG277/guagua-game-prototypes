/** Offline score contract for a future platform adapter. No network, account,
 * provider limits or platform SDK are selected by this module. Observe is read-only. */
export const SCORE_SCHEMA_VERSION=1;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const copy=value=>({...value});
function version(value){
 if(typeof value!=='string'||!(/^[A-Za-z0-9][A-Za-z0-9._-]{0,47}$/).test(value))throw new TypeError('Invalid score rules version');
 return value;
}
export function scoreStorageKey(rulesVersion='r11.2'){return 'ivy-score-'+version(rulesVersion);}

/** Event types: run-started, leaf-record, summit. Highest leaf is a maximum,
 * never a cumulative score; re-grabbing/re-landing cannot add points.
 * Call observe immediately after a successful up() so even a sparse renderer
 * observes the actual jump event. Idle/charging time is not run time. */
export function createRunTracker({rulesVersion='r11.2',emit=null,settleSeconds=.12}={}){
 rulesVersion=version(rulesVersion);
 if(!finite(settleSeconds)||settleSeconds<0||settleSeconds>1)throw new RangeError('Invalid settle window');
 let runSequence=0,highestLeaf,startedAt,lastTime,summitSeconds,completed,supportId,supportSince,listenerErrors;
 function reset(){runSequence++;highestLeaf=0;startedAt=null;lastTime=null;summitSeconds=null;completed=false;supportId=null;supportSince=null;listenerErrors=0;return snapshot();}
 function snapshot(){return{schemaVersion:SCORE_SCHEMA_VERSION,rulesVersion,runSequence,highestLeaf,started:startedAt!==null,elapsedSeconds:completed?summitSeconds:startedAt===null?null:Math.max(0,lastTime-startedAt),summitSeconds,completed,listenerErrors};}
 function event(type){
  if(typeof emit!=='function')return;
  const value=Object.freeze({type,...snapshot()});
  try{const pending=emit(value);if(pending&&typeof pending.then==='function')Promise.resolve(pending).catch(()=>{listenerErrors++;});}catch{listenerErrors++;} // A future UI/provider listener cannot break play.
 }
 function observe(wall){
  const time=wall?.time,b=wall?.body;
  if(!finite(time)||time<0||!b||(lastTime!==null&&time<lastTime-1e-8))return snapshot();
  lastTime=time;
  if(startedAt===null&&wall.feedback?.type==='jump'&&!b.grounded&&!wall.grip){
   const launchTime=wall.flightTime;
   if(finite(launchTime)&&launchTime>=0&&launchTime<=time){startedAt=launchTime;event('run-started');}
  }
  const id=wall.standId,feet=b.feet;
  const supported=b.grounded===true&&!wall.grip&&Number.isInteger(id)&&id>=0&&id<100&&Array.isArray(feet)&&feet.length===2&&feet.every(f=>f&&finite(f.x)&&finite(f.y)&&finite(f.z));
  if(!supported){supportId=null;supportSince=null;return snapshot();}
  if(supportId!==id){supportId=id;supportSince=time;}
  // landTime is authoritative when supplied by the simulator. A generic
  // adapter fixture without it must be observed continuously for the window.
  const landedAt=finite(wall.landTime)&&wall.landTime<=time?wall.landTime:supportSince;
  const settled=time-landedAt+1e-8>=settleSeconds;
  // The original simulator freezes its clock at a physically confirmed summit.
  // Do not wait for frozen time to advance; two authoritative grounded soles are still
  // mandatory, so a hanging hand, airborne goal ID or grip cannot finish a run.
  const confirmedSummit=id===99&&wall.completed===true;
  if(!settled&&!confirmedSummit)return snapshot();
  const number=id+1;
  if(number>highestLeaf){highestLeaf=number;event('leaf-record');}
  if(number===100&&startedAt!==null&&!completed){completed=true;summitSeconds=Math.max(0,time-startedAt);event('summit');}
  return snapshot();
 }
 reset();return Object.freeze({observe,reset,snapshot});
}

function record(value,rulesVersion){
 if(!value||value.rulesVersion!==rulesVersion||!Number.isInteger(value.highestLeaf)||value.highestLeaf<0||value.highestLeaf>100)return null;
 const summit=value.summitSeconds;
 if(summit!==null&&summit!==undefined&&(!finite(summit)||summit<0||value.highestLeaf!==100||value.completed!==true))return null;
 if(value.completed===true&&(value.highestLeaf!==100||!finite(summit)))return null;
 return{schemaVersion:SCORE_SCHEMA_VERSION,rulesVersion,highestLeaf:value.highestLeaf,summitSeconds:summit??null,completed:value.completed===true};
}
/** Pure local-record helpers. Callers own storage and must catch storage denial;
 * neither historical version scores nor malformed records are imported. */
export function readScoreRecord(serialized,rulesVersion='r11.2'){
 rulesVersion=version(rulesVersion);try{return record(JSON.parse(serialized),rulesVersion);}catch{return null;}
}
export function mergeScoreRecord(previous,result,rulesVersion='r11.2'){
 rulesVersion=version(rulesVersion);const a=record(previous,rulesVersion),b=record(result,rulesVersion);
 if(!b)return a;if(!a)return b;
 const times=[a.summitSeconds,b.summitSeconds].filter(finite);
 return{schemaVersion:SCORE_SCHEMA_VERSION,rulesVersion,highestLeaf:Math.max(a.highestLeaf,b.highestLeaf),summitSeconds:times.length?Math.min(...times):null,completed:a.completed||b.completed};
}

/** Provider contract: submit(score), list({rulesVersion}). The default is
 * explicitly offline. Nothing is submitted automatically by the tracker. */
export function createScoreAdapter(provider=null,{rulesVersion='r11.2'}={}){
 rulesVersion=version(rulesVersion);
 async function invoke(operation,payload){
  if(!provider)return{status:'offline',operation,rulesVersion};
  try{const method=provider[operation];if(typeof method!=='function')return{status:'unsupported',operation,rulesVersion};return{status:'ok',operation,rulesVersion,value:await method.call(provider,Object.freeze(copy(payload)))};}
  catch{return{status:'error',operation,rulesVersion,error:'provider-failed'};}
 }
 return Object.freeze({
  rulesVersion,
  async submit(value){const safe=record(value,rulesVersion);if(!safe||safe.highestLeaf<1)return{status:'invalid',operation:'submit',rulesVersion};return invoke('submit',safe);},
  async list(options={}){if(options.rulesVersion!==undefined&&options.rulesVersion!==rulesVersion)return{status:'invalid',operation:'list',rulesVersion};return invoke('list',{rulesVersion});}
 });
}
