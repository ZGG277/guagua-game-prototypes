import {Lab} from './lab-physics.mjs';
import {createRenderer} from './lab-renderer.mjs';
const $=s=>document.querySelector(s),canvas=$('#scene'),lab=new Lab();let renderer;
try{renderer=createRenderer(canvas,new URLSearchParams(location.search).get('renderer')==='software');}catch(e){$('#error').hidden=false;$('#error').textContent='画面初始化失败：'+e.message;throw e;}
let zone='center',slow=false,last=0,paused=false;
const names={ready:'静止 · 等待落下',slipping:'滑离叶缘',idle:'静止 · 等待落下',falling:'落下',airborne:'离开叶面',impact:'触叶 · 吸收冲击',rebound:'回弹',grounded:'承重',standing:'承重',sliding:'倾斜 · 滑动',fallen:'滑离 · 再试一次',settled:'稳定'};
function render(){renderer.render(lab);$('#phase').textContent=names[lab.body.phase]||names[lab.phase]||lab.body.phase||'承重';$('#bend').textContent=`相对下弯 ${Math.round(Math.abs(lab.state.bend)/3.5*100)}%`;$('#contact').textContent=lab.body.grounded?'双脚贴合曲面':'腾空 · 无接触';}
function drop(target=zone){paused=false;$('#pause').setAttribute('aria-pressed','false');$('#pause').textContent='暂停';lab.drop(target);render();}
for(const b of document.querySelectorAll('[data-zone]'))b.addEventListener('click',()=>{zone=b.dataset.zone;document.querySelectorAll('[data-zone]').forEach(x=>x.classList.toggle('selected',x===b));drop();});
$('#pause').addEventListener('click',()=>{paused=!paused;$('#pause').setAttribute('aria-pressed',String(paused));$('#pause').textContent=paused?'继续':'暂停';});
$('#replay').addEventListener('click',()=>drop());$('#reset').addEventListener('click',()=>{lab.reset();render();});$('#slow').addEventListener('click',()=>{slow=!slow;$('#slow').setAttribute('aria-pressed',String(slow));$('#slow').textContent=slow?'恢复速度':'慢看';});
canvas.addEventListener('pointerup',e=>{if(e.button!==0)return;const hit=renderer.pick(e.clientX,e.clientY);if(hit){zone=hit;document.querySelectorAll('[data-zone]').forEach(x=>x.classList.remove('selected'));drop(hit);}});
window.addEventListener('keydown',e=>{if(e.repeat)return;if(e.code==='Space'&&!/BUTTON|INPUT/.test(e.target.tagName)){e.preventDefault();lab.jump(.65);}if(e.code==='Escape')lab.cancel();if(['Digit1','Digit2','Digit3'].includes(e.code))document.querySelectorAll('[data-zone]')[Number(e.code.slice(-1))-1].click();});
window.addEventListener('blur',()=>{lab.cancel();last=0;});document.addEventListener('visibilitychange',()=>{lab.cancel();last=0;});
$('#renderer').textContent=renderer.kind;
function frame(now){if(last&&!paused&&!document.hidden)lab.step(Math.min((now-last)/1000,.05)*(slow?.3:1));last=now;render();requestAnimationFrame(frame);}render();requestAnimationFrame(frame);
window.__leafLab={lab,renderer,drop,render,pause(value=true){paused=value;},step(seconds){for(let t=0;t<seconds;t+=1/120)lab.step(Math.min(1/120,seconds-t));render();},snapshot(){return JSON.parse(JSON.stringify({time:lab.time,state:lab.state,body:lab.body,metrics:lab.metrics}));}};
