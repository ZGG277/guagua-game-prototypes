/** Public xhs.miniTool API only. No SDK download, network or user-profile storage.
 * Spec checked 2026-11-03: https://miniapp-sandbox.xiaohongshu.com/minitool/doc */
export const RANK_MIN_VERSION=9510,STORAGE_MIN_VERSION=9460;
export function apiOf(scope){return scope.xhs&&scope.xhs.miniTool;}
export async function buildVersion(scope){
 const read=v=>Number(v&&v.miniToolEnv&&v.miniToolEnv.buildVersion)||0;
 const sync=read(scope.xhs&&scope.xhs.launchOptions);if(sync)return sync;
 const api=apiOf(scope);if(!api||typeof api.getLaunchOptions!=='function')return 0;
 try{return read(await bounded(api.getLaunchOptions({})));}catch{return 0;}
}
export function bounded(promise,ms=1800){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject({errMsg:'platform timeout',uncertain:true}),ms);Promise.resolve(promise).then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});});}
export async function createLocalStore(scope,keys,merge=(key,remote,local)=>remote===null?local:remote){
 const memory=new Map(),dirty=new Map(),errors=new Map(),unread=new Set(),api=apiOf(scope),version=await buildVersion(scope);
 const native=Math.floor(version/1000)>=STORAGE_MIN_VERSION&&api&&typeof api.getStorage==='function'&&typeof api.setStorage==='function';
 let pending=Promise.resolve(),scheduled=null;
 const localRead=key=>{try{return scope.localStorage.getItem(key);}catch{return null;}};
 await Promise.all(keys.map(async key=>{
  const local=localRead(key);
  if(!native){memory.set(key,local);return;}
  try{const res=await bounded(api.getStorage({key}));const remote=typeof res.data==='string'?res.data:null;const combined=merge(key,remote,local);memory.set(key,combined);if(combined!==null&&combined!==remote)dirty.set(key,combined);}
  catch(e){memory.set(key,local);errors.set(key,e);unread.add(key);}
 }));
 async function flush(){
  if(scheduled){clearTimeout(scheduled);scheduled=null;}
  const entries=Array.from(dirty);dirty.clear();
  pending=pending.then(async()=>{for(const [key,value]of entries){let data=value;try{
   // Never overwrite a native record that failed to load. Reconcile first.
   if(native&&unread.has(key)){const old=await bounded(api.getStorage({key}));data=merge(key,typeof old.data==='string'?old.data:null,data);memory.set(key,data);unread.delete(key);}
   if(native)await bounded(api.setStorage({key,data}));else scope.localStorage.setItem(key,data);errors.delete(key);
  }catch(e){errors.set(key,e);}}});
  await pending;return errors.size===0;
 }
 const store={native:!!native,version,read:key=>memory.get(key)||null,write(key,data){if(typeof data!=='string')return false;memory.set(key,data);dirty.set(key,data);if(!scheduled)scheduled=setTimeout(()=>{scheduled=null;void flush();},300);return true;},flush,status(){return{backend:native?'xhs-storage':'browser-storage',saved:errors.size===0&&dirty.size===0,errors:errors.size};}};
 if(dirty.size)await flush();return store;
}
export const RANK_BOARDS=Object.freeze({leaves:1,speed:2});
export function rankScore(record,board){
 if(board===1)return Number.isInteger(record.highestLeaf)&&record.highestLeaf>=1&&record.highestLeaf<=100?record.highestLeaf:null;
 // The platform sorts descending. Negative elapsed seconds rank faster summits
 // first without truncation, collision-prone composite numbers, or a time cap.
 const t=record.summitSeconds;return board===2&&record.completed&&record.highestLeaf===100&&Number.isFinite(t)&&t>=0&&t<=1000000?-t:null;
}
export function createRanks(scope,{now=()=>Date.now(),sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const api=apiOf(scope),cache=new Map();let available=false,disabled=false,version=0;
 const methods=['submitScore','getRankList','getMyRank'];
 const ready=buildVersion(scope).then(v=>{version=v;available=Math.floor(v/1000)>=RANK_MIN_VERSION&&!!api&&methods.every(k=>typeof api[k]==='function');return available;});
 function code(e){return e&&e.errCode;}
 function denied(e){if([1005,1006,10003].includes(code(e))){disabled=true;available=false;}return e;}
 async function read(method,options){
  for(let attempt=0;;attempt++){try{return await bounded(api[method](options));}catch(e){denied(e);if(code(e)!==2002||attempt>=3)throw e;await sleep([500,1000,2000][attempt]);}}
 }
 return{ready,available:()=>available&&!disabled,version:()=>version,
  async list(board=1,period='all'){
   await ready;if(!available||disabled)return{status:'unavailable'};
   if(![1,2].includes(board)||!['all','month','week','day'].includes(period))throw new RangeError('invalid board/period');
   const key=board+':'+period,old=cache.get(key);if(old&&now()-old.time<30000)return old.value;
   try{const [list,mine]=await Promise.all([read('getRankList',{board,period}),read('getMyRank',{board,period})]);
    if(!Array.isArray(list.data)||!['EXACT','OVER_LIMIT','NO_SCORE','NOT_PARTICIPATING'].includes(mine.status))throw{errMsg:'invalid rank response'};
    const value={status:'ok',data:list.data,mine};cache.set(key,{time:now(),value});return value;
   }catch(e){return{status:disabled?'unavailable':code(e)===2002?'preparing':'error',error:code(e)||null};}
  },
  async submit(record){
   await ready;if(!available||disabled)return{status:'unavailable'};
   const result=[];
   for(const board of [1,2]){const score=rankScore(record,board);if(score===null)continue;
    try{const res=await bounded(api.submitScore({board,score}));if(!Number.isFinite(res.score))throw{errMsg:'invalid score response'};cache.clear();result.push({board,status:'ok',score:res.score});}
    catch(e){denied(e);result.push({board,status:disabled?'unavailable':e&&e.uncertain||code(e)===2004?'unknown':'error',error:code(e)||null});if(disabled)break;}
   }
   return{status:result.length&&result.every(v=>v.status==='ok')?'ok':disabled?'unavailable':result.some(v=>v.status==='unknown')?'unknown':'error',boards:result};
  }
 };
}
export async function applyWindowInsets(scope,version){
 const api=apiOf(scope);if(Math.floor(version/1000)<9490||!api||typeof api.getWindowInfo!=='function')return false;
 try{const info=await bounded(api.getWindowInfo({})),root=scope.document.documentElement,rect=info.safeArea;
  if(!rect||!Number.isFinite(info.windowWidth)||!Number.isFinite(info.windowHeight))return false;
  const insets={top:rect.top,left:rect.left,right:info.windowWidth-rect.right,bottom:info.windowHeight-rect.bottom};
  for(const side of Object.keys(insets))if(Number.isFinite(insets[side]))root.style.setProperty('--safe-area-inset-'+side,Math.max(0,insets[side])+'px');
  const buttons=info.menuButtons||{};let top=Math.max(0,rect.top||0);
  Object.keys(buttons).forEach(k=>{const b=buttons[k];if(b&&Number.isFinite(b.bottom)&&b.top<info.windowHeight*.35)top=Math.max(top,b.bottom+8);});
  root.style.setProperty('--game-header-top',top+'px');root.classList.add('xhs-window');return true;
 }catch{return false;}
}
