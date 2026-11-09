/** Personal records only. No profile, registration, deletion or direct networking.
 * writeLocal(key, string) MUST resolve true after durable persistence, not merely
 * enqueue a native write. readLocal reads that same device-local (not cloud) store.
 * observe is frame-safe: it only merges in memory and schedules a later task.
 */
import {apiOf,buildVersion,bounded,rankFailure} from './wall-platform.mjs';
import {mergeScoreRecord,readScoreRecord,scoreStorageKey} from './wall-score.mjs';
export const CLOUD_COLLECTION='ivy_personal_best_v1',CLOUD_INTERVAL=60000;
export const cloudMetaKey=(rulesVersion='r11.2')=>'ivy-cloud-'+rulesVersion;
const idOK=id=>typeof id==='string'&&/^[a-f0-9]{24}$/i.test(id);
const writerOK=id=>typeof id==='string'&&/^[a-f0-9]{32}$/.test(id);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const covers=(a,b)=>!!a&&a.highestLeaf>=b.highestLeaf&&(b.summitSeconds===null||(a.summitSeconds!==null&&a.summitSeconds<=b.summitSeconds));
export async function createCloudRecords(scope,{readLocal,writeLocal,onRecord=()=>{},now=()=>Date.now(),sleep=ms=>new Promise(r=>setTimeout(r,ms)),rulesVersion='r11.2'}={}){
 const key=cloudMetaKey(rulesVersion),scoreKey=scoreStorageKey(rulesVersion),api=apiOf(scope);
 let best=null,remote=null,own=null,meta=null,state={status:'loading'},dirty=false,scheduled=false,closed=false,serial=Promise.resolve(),initialized=false;
 const status=()=>({...state,pending:dirty,uncertain:!!meta?.journal});
 const set=(s,error=null)=>{state={status:s,error};return status();};
 const valid=value=>mergeScoreRecord(null,value,rulesVersion);
 const content=record=>({schemaVersion:1,writerId:meta.writerId,...record});
 async function persist(){if(await writeLocal(key,JSON.stringify(meta))!==true)throw{local:true};}
 function accept(value){const merged=mergeScoreRecord(best,value,rulesVersion);if(!same(merged,best)){best=merged;try{Promise.resolve(onRecord({...best})).catch(()=>{});}catch{}}}
 function failure(e){if(e?.local)return set('local_error');const f=rankFailure(e);return set(f.status,f.error);}
 async function query(){
  const rows=[],seen=new Set();let cursor;
  do{
   const page=await bounded(api.queryCloudStorage({collection:CLOUD_COLLECTION,limit:100,...(cursor?{cursor}:{})}));
   if(!page||!Array.isArray(page.items))throw{errMsg:'invalid cloud page'};
   rows.push(...page.items);
   const next=page.nextCursor;
   if(next!==undefined&&next!==null&&next!==''&&typeof next!=='string')throw{errMsg:'invalid cursor'};
   if(page.hasMore===true&&!next)throw{errMsg:'missing cursor'};
   if(next&&seen.has(next))throw{errMsg:'repeated cursor'};
   cursor=next||null;if(cursor)seen.add(cursor);
   if(seen.size>=10)throw{errMsg:'pagination limit'};
  }while(cursor);
  let merged=null;const mine=[];
  for(const row of rows){
   if(row?.collection!==CLOUD_COLLECTION||!idOK(row.id)||row.content?.schemaVersion!==1||!writerOK(row.content.writerId))continue;
   const r=valid(row.content);if(!r)continue;
   merged=mergeScoreRecord(merged,r,rulesVersion);
   if(row.content.writerId===meta.writerId)mine.push({id:row.id,record:r});
  }
  // Commit only after EVERY page succeeds. Never convert partial reads to empty.
  remote=merged;own=mine.length===1?mine[0]:null;
  if(mine.length>1)throw{errMsg:'duplicate writer records'};
  accept(merged);
  if(meta.journal){
   if(own&&(!meta.journal.id||meta.journal.id===own.id)&&covers(own.record,meta.journal.record)){
    meta.journal=null;await persist();
   }else return false; // An absent row cannot prove a timed-out write failed.
  }
  return true;
 }
 function schedule(){
  if(scheduled||closed||!initialized||!dirty||['unsupported','unauthorized','not_open','local_error'].includes(state.status)||meta?.journal)return;
  scheduled=true;
  // Always defer at least one minute from observations/initialization. flush()
  // may be called on lifecycle transitions, but still respects lastAttempt.
  Promise.resolve(sleep(Math.max(CLOUD_INTERVAL,CLOUD_INTERVAL-(now()-(meta?.lastAttempt??0))))).then(()=>{scheduled=false;if(!closed)return flush();}).catch(()=>{scheduled=false;});
 }
 async function run(){
  if(closed)return set('closed');
  if(['unsupported','unauthorized','not_open','local_error'].includes(state.status))return status();
  try{
   const reconciled=await query();
   dirty=!!best&&!covers(remote,best);
   if(!reconciled)return set('unknown');
   if(!dirty)return set('synced');
   if(now()-meta.lastAttempt<CLOUD_INTERVAL){set('pending');schedule();return status();}
   const record=mergeScoreRecord(own?.record,best,rulesVersion);
   // Journal BEFORE invoking a mutating API. Persist throttling across restarts.
   meta.lastAttempt=now();meta.journal={id:own?.id||null,record};await persist();
   let result;
   try{result=await bounded(own?api.updateCloudStorage({collection:CLOUD_COLLECTION,items:[{id:own.id,content:content(record)}]}):api.addCloudStorage({collection:CLOUD_COLLECTION,items:[{content:content(record)}]}));}
   catch(e){
    if(e?.uncertain||e?.errCode===2004||!Number.isInteger(e?.errCode))return set('unknown');
    meta.journal=null;await persist();return failure(e);
   }
   const item=Array.isArray(result?.data)&&result.data.length===1?result.data[0]:null;
   if(item?.status==='FAILED'){meta.journal=null;await persist();return set('error');}
   if(item?.status!=='SUCCESS'||!idOK(item.id)||(own&&item.id!==own.id))return set('unknown');
   own={id:item.id,record};remote=mergeScoreRecord(remote,record,rulesVersion);meta.journal=null;await persist();
   dirty=!!best&&!covers(remote,best);set(dirty?'pending':'synced');schedule();return status();
  }catch(e){return failure(e);}
 }
 function flush(){serial=serial.then(run,run);return serial;}
 function observe(value){const r=valid(value);if(!r)return false;accept(r);dirty=!!best&&!covers(remote,best);if(dirty&&state.status==='synced')set('pending');schedule();return true;}
 const ready=(async()=>{
  try{
   const v=await buildVersion(scope);
   if(Math.floor(v/1000)<9510||!api||!['queryCloudStorage','addCloudStorage','updateCloudStorage'].every(k=>typeof api[k]==='function'))return set('unsupported');
   if(typeof readLocal!=='function'||typeof writeLocal!=='function')return set('local_error');
   const saved=await readLocal(key);
   if(saved!==null&&saved!==undefined){
    try{meta=JSON.parse(saved);}catch{throw{local:true};}
    if(!meta||meta.schemaVersion!==1||!writerOK(meta.writerId)||!Number.isFinite(meta.lastAttempt)||(meta.journal&&(!valid(meta.journal.record)||(meta.journal.id!==null&&!idOK(meta.journal.id)))))throw{local:true};
   }else{
    const bytes=new Uint8Array(16),crypto=scope.crypto;
    if(!crypto?.getRandomValues)throw{local:true};crypto.getRandomValues(bytes);
    meta={schemaVersion:1,writerId:Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join(''),lastAttempt:0,journal:null};await persist();
   }
   accept(readScoreRecord(await readLocal(scoreKey),rulesVersion));
   if(meta.journal)accept(meta.journal.record);
   const reconciled=await query();dirty=!!best&&!covers(remote,best);set(!reconciled?'unknown':dirty?'pending':'synced');
  }catch(e){failure(e);}finally{initialized=true;schedule();}
  return status();
 })();
 await ready;
 return{ready,observe,flush,status,dispose(){closed=true;}};
}
