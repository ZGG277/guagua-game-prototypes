(function(){
'use strict';
var busy=false, key='durian-assassin-v101-best', cache=null, nativeReady=false;
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

async function share(){var s=window.survival, button=document.getElementById('share'),status=document.getElementById('share-status');if(busy||!s||!s.gameOver)return false;var m=api();if(!m||typeof m.postNote!=='function'){status.textContent='请在小红书中打开分享';return false;}busy=true;button.disabled=true;status.textContent='';try{var score=window.DurianShare.snapshot(s);var data=await window.DurianShare.render(score);var file=data;if(typeof m.writeTempFile==='function'){var r=await m.writeTempFile({data:data});if(!r||!r.filePath)throw Error('没有生成分享图片');file=r.filePath;}await m.postNote({title:'榴莲刺客｜接住'+score.whole+'颗',content:window.DurianShare.caption(score),pageType:'photo_publish',mediaInfo:{image_resources:[{url:file}]}});return true;}catch(e){status.textContent=e&&e.message==='分享图片未加载，请再试一次'?e.message:'未完成分享，可再试一次';return false;}finally{busy=false;button.disabled=false;}}
window.DurianPlatform={readBest:read,saveBest:save,share:share,fit:fit,layout:layout};
document.getElementById('share').addEventListener('click',share);window.addEventListener('resize',fit);initStorage();fit();
})();
