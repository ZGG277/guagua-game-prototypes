import {pullAim, pullPower, cuePosition, directionLabel, pullInstruction, gestureVector, projectedArrow} from './wall-gesture.mjs?v=20261101-ink-r9';
import {Wall, launchVelocity, CHARGE_TIME} from './wall-physics.mjs?v=20261101-ink-r9';
import {createRenderer} from './wall-renderer.mjs?v=20261101-ink-r9';
const $=s=>document.querySelector(s),canvas=$('#scene'),wall=new Wall({novice:true});let renderer;
try{renderer=createRenderer(canvas,new URLSearchParams(location.search).get('renderer')==='software');}catch(e){$('#error').hidden=false;$('#error').textContent='画面未能初始化：'+e.message;throw e;}
let last=0,pointer=null,keyHeld=false,overview=false,paused=false,focused=true;let learnedFirstJump=false;
const names={reaching:'伸手够叶缘 · 脚下先站稳',catching:'抓住叶缘 · 双臂承重',hanging:'抓稳 · 准备翻上',climbing:'手拉脚蹬 · 翻上叶面',grounded:'在叶心站稳',charging:'压低重心 · 准备跃起',anticipation:'压低重心 · 准备跃起',rising:'跃起 · 越过叶缘',falling:'收住动作 · 找准叶心',impact:'触叶 · 吸收冲击',landing:'触叶 · 吸收冲击',recovery:'站稳 · 恢复平衡',balancing:'叶面下垂 · 准备下一跳',sliding:'正在下滑 · 尽快松手跃起',slipping:'失去支撑 · 寻找下方叶片',celebrate:'你到了，光里。'};
function aim(value){wall.aim(Number(value));}
function guidance(){return wall.guidance?.()||null;}
function render(){
 renderer.render(wall);$('#height').textContent=Math.round(wall.progress*100)+'%';$('#progress').style.width=wall.progress*100+'%';
 $('#phase').textContent=names[wall.body.phase]||'在叶间';renderGesture();$('#complete').hidden=!wall.completed;
 $('#falls').textContent=wall.falls?`回到根部 ${wall.falls} 次 · 近处叶心更稳`:'真实曲面 · 水墨新手路线';
 if(wall.body.grounded&&wall.standId>0)learnedFirstJump=true;
 const g=guidance(),first=!learnedFirstJump&&wall.standId===0&&!overview;
 $('#first-guide').hidden=!first;
 $('#route-tip').hidden=first||overview||!g||!wall.body.grounded;
 if(g){
  const power=Math.round(g.power*100),pull=pullInstruction(g.aim);
  $('#first-pull').textContent=`${pull} · 约 ${power}% 力度`;
  $('#first-launch').textContent=`松手${directionLabel(g.aim).replace(/[↑↖↗] /,'')}，落在近处宽叶心`;
  $('#route-tip').textContent=`下一片：${pull} · 约 ${power}% · 松手跳`;
  const v=gestureVector(g.aim,g.power,canvas.getBoundingClientRect().height),len=Math.hypot(v.dx,v.dy)||1;
  $('#guide-pull-path').setAttribute('d',`M 22 10 L ${22+v.dx/len*34} ${10+v.dy/len*34}`);
 }
 $('#hint').textContent=overview?'整面墙只供观察 · 再点一次回到女孩身后':wall.body.phase==='sliding'?(wall.input?'拉住时也会滑 · 力度够了就松手':'叶面正向下倾 · 现在下拉，及时跳离'):wall.input?'下拉方向与跳跃相反 · 长度定力度 · 松手跳':wall.feedback.type==='base'?'落回根部了。跟随下方提示，轻拉到近处叶心。':g?.clamberAlternative?`这片也可双手攀上：${pullInstruction(g.clamberAlternative.aim)}至 ${Math.round(g.clamberAlternative.power*100)}% 后松手`:'单指向下斜拉 · 长度定力度 · 松手向反方向跳';
}
function releasePointer(){const old=pointer;pointer=null;if(old){try{old.target.releasePointerCapture?.(old.id);}catch{ /* Already released by the browser. */ }}}
function cancel(){wall.cancel();keyHeld=false;releasePointer();$('#gesture').hidden=true;}
function renderGesture(){
 if(pointer&&!wall.input)releasePointer();
 const visible=!!wall.input;$('#gesture').hidden=!visible;if(!visible)return;
 const rect=canvas.getBoundingClientRect(),width=rect.width,height=rect.height;
 const x=pointer?pointer.x-rect.left:width/2,y=pointer?pointer.y-rect.top:height*.72;
 const ox=pointer?pointer.startX-rect.left:x,oy=pointer?pointer.startY-rect.top:y;
 const v=launchVelocity(wall.charge*CHARGE_TIME,wall.aimValue),projection=renderer.projectLaunch?.(wall,v);
 const origin=renderer.projectGirl?.(wall),cue=cuePosition(x,y,width,height,origin);
 const arrow=projection?projectedArrow(projection.origin,projection.tip,70):null;
 // The dotted drag belongs to the finger. The solid launch arrow belongs to the model.
 $('#gesture-line').setAttribute('x1',ox);$('#gesture-line').setAttribute('y1',oy);$('#gesture-line').setAttribute('x2',x);$('#gesture-line').setAttribute('y2',y);
 $('#gesture-arrow').setAttribute('visibility',arrow?'visible':'hidden');$('#gesture-origin').setAttribute('visibility',arrow?'visible':'hidden');
 if(arrow){$('#gesture-arrow').setAttribute('d',`M ${arrow.x1} ${arrow.y1} L ${arrow.x2} ${arrow.y2}`);$('#gesture-origin').setAttribute('cx',arrow.x1);$('#gesture-origin').setAttribute('cy',arrow.y1);}
 $('#gesture-cue').style.left=cue.x+'px';$('#gesture-cue').style.top=cue.y+'px';
 $('#gesture-cue').style.setProperty('--charge',wall.charge);
 $('#charge-number').textContent=Math.round(wall.charge*100)+'%';
 $('#direction').textContent=directionLabel(wall.aimValue);
}
function reset(){cancel();wall.reset();aim(0);overview=false;renderer.setOverview(false);$('#overview').setAttribute('aria-pressed','false');last=0;render();}
function begin(e){
 if(e.button!==0||e.isPrimary===false||pointer||keyHeld||overview||paused||!focused||document.hidden||!wall.down(e.clientX,0))return;
 e.preventDefault();aim(0);pointer={id:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,target:e.currentTarget};
 try{e.currentTarget.setPointerCapture?.(e.pointerId);}catch{cancel();return;}renderGesture();
}
function move(e){if(pointer?.id!==e.pointerId)return;e.preventDefault();pointer.x=e.clientX;pointer.y=e.clientY;aim(pullAim(pointer.x-pointer.startX,pointer.y-pointer.startY));wall.pull(pullPower(pointer.x-pointer.startX,pointer.y-pointer.startY,canvas.getBoundingClientRect().height));renderGesture();}
function end(e){if(pointer?.id!==e.pointerId)return;move(e);releasePointer();wall.up();$('#gesture').hidden=true;}
canvas.addEventListener('pointerdown',begin);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',end);
for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(pointer?.id===e.pointerId)cancel();});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
$('#reset').addEventListener('click',reset);$('#again').addEventListener('click',reset);
$('#overview').addEventListener('click',()=>{cancel();overview=!overview;renderer.setOverview(overview);$('#overview').setAttribute('aria-pressed',String(overview));render();});
function isUI(target){return target?.isContentEditable||/^(INPUT|BUTTON|A|TEXTAREA|SELECT)$/.test(target?.tagName);}
window.addEventListener('keydown',e=>{
 if(e.code==='Escape'){cancel();return;}if(isUI(e.target))return;
 if(e.code==='KeyR'&&!e.repeat){reset();return;}
 if(['ArrowLeft','KeyA','ArrowRight','KeyD'].includes(e.code)){e.preventDefault();if(!pointer)aim(wall.aimValue+(['ArrowLeft','KeyA'].includes(e.code)?-.08:.08));}
 if(e.code==='Space'){e.preventDefault();if(!e.repeat&&!pointer&&!keyHeld&&!overview&&!paused&&focused&&!document.hidden)keyHeld=wall.down();}
});
window.addEventListener('keyup',e=>{if(e.code==='Space'&&keyHeld){e.preventDefault();keyHeld=false;wall.up();$('#gesture').hidden=true;}});window.addEventListener('blur',()=>{focused=false;cancel();last=0;});window.addEventListener('focus',()=>{focused=true;last=0;});window.addEventListener('resize',()=>{cancel();last=0;});document.addEventListener('visibilitychange',()=>{cancel();last=0;});canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancel();paused=true;$('#error').hidden=false;$('#error').textContent='图形上下文已中断。刷新页面可重新开始，也可在地址后添加 ?renderer=software 使用软件 3D。';});$('#renderer').textContent=renderer.kind;
const qaParams=new URLSearchParams(location.search),qa=qaParams.has('qa'),portraitQA=qa&&qaParams.get('portrait')==='1';let diagnostics,simulationRate=1;if(qa){diagnostics=document.createElement('div');diagnostics.style.cssText='position:absolute;left:8px;top:50%;z-index:20;background:#10271ee8;color:#fff;padding:8px;font:10px monospace;pointer-events:none';if(portraitQA){diagnostics.style.top='8px';diagnostics.style.left='8px';}document.body.append(diagnostics);const panel=document.createElement('div');panel.style.cssText='position:absolute;left:8px;top:58%;z-index:30;display:flex;gap:6px';if(portraitQA)panel.style.top='38px';const slow=document.createElement('button'),stop=document.createElement('button'),step=document.createElement('button');for(const el of [slow,stop,step]){el.style.cssText='background:#163d2f;color:#fff;border:1px solid #ccd5a8;padding:8px;font:11px sans-serif';panel.append(el);}slow.textContent='QA · 慢动作 0.2×';slow.setAttribute('aria-pressed','false');slow.onclick=()=>{simulationRate=simulationRate===1?.2:1;slow.setAttribute('aria-pressed',String(simulationRate<1));slow.textContent=simulationRate<1?'QA · 恢复 1×':'QA · 慢动作 0.2×';};stop.textContent='QA · 暂停';stop.onclick=()=>{cancel();paused=!paused;stop.textContent=paused?'QA · 继续':'QA · 暂停';};step.textContent='QA · 步进 0.10s';step.onclick=()=>{cancel();paused=true;stop.textContent='QA · 继续';wall.advance(.10);render();};document.body.append(panel);}let renderMs=0,frameMs=0;const frameSamples=[],renderSamples=[];function frame(now){const frameStart=performance.now();const delta=last?(now-last)/1000:0;if(delta>0){frameSamples.push(delta*1000);if(frameSamples.length>60)frameSamples.shift();}frameMs=frameSamples.reduce((a,b)=>a+b,0)/(frameSamples.length||1);if(last&&!paused&&focused&&!overview&&!document.hidden)wall.step(Math.min((now-last)/1000,.25)*simulationRate);last=now;render();renderSamples.push(performance.now()-frameStart);if(renderSamples.length>60)renderSamples.shift();renderMs=renderSamples.reduce((a,b)=>a+b,0)/renderSamples.length;if(diagnostics)diagnostics.textContent=`20261101-ink-r9 | ${(1000/(frameMs||1)).toFixed(1)} RAF fps / ${frameSamples.length} samples | work ${renderMs.toFixed(1)} ms | avg Δ ${frameMs.toFixed(0)} / last ${Math.round(delta*1000)} ms | sim ${wall.time.toFixed(2)} s | ${renderer.stats?.triangles||0} triangles | ${renderer.stats?.modeledLeaves||28} route / 0 decorative meshes`;requestAnimationFrame(frame);}render();requestAnimationFrame(frame);
window.__ivyWall={wall,renderer,render,reset,aim,guidance,pause(value=true){cancel();paused=value;},step(seconds){wall.advance(seconds);render();},snapshot(){return wall.snapshot();}};
