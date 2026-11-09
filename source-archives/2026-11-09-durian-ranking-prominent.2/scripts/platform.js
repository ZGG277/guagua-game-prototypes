(function(){
'use strict';
var activeShare=null, shareSequence=0, key='durian-assassin-v101-best', cache=null, nativeReady=false;
function api(){return window.xhs&&window.xhs.miniTool;}
async function version(){var x=window.xhs,o=x&&x.launchOptions;try{if(!o&&api()&&api().getLaunchOptions)o=await api().getLaunchOptions();}catch(e){}return Math.floor(Number(o&&o.miniToolEnv&&o.miniToolEnv.buildVersion||0)/1000);}
function valid(r){return r&&Number.isFinite(r.coins)&&Number.isInteger(r.whole)&&r.whole>=0;}
async function initStorage(){var m=api();nativeReady=await version()>=9460&&!!m&&typeof m.getStorage==='function'&&typeof m.setStorage==='function';if(nativeReady){try{var r=await m.getStorage({key:key});cache=r&&r.data?JSON.parse(r.data):null;}catch(e){cache=null;}}else{try{cache=JSON.parse(localStorage.getItem(key)||'null');}catch(e){cache=null;}}if(!valid(cache))cache=null;if(cache&&window.survival){var old=window.survival.best;if(!old||cache.coins>old.coins||(cache.coins===old.coins&&cache.whole>old.whole))window.survival.best=cache;}}
function read(){return cache;}
function save(value){cache=value;var m=api();if(nativeReady){m.setStorage({key:key,data:JSON.stringify(value)}).catch(function(){});}else{try{localStorage.setItem(key,JSON.stringify(value));}catch(e){}}}
function layout(info){
 var w=Number(info&&info.windowWidth)||Number(window.innerWidth)||390;
 var h=Number(info&&info.windowHeight)||Number(window.innerHeight)||844;
 var safe=info&&info.safeArea||{}, safeTop=Math.max(0,Number(safe.top)||0);
 var width=Math.min(176,w-32),left=(w-width)/2,top=safeTop+8;
 var buttons=info&&info.menuButtons,boxes=[];
 if(buttons){Object.keys(buttons).forEach(function(k){var q=buttons[k];if(q&&Number.isFinite(q.left)&&Number.isFinite(q.right)&&Number.isFinite(q.top)&&Number.isFinite(q.bottom))boxes.push(q);});}
 else top=safeTop+(w>h?60:96);
 // Preserve a centered island. If either native side intrudes, put it below that row.
 boxes.forEach(function(q){if(left<q.right+8&&left+width>q.left-8&&top<q.bottom+8&&top+44>q.top-8)top=Math.max(top,q.bottom+8);});
 return {left:left,width:width,top:top,height:44,windowHeight:h,bottom:Math.max(0,h-(Number(safe.bottom)||h))};
}
function applyLayout(info){var r=layout(info),style=document.documentElement.style;style.setProperty('--app-height',r.windowHeight+'px');style.setProperty('--hud-offset',r.top+'px');style.setProperty('--hud-width',r.width+'px');style.setProperty('--safe-area-inset-bottom',r.bottom+'px');return r;}
async function fit(){applyLayout(null);var m=api();if(await version()<9490||!m||typeof m.getWindowInfo!=='function')return;try{applyLayout(await m.getWindowInfo());}catch(e){}}

function element(id){return document.getElementById(id);}
function shareUI(pending,message){
 var button=element('share'),back=element('share-cancel'),status=element('share-status');
 if(button){button.disabled=!!pending;button.textContent=pending?'准备分享…':'分享本局';}
 if(back)back.hidden=!pending;
 if(status&&message!==undefined)status.textContent=message;
}
function shareError(code,message){var error=new Error(message||code);error.shareCode=code;return error;}
function current(request){return activeShare===request&&window.survival===request.session&&request.session.gameOver&&request.session.totals===request.totals;}
function ensureCurrent(request){if(!current(request))throw shareError('stale');}
function waitFor(request,value,milliseconds,code){
 return new Promise(function(resolve,reject){
  var done=false,timer=setTimeout(function(){finish(shareError(code));},milliseconds);
  function finish(error,result){
   if(done)return;done=true;clearTimeout(timer);
   if(request.abort===abort)request.abort=null;
   if(error)reject(error);else resolve(result);
  }
  function abort(){finish(shareError('cancelled'));}
  request.abort=abort;
  Promise.resolve(value).then(function(result){finish(null,result);},function(error){finish(error);});
 });
}
function cancelShare(reason){
 var request=activeShare;
 if(!request){if(reason==='restart')shareUI(false,'');return false;}
 activeShare=null;
 if(request.abort)request.abort();
 var message=reason==='restart'?'':reason==='background'?'分享已暂停，回来后可重试':request.phase==='posting'?'已返回本局，笔记状态请以小红书为准':'已返回本局，可重新分享或再来一局';
 shareUI(false,message);
 return true;
}
async function share(){
 var s=window.survival;
 if(activeShare||!s||!s.gameOver)return false;
 var m=api();
 if(!m||typeof m.postNote!=='function'){shareUI(false,'请在小红书中打开分享');return false;}
 var request={id:++shareSequence,session:s,totals:s.totals,phase:'preparing',abort:null,wasAway:false};
 activeShare=request;
 shareUI(true,'正在生成本局战绩，仍可返回或再来一局');
 try{
  var helper=window.DurianShare;
  if(!helper)throw shareError('missing');
  var score=helper.snapshot(s);
  var data=await waitFor(request,helper.render(score),10000,'render-timeout');
  ensureCurrent(request);
  if(document.hidden)throw shareError('background');
  if(typeof data!=='string'||!/^data:image\/(jpeg|png);base64,/.test(data))throw shareError('image');
  var title=String(helper.title||'榴莲刺客｜本局战绩').slice(0,20),content=helper.caption(score);
  if(typeof content!=='string'||content.length>1000)throw shareError('content');
  request.phase='posting';
  var button=element('share');if(button)button.textContent='分享中…';
  var status=element('share-status');if(status)status.textContent='请在小红书中完成或取消分享，返回后可继续游戏';
  // postNote accepts a data URI directly. Sharing does not require album permission
  // or the separate writeTempFile API, and never publishes without the user's UI.
  var operation=m.postNote({title:title,content:content,pageType:'photo_publish',mediaInfo:{image_resources:[{url:data}]}});
  if(!operation||typeof operation.then!=='function')throw shareError('bridge');
  var result=await waitFor(request,operation,15000,'post-timeout');
  ensureCurrent(request);
  if(result&&result.errMsg&&/(:fail|cancel|取消)/i.test(result.errMsg))throw result;
  shareUI(false,'分享流程已结束，可再来一局');
  return true;
 }catch(error){
  if(activeShare!==request)return false;
  // A restarted session must not receive any message or result from its old share.
  if(!current(request)){shareUI(false,'');return false;}
  var code=error&&error.shareCode,detail=String(error&&(error.errMsg||error.message)||'');
  var message='未完成分享，可重试或再来一局';
  if(code==='render-timeout')message='生成战绩超时，可重试或再来一局';
  else if(code==='post-timeout')message='分享暂未返回，可重试或再来一局；笔记状态请以小红书为准';
  else if(code==='background')message='分享已暂停，回来后可重试';
  else if(/cancel|取消/i.test(detail))message='已取消分享，可重试或再来一局';
  else if(/分享图片|导出分享|生成分享/.test(detail))message=detail;
  shareUI(false,message);
  return false;
 }finally{
  if(activeShare===request){activeShare=null;shareUI(false);}
 }
}
function leaveShare(){
 if(!activeShare)return;
 if(activeShare.phase==='preparing')cancelShare('background');
 else activeShare.wasAway=true;
}
function returnShare(){if(activeShare&&activeShare.wasAway)cancelShare('return');}
window.DurianPlatform={readBest:read,saveBest:save,share:share,cancelShare:cancelShare,fit:fit,layout:layout};
var shareButton=element('share'),backButton=element('share-cancel');
if(shareButton)shareButton.addEventListener('click',share);
if(backButton)backButton.addEventListener('click',function(){cancelShare('back');});
['start','demo'].forEach(function(id){var button=element(id);if(button)button.addEventListener('click',function(){cancelShare('restart');},true);});
if(document.addEventListener)document.addEventListener('visibilitychange',function(){if(document.hidden)leaveShare();else returnShare();});
window.addEventListener('pagehide',leaveShare);
window.addEventListener('pageshow',returnShare);
window.addEventListener('blur',function(){if(activeShare&&activeShare.phase==='posting')activeShare.wasAway=true;});
window.addEventListener('focus',returnShare);
window.addEventListener('resize',fit);initStorage();fit();
})();
