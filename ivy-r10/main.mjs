import {Engine,DT,START_Y,GOAL_Y,CHARGE_TIME,clamp} from './physics.mjs';
import {createRenderer} from './renderer.mjs';
const $=id=>document.getElementById(id),canvas=$('scene');
let renderer=null,renderFailed=false;
function showRenderError(){renderFailed=true;$('renderError').hidden=false;canvas.setAttribute('aria-disabled','true');}
try{renderer=createRenderer(canvas);}catch(error){console.warn('3D renderer unavailable',error);showRenderError();}
const game=new Engine(),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let width=480,height=700,dpr=1,scale=1,offsetX=0,cameraY=START_Y-height*.74;
let pointerId=null,keyboard=false,accumulator=0,last=0,paused=false,lastMessage='',audio=null,soundOn=false,lastAudioEvent=-1;
const keys=new Set();
function clearPointer(){const id=pointerId;pointerId=null;keyboard=false;keys.clear();if(id!==null){try{canvas.releasePointerCapture(id);}catch{}}}
function cancel(){game.cancel();clearPointer();}
function resize(){
 const rect=canvas.getBoundingClientRect();
 if(Math.abs(rect.width-width)>.5||Math.abs(rect.height-height)>.5)cancel();
 width=Math.max(1,rect.width);height=Math.max(1,rect.height);dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
 scale=width/480;offsetX=0;
}
new ResizeObserver(resize).observe(canvas);
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left-offsetX)/scale,y:(e.clientY-r.top)/scale+cameraY};}
function restart(){cancel();game.reset();accumulator=0;cameraY=START_Y-height/scale*.74;lastMessage='';lastAudioEvent=-1;updateHUD();}
canvas.addEventListener('pointerdown',e=>{
 if(renderFailed||pointerId!==null||keyboard||!e.isPrimary&&e.isPrimary!==undefined||e.button>0)return;
 e.preventDefault();canvas.focus({preventScroll:true});const p=point(e);
 if(game.down(p.x,p.y)){pointerId=e.pointerId;try{canvas.setPointerCapture(e.pointerId);}catch{}}
});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointerId)return;e.preventDefault();const p=point(e);game.move(p.x,p.y);});
canvas.addEventListener('pointerup',e=>{if(e.pointerId!==pointerId)return;e.preventDefault();game.up();clearPointer();});
canvas.addEventListener('pointercancel',e=>{if(e.pointerId===pointerId)cancel();});
canvas.addEventListener('lostpointercapture',e=>{if(e.pointerId===pointerId)cancel();});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('blur',cancel);
canvas.addEventListener('keydown',e=>{
 if(renderFailed||!['Space','ArrowLeft','ArrowRight','Escape'].includes(e.code))return;e.preventDefault();
 if(e.code==='Escape'){cancel();return;}
 keys.add(e.code);
 if(e.code==='Space'&&!e.repeat&&pointerId===null&&!keyboard){keyboard=game.down(0,0);}
});
canvas.addEventListener('keyup',e=>{
 if(!['Space','ArrowLeft','ArrowRight'].includes(e.code))return;e.preventDefault();keys.delete(e.code);
 if(e.code==='Space'&&keyboard){game.up();keyboard=false;}
});
window.addEventListener('blur',()=>{cancel();paused=true;accumulator=0;if(audio)audio.context.suspend().catch(()=>{});});
window.addEventListener('focus',()=>{paused=document.hidden;last=0;if(soundOn&&audio&&!paused)audio.context.resume().catch(()=>{});});
document.addEventListener('visibilitychange',()=>{cancel();paused=document.hidden;accumulator=0;last=0;if(audio){if(paused)audio.context.suspend().catch(()=>{});else if(soundOn)audio.context.resume().catch(()=>{});}});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancel();paused=true;showRenderError();});
$('reload').addEventListener('click',()=>window.location.reload());
$('restart').addEventListener('click',restart);$('again').addEventListener('click',restart);
function createAudio(){
 const AudioCtor=window.AudioContext||window.webkitAudioContext;if(!AudioCtor)throw new Error('Audio unavailable');
 const context=new AudioCtor(),out=context.createGain();out.gain.value=.032;out.connect(context.destination);
 return{context,out};
}
function tone(type){
 if(!soundOn||!audio||audio.context.state!=='running')return;
 const c=audio.context,t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sine';
 const start=type==='jump'?280:type==='complete'?700:1050,end=type==='jump'?520:type==='complete'?1050:780;
 o.frequency.setValueAtTime(start,t);o.frequency.exponentialRampToValueAtTime(end,t+.13);
 g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(.19,t+.025);g.gain.exponentialRampToValueAtTime(.001,t+.23);
 o.connect(g);g.connect(audio.out);o.start(t);o.stop(t+.25);
}
$('sound').addEventListener('click',async()=>{
 try{if(!audio)audio=createAudio();soundOn=!soundOn;if(soundOn){await audio.context.resume();tone('caught');}else await audio.context.suspend();
 $('sound').setAttribute('aria-pressed',String(soundOn));$('sound').setAttribute('aria-label',soundOn?'关闭自然音':'开启自然音');$('sound').querySelector('span').textContent=soundOn?'自然音':'静音';
 }catch{soundOn=false;$('sound').setAttribute('aria-pressed','false');$('sound').querySelector('span').textContent='不可用';}
});
function updateHUD(){
 const l=game.currentLeaf,load=l?.load??0,progress=Math.round(game.progress*100),fb=game.feedback;
 $('location').textContent=game.completed?'窗边的光':progress>66?'光从叶缝洒下':progress>30?'爬山虎的深处':'墙脚的阴凉';
 $('heightLabel').textContent=game.completed?'这段小小的旅程，完成了':`向着窗边的光 · ${progress}%`;
 $('progressFill').style.height=progress+'%';$('progressDot').style.bottom=progress+'%';
 const charging=!!game.input;$('chargePanel').hidden=!charging;$('gestureLabel').hidden=charging;
 if(charging){$('chargeFill').style.width=Math.round(game.charge*100)+'%';$('chargeLabel').textContent=Math.round(game.charge*100)+'%';$('aimLabel').textContent=game.input.aim<-.12?'↖ 向左':game.input.aim>.12?'向右 ↗':'↑ 向上';}
 $('conditionLabel').textContent=!game.started?'七片亮叶，一段向上的路':game.status==='flying'?'伸出手，找一片叶子':game.status==='climbing'?'抓到了，正在爬上叶面':game.completed?'窗边的光，暖暖的':load>.66?'叶尖很滑，松手起跳！':load>.41?'叶子在倾斜，别停太久':'叶子正在轻轻下弯';
 $('conditionFill').style.width=(l?(1-load)*100:0)+'%';$('conditionFill').style.background=load>.65?'#f2b386':'#e3edb1';
 $('complete').hidden=!game.completed;
 const butterfly=game.butterfly;$('butterflyNotice').hidden=!['warning','passing'].includes(butterfly.phase);
 $('butterflyText').textContent=butterfly.phase==='warning'?'有影子掠过……蝴蝶要来了':'蝶翼带起一阵风，轻轻向右推';
 let message='按住半秒以上，松手向上跳；满蓄力更高。';
 if(!game.started)message='先按住半秒试试，松手向上跳。';
 else if(game.completed)message='你到了。想换条路，就再爬一次。';
 else if(game.status==='sliding')message='开始滑了！现在蓄力仍然来得及，别等太久。';
 else if(fb?.type==='recovered'&&game.time-fb.time<3)message='下面的叶子接住了你，只是掉了一点高度。';
 else if(fb?.type==='base'&&game.time-fb.time<3)message='落回墙脚了。没有生命限制，再试一次。';
 else if(game.status==='climbing')message='双手抓住叶缘，再把自己拉上来。';
 else if(game.butterfly.phase==='warning')message='先看到翅膀的影子；停稳，或预留一点向左的方向。';
 else if(game.butterfly.phase==='passing')message='蝴蝶很大，风却有预兆。继续寻找上方的叶子。';
 else if(game.status==='flying')message='每片叶子都能接住你，不必只走一条路。';
 if(message!==lastMessage){$('feedback').textContent=message;lastMessage=message;}
 const e=game.events.at(-1);if(e&&e.time!==lastAudioEvent&&['jump','caught','complete'].includes(e.type)){tone(e.type);lastAudioEvent=e.time;}
}
function tick(now){
 requestAnimationFrame(tick);if(!last)last=now;
 const elapsed=Math.min((now-last)/1000,.08);last=now;
 if(!paused&&!renderFailed){
  accumulator+=elapsed;
  while(accumulator>=DT){if(keyboard&&game.input){if(keys.has('ArrowLeft'))game.aimBy(-DT*1.8);if(keys.has('ArrowRight'))game.aimBy(DT*1.8);}game.step();accumulator-=DT;}
  // Continuous rear-follow camera tracks both upward flight and genuine lost height.
  const worldH=height/scale,target=clamp(game.body.y-worldH*.69,GOAL_Y-worldH*.63,START_Y-worldH*.74);
  cameraY+=(target-cameraY)*(reducedMotion?1:1-Math.exp(-elapsed*4.5));
 }
 if(renderer&&!renderFailed){try{renderer.render(game,{width,height,scale,offsetX,cameraY,reducedMotion});}catch(error){console.warn('3D render failed',error);cancel();showRenderError();}}updateHUD();
}
resize();restart();requestAnimationFrame(tick);
// Read-only live observations; simulations are independent, never live-game controls.
window.ivyWall=Object.freeze({renderer:()=>renderFailed?'unavailable':renderer?.kind,snapshot:()=>game.snapshot(),constants:Object.freeze({timestep:DT,gravity:820,leafCount:game.leaves.length,chargeSeconds:CHARGE_TIME}),createSimulation:()=>new Engine()});
