import {pullAim, pullPower, cuePosition, directionLabel, projectedArrow} from './wall-gesture.mjs?v=20261101-cling-r11';
import {launchVelocity, CHARGE_TIME} from './wall-physics.mjs?v=20261101-cling-r11';
import {WallR112} from './wall-r112-physics.mjs?v=20261102-edge-r11-2';
import {createRenderer} from './wall-r112-renderer.mjs?v=20261102-edge-r11-2';
import {createTutorial,lessonCue} from './wall-tutorial.mjs?v=20261102-edge-r11-2';
import {createRunTracker,scoreStorageKey,readScoreRecord,mergeScoreRecord} from './wall-score.mjs?v=20261102-edge-r11-2';
const $=s=>document.querySelector(s),canvas=$('#scene'),wall=new WallR112();let renderer;
try{renderer=createRenderer(canvas);}catch(e){$('#error').hidden=false;$('#error').textContent='画面未能初始化：'+e.message;throw e;}
let last=0,pointer=null,keyHeld=false,overview=false,paused=false,focused=true,coverOpen=true,menuOpen=false,preview=null,previewAt=-Infinity,best=0;
const tutorial=createTutorial({read:key=>localStorage.getItem(key),write:(key,value)=>localStorage.setItem(key,value)});
const RULES_VERSION='r11.2',SCORE_KEY=scoreStorageKey(RULES_VERSION);
let personal=null,lastScoreEvent=null;
try{personal=readScoreRecord(localStorage.getItem(SCORE_KEY),RULES_VERSION);best=personal?.highestLeaf||0;}catch{}
const scores=createRunTracker({rulesVersion:RULES_VERSION,emit:event=>{lastScoreEvent=event;if(typeof CustomEvent==='function')window.dispatchEvent?.(new CustomEvent('ivy-score',{detail:event}));}});
function observeProgress(){
 const score=scores.observe(wall);tutorial.observe(wall);const next=mergeScoreRecord(personal,score,RULES_VERSION);
 if(next&&JSON.stringify(next)!==JSON.stringify(personal)){personal=next;best=personal.highestLeaf;try{localStorage.setItem(SCORE_KEY,JSON.stringify(personal));}catch{}}
}
function noteLaunch(){scores.observe(wall);tutorial.launch(wall);}
function renderTutorial(){
 const cue=!overview&&!coverOpen&&!menuOpen&&!paused&&wall.body.grounded&&!wall.grip?lessonCue(tutorial.snapshot().completed,guidance()):null;
 $('#tutorial-cue').hidden=!cue;if(!cue)return;
 $('#lesson-text').textContent=cue.text;$('#tutorial-cue').setAttribute('data-step',cue.step);
 const sx=cue.launch?18:34,ex=sx+cue.pull.x*22;
 $('#lesson-pull').setAttribute('d',`M ${sx} 5 L ${ex} 35`);
 $('#lesson-launch').setAttribute('visibility',cue.launch?'visible':'hidden');
 if(cue.launch)$('#lesson-launch').setAttribute('d',`M 57 35 L ${57+cue.launch.x*22} 5`);
}
// Module-worker replay keeps collision prediction off the animation thread.
// Unsupported workers fall back to the same throttled exact simulation.
let previewWorker=null,previewPending=false,previewToken=0;
try{if(typeof Worker==='function'){
 previewWorker=new Worker(new URL('./wall-r112-preview-worker.mjs',import.meta.url),{type:'module'});
 previewWorker.onmessage=({data})=>{if(data.token!==previewToken)return;previewPending=false;if(data.error){previewWorker?.terminate();previewWorker=null;}else if(wall.input)preview=data.preview;};
 previewWorker.onerror=()=>{previewWorker?.terminate();previewWorker=null;previewPending=false;};
}}catch{previewWorker=null;}
function requestPreview(){
 if(previewPending)return;previewAt=wall.time;
 if(previewWorker){previewPending=true;previewWorker.postMessage({token:++previewToken,state:wall,power:wall.charge,aim:wall.aimValue});}
 else preview=wall.previewRelease?.({power:wall.charge,aim:wall.aimValue})||null;
}
function aim(value){wall.aim(Number(value));}
function guidance(){return wall.guidance?.()||null;}
function render(){
 observeProgress();renderTutorial();
 $('#controls-zone').hidden=overview;$('#return-view').hidden=!overview;
 const hud=$('#hud').getBoundingClientRect(),bottom=$('#controls-zone').getBoundingClientRect();
 renderer.setViewportInsets?.({top:(hud.bottom??hud.height)+8,bottom:bottom.height+8});
 renderer.render(wall);
 const ordinal=Math.min(100,(wall.standId??wall.lastLeaf??0)+1),progress=(ordinal-1)/99*100;
 $('#height').textContent=`第 ${ordinal} / 100 片`;$('#progress').style.height=progress+'%';
 $('#best-progress').style.bottom=Math.max(0,(best-1)/99*100)+'%';$('#best-label').textContent=`最高 ${best} / 100`;
 $('#complete').hidden=!wall.completed;$('#cover').hidden=!coverOpen;$('#help-panel').hidden=!menuOpen;
 $('#pause').setAttribute('aria-pressed',String(paused));$('#pause').textContent=paused?'继续':'暂停';$('#pause').setAttribute('aria-label',paused?'继续':'暂停');
 $('#personal-time').textContent=personal?.summitSeconds!=null?`本规则最快登顶 ${personal.summitSeconds.toFixed(1)} 秒`:'';
 $('#falls').textContent=`回到根部 ${wall.falls} 次`;
 const fell=wall.feedback.type==='base'&&wall.time-(wall.feedback.time||0)<2.2;
 $('#notice').hidden=!fell;$('#notice').textContent='落回根部了 · 再瞄准近处亮叶';
 // Exact 120 Hz replay is bounded and throttled; the main live world is never mutated.
 if(wall.input&&(!preview||wall.time-previewAt>=.4)){
  requestPreview();
 }
 if(!wall.input){if(previewPending||preview)previewToken++;previewPending=false;preview=null;previewAt=-Infinity;}
 renderGesture();
}
function releasePointer(){const old=pointer;pointer=null;if(old){try{old.target.releasePointerCapture?.(old.id);}catch{ /* Already released by the browser. */ }}}
function cancel(){wall.cancel();keyHeld=false;previewToken++;previewPending=false;preview=null;previewAt=-Infinity;releasePointer();$('#gesture').hidden=true;}
function renderGesture(){
 if(pointer&&!wall.input)releasePointer();
 const visible=!!wall.input;$('#gesture').hidden=!visible;if(!visible)return;
 const rect=canvas.getBoundingClientRect(),width=rect.width,height=rect.height;
 const x=pointer?pointer.x-rect.left:width/2,y=pointer?pointer.y-rect.top:height*.72;
 const ox=pointer?pointer.startX-rect.left:x,oy=pointer?pointer.startY-rect.top:y;
 const v=launchVelocity(wall.charge*CHARGE_TIME,wall.aimValue),projection=renderer.projectLaunch?.(wall,v);
 const origin=renderer.projectGirl?.(wall),cue=cuePosition(x,y,width,height,origin);
 const hudBox=$('#hud').getBoundingClientRect(),footerBox=$('#controls-zone').getBoundingClientRect();
 cue.x=Math.max(100,Math.min(width-100,cue.x));cue.y=Math.max((hudBox.bottom??44)+48,Math.min((footerBox.top||height-100)-48,cue.y));
 const arrow=projection?projectedArrow(projection.origin,projection.tip,70):null;
 // The dotted drag belongs to the finger. The solid launch arrow belongs to the model.
 $('#gesture-line').setAttribute('x1',ox);$('#gesture-line').setAttribute('y1',oy);$('#gesture-line').setAttribute('x2',x);$('#gesture-line').setAttribute('y2',y);
 $('#gesture-arrow').setAttribute('visibility',arrow?'visible':'hidden');$('#gesture-origin').setAttribute('visibility',arrow?'visible':'hidden');
 if(arrow){$('#gesture-arrow').setAttribute('d',`M ${arrow.x1} ${arrow.y1} L ${arrow.x2} ${arrow.y2}`);$('#gesture-origin').setAttribute('cx',arrow.x1);$('#gesture-origin').setAttribute('cy',arrow.y1);}
 $('#gesture-cue').style.left=cue.x+'px';$('#gesture-cue').style.top=cue.y+'px';
 $('#gesture-cue').style.setProperty('--charge',wall.charge);
 $('#charge-number').textContent=Math.round(wall.charge*100)+'%';
 const fresh=preview&&Math.abs(preview.power-wall.charge)<.045&&Math.abs(preview.aim-wall.aimValue)<.06;
 const path=$('#flight-preview'),landing=$('#landing-preview');
 if(!fresh||!renderer.projectPoint){path.setAttribute('visibility','hidden');landing.setAttribute('visibility','hidden');return;}
 path.setAttribute('data-outcome',preview.onTarget?'target':preview.outcome);
 path.style.stroke=preview.onTarget?'#e9efc1':'#e1b69a';
 const pts=preview.points.map(p=>renderer.projectPoint(p));
 path.setAttribute('d',pts.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' '));path.setAttribute('visibility','visible');
 const hit=preview.landing&&renderer.projectPoint(preview.landing);landing.setAttribute('visibility',hit?'visible':'hidden');
 if(hit){landing.setAttribute('cx',hit.x);landing.setAttribute('cy',hit.y);}

}
function reset(){cancel();tutorial.cancelPending();scores.reset();wall.reset();coverOpen=false;menuOpen=false;paused=false;aim(0);overview=false;renderer.setOverview(false);$('#overview').setAttribute('aria-pressed','false');last=0;render();}
function begin(e){
 if(e.button!==0||e.isPrimary===false||pointer||keyHeld||overview||paused||coverOpen||menuOpen||!focused||document.hidden||!wall.down(e.clientX,0))return;
 e.preventDefault();aim(0);pointer={id:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,target:e.currentTarget};
 try{e.currentTarget.setPointerCapture?.(e.pointerId);}catch{cancel();return;}renderGesture();
}
function move(e){if(pointer?.id!==e.pointerId)return;e.preventDefault();pointer.x=e.clientX;pointer.y=e.clientY;aim(pullAim(pointer.x-pointer.startX,pointer.y-pointer.startY));wall.pull(pullPower(pointer.x-pointer.startX,pointer.y-pointer.startY,canvas.getBoundingClientRect().height));renderGesture();}
function end(e){if(pointer?.id!==e.pointerId)return;move(e);releasePointer();if(wall.up())noteLaunch();previewToken++;previewPending=false;preview=null;$('#gesture').hidden=true;}
canvas.addEventListener('pointerdown',begin);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',end);
for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(pointer?.id===e.pointerId)cancel();});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
$('#reset').addEventListener('click',reset);$('#again').addEventListener('click',reset);
function toggleOverview(){cancel();overview=!overview;menuOpen=false;paused=false;renderer.setOverview(overview);$('#overview').setAttribute('aria-pressed',String(overview));last=0;render();}
$('#overview').addEventListener('click',toggleOverview);$('#return-view').addEventListener('click',toggleOverview);
$('#start').addEventListener('click',()=>{coverOpen=false;last=0;render();});
$('#help').addEventListener('click',()=>{cancel();menuOpen=true;last=0;render();});
$('#resume').addEventListener('click',()=>{menuOpen=false;paused=false;last=0;render();});
$('#pause').addEventListener('click',()=>{cancel();paused=!paused;last=0;render();});
function isUI(target){return target?.isContentEditable||/^(INPUT|BUTTON|A|TEXTAREA|SELECT)$/.test(target?.tagName);}
window.addEventListener('keydown',e=>{
 if(e.code==='Escape'){cancel();return;}if(isUI(e.target))return;
 if(e.code==='KeyR'&&!e.repeat){reset();return;}
 if(['ArrowLeft','KeyA','ArrowRight','KeyD'].includes(e.code)){e.preventDefault();if(!pointer)aim(wall.aimValue+(['ArrowLeft','KeyA'].includes(e.code)?-.08:.08));}
 if(e.code==='Space'){e.preventDefault();if(!e.repeat&&!pointer&&!keyHeld&&!overview&&!paused&&!coverOpen&&!menuOpen&&focused&&!document.hidden)keyHeld=wall.down();}
});
window.addEventListener('keyup',e=>{if(e.code==='Space'&&keyHeld){e.preventDefault();keyHeld=false;if(wall.up())noteLaunch();previewToken++;previewPending=false;preview=null;$('#gesture').hidden=true;}});window.addEventListener('blur',()=>{focused=false;cancel();last=0;});window.addEventListener('focus',()=>{focused=true;last=0;});window.addEventListener('resize',()=>{cancel();last=0;});document.addEventListener('visibilitychange',()=>{cancel();last=0;});$('#renderer').textContent=renderer.kind;
const qaParams=new URLSearchParams(location.search),qa=qaParams.has('qa'),portraitQA=qa&&qaParams.get('portrait')==='1';let diagnostics,simulationRate=1;if(qa){diagnostics=document.createElement('div');diagnostics.style.cssText='position:absolute;left:8px;top:50%;z-index:20;background:#10271ee8;color:#fff;padding:8px;font:12px monospace;pointer-events:none';if(portraitQA){diagnostics.style.top='8px';diagnostics.style.left='8px';}document.body.append(diagnostics);const panel=document.createElement('div');panel.style.cssText='position:absolute;left:8px;top:58%;z-index:30;display:flex;gap:6px';if(portraitQA)panel.style.top='38px';const slow=document.createElement('button'),stop=document.createElement('button'),step=document.createElement('button');for(const el of [slow,stop,step]){el.style.cssText='background:#163d2f;color:#fff;border:1px solid #ccd5a8;padding:8px;font:12px sans-serif;min-width:44px;min-height:44px';panel.append(el);}slow.textContent='QA · 慢动作 0.2×';slow.setAttribute('aria-pressed','false');slow.onclick=()=>{simulationRate=simulationRate===1?.2:1;slow.setAttribute('aria-pressed',String(simulationRate<1));slow.textContent=simulationRate<1?'QA · 恢复 1×':'QA · 慢动作 0.2×';};stop.textContent='QA · 暂停';stop.onclick=()=>{cancel();paused=!paused;stop.textContent=paused?'QA · 继续':'QA · 暂停';};step.textContent='QA · 步进 0.10s';step.onclick=()=>{cancel();paused=true;stop.textContent='QA · 继续';wall.advance(.10);render();};document.body.append(panel);}let renderMs=0,frameMs=0;const frameSamples=[],renderSamples=[];function frame(now){const frameStart=performance.now();const delta=last?(now-last)/1000:0;if(delta>0){frameSamples.push(delta*1000);if(frameSamples.length>60)frameSamples.shift();}frameMs=frameSamples.reduce((a,b)=>a+b,0)/(frameSamples.length||1);if(last&&!paused&&!coverOpen&&!menuOpen&&focused&&!overview&&!document.hidden)wall.step(Math.min((now-last)/1000,.25)*simulationRate);last=now;render();renderSamples.push(performance.now()-frameStart);if(renderSamples.length>60)renderSamples.shift();renderMs=renderSamples.reduce((a,b)=>a+b,0)/renderSamples.length;if(diagnostics)diagnostics.textContent=`20261102-edge-r11-2 | ${(1000/(frameMs||1)).toFixed(1)} RAF fps / ${frameSamples.length} samples | work ${renderMs.toFixed(1)} ms | avg Δ ${frameMs.toFixed(0)} / last ${Math.round(delta*1000)} ms | sim ${wall.time.toFixed(2)} s | ${renderer.stats?.drawCalls||0} atlas draws | ${renderer.stats?.supportsVisible||0} visible supports`;requestAnimationFrame(frame);}render();requestAnimationFrame(frame);
window.__ivyWall={wall,renderer,render,reset,aim,guidance,pause(value=true){cancel();paused=value;},step(seconds){wall.advance(seconds);render();},preview(){return preview;},uiState(){return {coverOpen,menuOpen,paused,overview,tutorial:tutorial.snapshot(),score:scores.snapshot(),lastScoreEvent};},snapshot(){return wall.snapshot();}};
