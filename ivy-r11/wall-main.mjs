import {pullAim, pullPower, cuePosition, directionLabel, pullInstruction, gestureVector, projectedArrow} from './wall-gesture.mjs?v=20261101-cling-r11';
import {Wall, launchVelocity, CHARGE_TIME} from './wall-physics.mjs?v=20261101-cling-r11';
import {createRenderer} from './wall-cling-renderer.mjs?v=20261101-cling-r11';
const $=s=>document.querySelector(s),canvas=$('#scene'),wall=new Wall({hundred:true});let renderer;
try{renderer=createRenderer(canvas);}catch(e){$('#error').hidden=false;$('#error').textContent='画面未能初始化：'+e.message;throw e;}
let last=0,pointer=null,keyHeld=false,overview=false,paused=false,focused=true;let learnedFirstJump=false,coverOpen=true,menuOpen=false,idleKey=null,idleGuidance=null,preview=null,previewAt=-Infinity,best=0;
try{best=Number(localStorage.getItem("ivy-best-r11"))||0;}catch{}
// Module-worker replay keeps collision prediction off the animation thread.
// Unsupported workers fall back to the same throttled exact simulation.
let previewWorker=null,previewPending=false,previewToken=0;
try{if(typeof Worker==='function'){
 previewWorker=new Worker(new URL('./wall-cling-preview-worker.mjs',import.meta.url),{type:'module'});
 previewWorker.onmessage=({data})=>{if(data.token!==previewToken)return;previewPending=false;if(data.error){previewWorker?.terminate();previewWorker=null;}else if(wall.input)preview=data.preview;};
 previewWorker.onerror=()=>{previewWorker?.terminate();previewWorker=null;previewPending=false;};
}}catch{previewWorker=null;}
function requestPreview(){
 if(previewPending)return;previewAt=wall.time;
 if(previewWorker){previewPending=true;previewWorker.postMessage({token:++previewToken,state:wall,power:wall.charge,aim:wall.aimValue});}
 else preview=wall.previewRelease?.({power:wall.charge,aim:wall.aimValue})||null;
}
const names={perching:'屈身贴叶 · 准备跳离',clinging:'手脚贴叶 · 稳住重心',clambering:'手拉脚蹬 · 攀稳陡叶',reaching:'伸手够叶缘 · 脚下先站稳',catching:'抓住叶缘 · 双臂承重',hanging:'抓稳 · 准备翻上',climbing:'手拉脚蹬 · 翻上叶面',grounded:'在叶心站稳',charging:'压低重心 · 准备跃起',anticipation:'压低重心 · 准备跃起',rising:'跃起 · 越过叶缘',falling:'收住动作 · 找准叶心',impact:'触叶 · 吸收冲击',landing:'触叶 · 吸收冲击',recovery:'站稳 · 恢复平衡',balancing:'叶面下垂 · 准备下一跳',sliding:'正在下滑 · 尽快松手跃起',slipping:'失去支撑 · 寻找下方叶片',celebrate:'你到了，光里。'};
function aim(value){wall.aim(Number(value));}
function guidance(){return wall.guidance?.()||null;}
// Idle coaching is captured once on each perch. Bending does not turn a
// stationary hint into a moving power target. Live predictions are opt-in drag UI.
function stableGuidance(){
 const key=wall.body.grounded?`${wall.falls}:${wall.standId}`:null;
 if(key!==idleKey){idleKey=key;idleGuidance=key?guidance():null;}
 return idleGuidance;
}
function render(){
 const rect=canvas.getBoundingClientRect(),hud=$('#hud').getBoundingClientRect(),bottom=$('#controls-zone').getBoundingClientRect();
 renderer.setViewportInsets?.({top:(hud.bottom??hud.height)+8,bottom:bottom.height+8});
 renderer.render(wall);
 const ordinal=Math.min(100,(wall.standId??wall.lastLeaf??0)+1),progress=(ordinal-1)/99*100;
 $('#height').textContent=`第 ${ordinal} / 100 片`;$('#progress').style.height=progress+'%';
 const reached=(wall.bestLeafId??(wall.body.grounded?wall.standId:0))+1;
 if(reached>best){best=reached;try{localStorage.setItem('ivy-best-r11',String(best));}catch{}}
 $('#best-progress').style.bottom=Math.max(0,(best-1)/99*100)+'%';$('#best-label').textContent=`最高 ${best} / 100`;
 $('#phase').textContent=names[wall.body.phase]||'在叶间';
 $('#complete').hidden=!wall.completed;$('#cover').hidden=!coverOpen;$('#help-panel').hidden=!menuOpen;
 $('#pause').setAttribute('aria-pressed',String(paused));$('#pause').textContent=paused?'继续':'暂停';$('#pause').setAttribute('aria-label',paused?'继续':'暂停');
 $('#falls').textContent=`回到根部 ${wall.falls} 次`;
 if(wall.body.grounded&&wall.standId>0)learnedFirstJump=true;
 const g=stableGuidance(),first=!learnedFirstJump&&wall.standId===0&&!overview;
 $('#controls-zone').hidden=overview;$('#return-view').hidden=!overview;
 $('#first-guide').hidden=!first;
 $('#route-tip').hidden=first||overview||!g||!wall.body.grounded;
 if(g){
  const power=Math.round(g.power*100),pull=pullInstruction(g.aim);
  $('#first-pull').textContent=`${pull} · 约 ${power}% 力度`;
  $('#first-launch').textContent=`松手${directionLabel(g.aim).replace(/[↑↖↗] /,'')}，落在近处宽叶心`;
  $('#route-tip').textContent=wall.standId===1?`第二跳：${pull} · 拖动查看落点`:`下一片：${pull} · 拖动查看落点`;
  const v=gestureVector(g.aim,g.power,rect.height),len=Math.hypot(v.dx,v.dy)||1;
  $('#guide-pull-path').setAttribute('d',`M 22 10 L ${22+v.dx/len*34} ${10+v.dy/len*34}`);
 }
 const fell=wall.feedback.type==='base'&&wall.time-(wall.feedback.time||0)<2.2;
 $('#notice').hidden=!fell;$('#notice').textContent='落回根部了 · 再瞄准近处亮叶';
 $('#hint').textContent=overview?'整面墙只供观察':wall.body.phase==='sliding'?(wall.input?'拉住时也会滑 · 力度够了就松手':'叶面正向下倾 · 现在下拉，及时跳离'):wall.input?'虚线是松手落点预览 · 拉住时仍会滑':wall.body.hands?.length?'手脚贴紧陡叶 · 抓力会减弱，及时下拉跳离':'下拉瞄准 · 长度定力度 · 松手跳';
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
 $('#direction').textContent=directionLabel(wall.aimValue);
 const fresh=preview&&Math.abs(preview.power-wall.charge)<.045&&Math.abs(preview.aim-wall.aimValue)<.06;
 const prediction=$('#prediction'),path=$('#flight-preview'),landing=$('#landing-preview');
 if(!fresh||!renderer.projectPoint){prediction.textContent='当前力度 · 正在更新落点…';path.setAttribute('visibility','hidden');landing.setAttribute('visibility','hidden');return;}
 prediction.textContent=preview.onTarget?'预计落到下一片 ✓':preview.outcome==='land'?'预计落到另一片亮叶':preview.outcome==='return'?'预计回到脚下 · 再调力度':preview.outcome==='lower'?'预计落到下方 · 还需调整':'预计够不到 · 调整角度与力度';
 const pts=preview.points.map(p=>renderer.projectPoint(p));
 path.setAttribute('d',pts.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' '));path.setAttribute('visibility','visible');
 const hit=preview.landing&&renderer.projectPoint(preview.landing);landing.setAttribute('visibility',hit?'visible':'hidden');
 if(hit){landing.setAttribute('cx',hit.x);landing.setAttribute('cy',hit.y);}

}
function reset(){cancel();wall.reset();idleKey=null;idleGuidance=null;coverOpen=false;menuOpen=false;paused=false;aim(0);overview=false;renderer.setOverview(false);$('#overview').setAttribute('aria-pressed','false');last=0;render();}
function begin(e){
 if(e.button!==0||e.isPrimary===false||pointer||keyHeld||overview||paused||coverOpen||menuOpen||!focused||document.hidden||!wall.down(e.clientX,0))return;
 e.preventDefault();aim(0);pointer={id:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,target:e.currentTarget};
 try{e.currentTarget.setPointerCapture?.(e.pointerId);}catch{cancel();return;}renderGesture();
}
function move(e){if(pointer?.id!==e.pointerId)return;e.preventDefault();pointer.x=e.clientX;pointer.y=e.clientY;aim(pullAim(pointer.x-pointer.startX,pointer.y-pointer.startY));wall.pull(pullPower(pointer.x-pointer.startX,pointer.y-pointer.startY,canvas.getBoundingClientRect().height));renderGesture();}
function end(e){if(pointer?.id!==e.pointerId)return;move(e);releasePointer();wall.up();previewToken++;previewPending=false;preview=null;$('#gesture').hidden=true;}
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
window.addEventListener('keyup',e=>{if(e.code==='Space'&&keyHeld){e.preventDefault();keyHeld=false;wall.up();previewToken++;previewPending=false;preview=null;$('#gesture').hidden=true;}});window.addEventListener('blur',()=>{focused=false;cancel();last=0;});window.addEventListener('focus',()=>{focused=true;last=0;});window.addEventListener('resize',()=>{cancel();last=0;});document.addEventListener('visibilitychange',()=>{cancel();last=0;});$('#renderer').textContent=renderer.kind;
const qaParams=new URLSearchParams(location.search),qa=qaParams.has('qa'),portraitQA=qa&&qaParams.get('portrait')==='1';let diagnostics,simulationRate=1;if(qa){diagnostics=document.createElement('div');diagnostics.style.cssText='position:absolute;left:8px;top:50%;z-index:20;background:#10271ee8;color:#fff;padding:8px;font:12px monospace;pointer-events:none';if(portraitQA){diagnostics.style.top='8px';diagnostics.style.left='8px';}document.body.append(diagnostics);const panel=document.createElement('div');panel.style.cssText='position:absolute;left:8px;top:58%;z-index:30;display:flex;gap:6px';if(portraitQA)panel.style.top='38px';const slow=document.createElement('button'),stop=document.createElement('button'),step=document.createElement('button');for(const el of [slow,stop,step]){el.style.cssText='background:#163d2f;color:#fff;border:1px solid #ccd5a8;padding:8px;font:12px sans-serif;min-width:44px;min-height:44px';panel.append(el);}slow.textContent='QA · 慢动作 0.2×';slow.setAttribute('aria-pressed','false');slow.onclick=()=>{simulationRate=simulationRate===1?.2:1;slow.setAttribute('aria-pressed',String(simulationRate<1));slow.textContent=simulationRate<1?'QA · 恢复 1×':'QA · 慢动作 0.2×';};stop.textContent='QA · 暂停';stop.onclick=()=>{cancel();paused=!paused;stop.textContent=paused?'QA · 继续':'QA · 暂停';};step.textContent='QA · 步进 0.10s';step.onclick=()=>{cancel();paused=true;stop.textContent='QA · 继续';wall.advance(.10);render();};document.body.append(panel);}let renderMs=0,frameMs=0;const frameSamples=[],renderSamples=[];function frame(now){const frameStart=performance.now();const delta=last?(now-last)/1000:0;if(delta>0){frameSamples.push(delta*1000);if(frameSamples.length>60)frameSamples.shift();}frameMs=frameSamples.reduce((a,b)=>a+b,0)/(frameSamples.length||1);if(last&&!paused&&!coverOpen&&!menuOpen&&focused&&!overview&&!document.hidden)wall.step(Math.min((now-last)/1000,.25)*simulationRate);last=now;render();renderSamples.push(performance.now()-frameStart);if(renderSamples.length>60)renderSamples.shift();renderMs=renderSamples.reduce((a,b)=>a+b,0)/renderSamples.length;if(diagnostics)diagnostics.textContent=`20261101-cling-r11 | ${(1000/(frameMs||1)).toFixed(1)} RAF fps / ${frameSamples.length} samples | work ${renderMs.toFixed(1)} ms | avg Δ ${frameMs.toFixed(0)} / last ${Math.round(delta*1000)} ms | sim ${wall.time.toFixed(2)} s | ${renderer.stats?.drawCalls||0} atlas draws | ${renderer.stats?.supportsVisible||0} visible supports`;requestAnimationFrame(frame);}render();requestAnimationFrame(frame);
window.__ivyWall={wall,renderer,render,reset,aim,guidance,pause(value=true){cancel();paused=value;},step(seconds){wall.advance(seconds);render();},preview(){return preview;},uiState(){return {coverOpen,menuOpen,paused,overview};},snapshot(){return wall.snapshot();}};
