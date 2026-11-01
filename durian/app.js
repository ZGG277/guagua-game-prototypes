import{Study}from'./physics.js?v=r3';
import{cameraFor}from'./camera.js?v=r3';
import{catcherPose}from'./pose.js?v=r3';
import{HalfArcController}from'./gesture.js?v=r3';
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),sim=new Study();window.study=sim;const controller=new HalfArcController();window.gesture=controller;
let slow=false,mesh=false,drag=null,last=0,visualTime=0,impactAt=null,impactPoint=null,lastOutcome=null;
const $=s=>document.querySelector(s),P=p=>({x:p.x+(p.z||0)*.48,y:p.y-(p.z||0)*.24});
function line(points,color,width){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke()}
function ellipse(x,y,rx,ry,c,angle=0){ctx.beginPath();ctx.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),angle,0,Math.PI*2);ctx.fillStyle=c;ctx.fill()}
function poly(points,c){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=c;ctx.fill()}
function background(){
 let g=ctx.createLinearGradient(0,-1200,0,650);g.addColorStop(0,'#cbd9c0');g.addColorStop(.7,'#e8ecda');g.addColorStop(1,'#c3ceaa');ctx.fillStyle=g;ctx.fillRect(-1800,-1800,4000,4000);
 // Distant orchard is deliberately low contrast; the one working tree carries the scene.
 for(let i=0;i<11;i++){let x=-600+i*193;line([{x,y:-380-(i%3)*65},{x:x-12,y:530}],'#becdb1',9);ellipse(x,-370-(i%3)*65,145,230,'#c3d1b6',.2)}
 poly([{x:-1800,y:520},{x:-500,y:475},{x:180,y:488},{x:700,y:463},{x:1800,y:490},{x:1800,y:1800},{x:-1800,y:1800}],'#c7d1ac');
 for(let i=0;i<170;i++){let x=(i*137)%2200-700,y=491+(i*31)%220;line([{x,y},{x:x+4,y:y-8}],'#aebb94',1.2)}
 // A massive trunk, buttress roots and crown: approximately eight catcher heights.
 line([{x:595,y:555},{x:565,y:220},{x:579,y:-180},{x:550,y:-590},{x:565,y:-1030}],'#737b5c',62);
 line([{x:575,y:550},{x:558,y:125},{x:568,y:-280},{x:544,y:-650}],'#919575',13);
 poly([{x:565,y:470},{x:533,y:553},{x:483,y:568},{x:574,y:551},{x:624,y:569},{x:655,y:561},{x:607,y:537},{x:600,y:477}],'#747d5e');
 line([{x:557,y:-525},{x:400,y:-680},{x:229,y:-755},{x:145,y:-918}],'#727b5a',33);
 line([{x:556,y:-775},{x:439,y:-885},{x:405,y:-907}],'#75805b',19);
 line([{x:571,y:-320},{x:707,y:-485},{x:865,y:-567}],'#77805d',30);
 line([{x:568,y:-920},{x:736,y:-1027},{x:899,y:-1030}],'#75805b',25);
 line([{x:408,y:-900},{x:408,y:-877}],'#84915f',4);
 for(let layer=0;layer<3;layer++)for(let i=0;i<28;i++){const x=55+(i*173+layer*65)%1070,y=-1175+(i*79+layer*110)%395;ellipse(x,y,95+(i%4)*19,38+(i%3)*11,['#91a77a','#81996a','#77915f'][layer],Math.sin(i)*.7)}
 // Leaf groups nearer the receiving zone keep the downward travel legible.
 for(let i=0;i<9;i++){let x=735+(i*51)%220,y=-540+(i*37)%120;ellipse(x,y,50,19,'#8b9f70',-.4)}
 ellipse(290,551,115,12,'#98aa7a48');
 let fy=sim.fruit.y,shadow=Math.max(0,1-(550-fy)/450);ellipse(sim.fruit.x,551,22+Math.max(0,550-fy)*.025,5+shadow*3,`rgba(75,90,48,${shadow*.24})`);
}
function basket(){const x=146,y=532;ellipse(x+42,y+14,58,9,'#8f9d7345');poly([{x:x-3,y:y-21},{x:x+89,y:y-21},{x:x+82,y:y+14},{x:x+4,y:y+14}],'#96764b');for(let j=0;j<4;j++)line([{x,y:y-15+j*8},{x:x+86,y:y-15+j*8}],'#b99b68',3);for(let i=0;i<9;i++)line([{x:x+i*10,y:y-20},{x:x+5+i*8,y:y+13}],'#745b3b',1);line([{x:x-4,y:y-21},{x:x+91,y:y-21}],'#c4ac77',4);
 let n=Math.min(3,Math.max(0,(sim.totals?.whole||0)-(sim.outcome==='whole'&&!sim.isDemoRound?1:0)));for(let i=0;i<n;i++)drawFruitAt({x:x+20+i*24,y:y-18,z:0},.55);
}
function trail(){if(sim.contactTime!==null||!sim.running||sim.outcome)return;let vy=(sim.fruit.y-sim.fruit.py)*240;if(vy<230)return;let f=P(sim.fruit),length=Math.min(95,vy*.065);for(let i=-1;i<=1;i++)line([{x:f.x+i*26,y:f.y-35},{x:f.x+i*26,y:f.y-35-length*(i===0?1:.7)}],'#eaf0db94',i===0?3:1.5)}
function debris(){if(!impactPoint)return;const severe=sim.outcome==='smashed',t=Math.min(2.3,visualTime-impactAt),p=impactPoint,spread=severe?91:43,open=Math.min(1,t*2.6),pulpVisible=severe||!sim.eaten;
 // A low, uneven food smear, with soft lobes rather than confetti particles.
 if(pulpVisible){ctx.save();ctx.translate(p.x,548);ctx.beginPath();ctx.moveTo(-spread,0);ctx.bezierCurveTo(-spread-9,-7,-spread*.56,-15,-spread*.32,-9);ctx.bezierCurveTo(-spread*.14,-18,spread*.18,-12,spread*.35,-10);ctx.bezierCurveTo(spread*.67,-17,spread+6,-6,spread,1);ctx.bezierCurveTo(spread*.76,9,spread*.33,4,spread*.17,10);ctx.bezierCurveTo(-spread*.15,14,-spread*.5,5,-spread*.75,7);ctx.bezierCurveTo(-spread*.95,7,-spread-8,3,-spread,0);ctx.fillStyle=severe?'#c9ae5fba':'#d8bf78a8';ctx.fill();ctx.restore();
 for(let i=0;i<(severe?7:3);i++){let k=i*2.399,x=p.x+Math.cos(k)*(16+i*9)*open,jump=Math.max(0,Math.sin(Math.min(1,t*2)*Math.PI))*(15+(i*11)%24),y=542-jump+(i%3)*2;ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(k)*.4);let w=9+(i%3)*5;ctx.beginPath();ctx.moveTo(-w,1);ctx.bezierCurveTo(-w-3,-9,-4,-14,2,-10);ctx.bezierCurveTo(w*.6,-14,w+5,-5,w,2);ctx.bezierCurveTo(w-3,8,-w+3,9,-w,1);ctx.fillStyle=i%2?'#e6cf84':'#efdaa0';ctx.fill();ctx.beginPath();ctx.moveTo(-w*.55,-3);ctx.bezierCurveTo(-1,-8,w*.45,-8,w*.63,-3);ctx.strokeStyle='#f8e8b8';ctx.lineWidth=2;ctx.stroke();ctx.restore();}}
 // Thick curved, serrated shell shards: dark outside, pale pith on the broken face.
 for(let i=0;i<(severe?6:3);i++){const k=i*2.399,r=(severe?28:18)+i*(severe?13:9),x=p.x+Math.cos(k)*r*open,jump=Math.max(0,Math.sin(Math.min(1,t*1.7)*Math.PI))*(24+(i*17)%42),y=540-Math.abs(Math.sin(k))*8-jump;ctx.save();ctx.translate(x,y);ctx.rotate(k*.7+t*(i%2?.8:-.65));const z=severe?1.1:.95;ctx.scale(z,z);ctx.beginPath();ctx.moveTo(-19,3);ctx.quadraticCurveTo(-17,-12,-5,-18);ctx.lineTo(-2,-24);ctx.lineTo(2,-18);ctx.lineTo(9,-24);ctx.lineTo(10,-16);ctx.lineTo(18,-18);ctx.lineTo(15,-10);ctx.lineTo(23,-9);ctx.lineTo(17,-3);ctx.lineTo(21,3);ctx.quadraticCurveTo(7,16,-7,12);ctx.quadraticCurveTo(-16,9,-19,3);ctx.fillStyle=i%2?'#596838':'#6e7540';ctx.fill();ctx.strokeStyle='#58603a';ctx.lineWidth=1.5;ctx.stroke();ctx.beginPath();ctx.moveTo(-15,3);ctx.quadraticCurveTo(-9,-2,-1,-6);ctx.quadraticCurveTo(9,-8,17,1);ctx.quadraticCurveTo(8,11,-5,9);ctx.quadraticCurveTo(-11,8,-15,3);ctx.fillStyle='#ccb77a';ctx.fill();ctx.beginPath();ctx.moveTo(-10,3);ctx.quadraticCurveTo(1,-3,11,2);ctx.strokeStyle='#eee0aa';ctx.lineWidth=3;ctx.stroke();ctx.restore();}
}
function person(){const pose=catcherPose(sim.hand,!!sim.collection),{hip,shoulder,head,arms,knees,feet}=pose;
 line([{x:hip.x-8,y:hip.y},knees[0],feet[0]],'#3b483d',20);line([{x:hip.x+8,y:hip.y},knees[1],feet[1]],'#4a5744',20);line([{x:feet[0].x-6,y:feet[0].y+6},{x:feet[0].x+12,y:feet[0].y+7}],'#5d4834',10);line([{x:feet[1].x-6,y:feet[1].y+6},{x:feet[1].x+15,y:feet[1].y+7}],'#5d4834',10);
 line([{x:shoulder.x-11,y:shoulder.y+8},{x:hip.x-8,y:hip.y-4}],'#4b6d63',39);line([{x:shoulder.x+10,y:shoulder.y+6},{x:hip.x+9,y:hip.y-4}],'#567c70',32);
 for(let i=0;i<arms.length;i++){const a=arms[i];line([a.shoulder,a.elbow,a.hand],i?'#648c7c':'#3d6057',15);const dx=a.hand.x-a.elbow.x,dy=a.hand.y-a.elbow.y,d=Math.hypot(dx,dy)||1;line([{x:a.hand.x-dx/d*9,y:a.hand.y-dy/d*9},a.hand],'#b49066',10)}
 const face=sim.collection?-1:1;line([{x:head.x,y:head.y+16},{x:shoulder.x,y:shoulder.y+2}],'#b9936b',13);ellipse(head.x,head.y,17,22,'#bd9c72',-.16*face);ellipse(head.x-5*face,head.y-10,17,15,'#3c4439',-.12*face);poly([{x:head.x+11*face,y:head.y-3},{x:head.x+23*face,y:head.y+3},{x:head.x+12*face,y:head.y+7}],'#bd9c72');ellipse(head.x+11*face,head.y-5,1.6,1.8,'#3e4638');
}
function drawFruitAt(obj=sim.fruit,small=1){let f=P(obj);ctx.save();ctx.translate(f.x,f.y);ctx.scale(small,small);ctx.rotate((obj.x-408)*.017);for(let i=0;i<22;i++){let a=i/22*Math.PI*2;poly([{x:Math.cos(a-.1)*18,y:Math.sin(a-.1)*20},{x:Math.cos(a)*25,y:Math.sin(a)*27},{x:Math.cos(a+.1)*18,y:Math.sin(a+.1)*20}],'#728047')};let g=ctx.createRadialGradient(-7,-9,1,0,0,23);g.addColorStop(0,'#bdc36d');g.addColorStop(1,'#7a8746');ellipse(0,0,19,22,g);for(let i=0;i<26;i++){let a=i*2.399,r=Math.sqrt(i/26)*17,x=Math.cos(a)*r,y=Math.sin(a)*r*1.1;poly([{x:x-3,y:y+2},{x,y:y-4},{x:x+3,y:y+2}],i%2?'#8b984c':'#c4cb79')}line([{x:0,y:-20},{x:3,y:-28}],'#79744a',3);ctx.restore()}
function bundle(front){const f=P(sim.fruit);ctx.save();ctx.translate(f.x,f.y);ctx.beginPath();ctx.moveTo(-28,-10);ctx.bezierCurveTo(-40,6,-28,33,0,34);ctx.bezierCurveTo(28,33,39,7,27,-10);ctx.bezierCurveTo(17,front?18:-1,-16,front?20:-4,-28,-10);ctx.fillStyle=front?'#ab8959':'#8e704b';ctx.fill();for(let i=-3;i<=3;i++)line([{x:i*7,y:front?17:2},{x:i*5,y:30}],'#d0ad745c',1);line([{x:-28,y:-10},{x:-19,y:12},{x:-9,y:20},{x:10,y:20},{x:23,y:9},{x:27,y:-10}],'#c2a16b',1.3);ctx.restore()}
function cloth(front){if(sim.collection){bundle(front);return;}for(let j=0;j<11;j++)for(let i=0;i<8;i++){let ns=[sim.nodes[j*9+i],sim.nodes[j*9+i+1],sim.nodes[(j+1)*9+i+1],sim.nodes[(j+1)*9+i]],z=ns.reduce((a,n)=>a+n.z,0)/4;if((z>=sim.fruit.z)!==front)continue;let ps=ns.map(P),shade=Math.max(0,Math.min(1,(ns[2].x-ns[0].x+18)/44));poly(ps,`rgb(${Math.round(158+shade*40)},${Math.round(126+shade*36)},${Math.round(81+shade*33)})`);ctx.strokeStyle=mesh?'#66534088':'#745c3730';ctx.lineWidth=mesh?.65:.45;ctx.stroke();for(let t of [.28,.55,.8]){let a={x:ps[0].x+(ps[1].x-ps[0].x)*t,y:ps[0].y+(ps[1].y-ps[0].y)*t},b={x:ps[3].x+(ps[2].x-ps[3].x)*t,y:ps[3].y+(ps[2].y-ps[3].y)*t};line([a,b],'#f2d6a636',.55)}}
 for(let row of[0,11]){let ns=sim.nodes.slice(row*9,row*9+9);if((ns[4].z>=sim.fruit.z)===front)line(ns.map(P),'#a98959',1.5)}}
function ui(){const stage=sim.stage||'ready',out=sim.outcome,engaged=!!(sim.snags.length||sim.supported);let phase='准备 · 从树冠开始',hint='按住向上甩 · 挂住后持续向下带';
 if(stage==='falling'){phase=sim.time>=1.2?'准备 · 按住向上甩':'落果 · 看准时机';hint=sim.time>=1.2?'现在按住画面，开始向上滑动':'镜头随果子下移 · 提示亮起后向上甩'}
 if(sim.inputOpen){phase=sim.contactTime!==null?(engaged?'挂住了 · 向下带':'擦过布面 · 尚未托稳'):'接果窗口 · 向上甩';hint=sim.contactTime!==null?'保持按住，向下慢带半秒左右 · 别反拉':'只需向上滑，双手会沿接果弧线甩开麻布'}
 if(controller.phase==='yielding'&&sim.contactTime!==null){phase='下带中 · 顺势卸力';hint='继续往下带，让重物的速度慢下来'}
 if(controller.phase==='recovering'&&sim.contactTime!==null){phase='回收中 · 等待受托稳定';hint='完成下带后回收 · 等受托稳定再收果'}
 if(sim.collectReady){phase='已卸力 · 双手收果';hint='果子暂时受托 · 点「双手收果」完整入筐'}
 if(stage==='collecting'){phase='双手收取 · 轻轻入筐';hint='收取中 · 完整放稳才计数'}
 if(out==='whole'){phase=sim.isDemoRound?'演示完成 · 完整入筐':'完整入筐 · 待售整果 +1';hint=sim.isDemoRound?'演示不计数 · 换你来采下一颗':'这一颗留着卖 · 再采下一颗'}
 if(out==='pulp'){phase=sim.eaten?'果肉吃掉了':'摔裂了 · 还剩一点果肉';hint=sim.eaten?'不算待售整果 · 再接下一颗':'这一颗卖不了了 · 剩下的果肉自己吃'}
 if(out==='smashed'){phase='摔碎了 · 稀巴烂';hint='撞地太重，没有完整果 · 下次更早迎住、顺势卸力'}
 if(!sim.running&&!out&&stage!=='ready'){phase='这一轮结束 · 再试一次';hint='调整甩布时机，再采一颗'}
 $('#phase').textContent=phase;$('#hint').textContent=hint;$('#mode').textContent=sim.isDemoRound?(controller.demo?'动作示范 · 不计收成':'示范练习 · 不计收成'):'2.5D 采收实验';
 const cue=$('#window-cue');cue.hidden=!(sim.running&&!sim.collection&&!sim.outcome&&sim.time>=1.2&&controller.phase!=='recovering'&&!sim.collectReady);cue.textContent=sim.contactTime!==null?(controller.phase==='yielding'?'继续向下带 ↓':(engaged?'挂住了 ↓ 向下带':'布松开了 · 继续顺势带')):sim.inputOpen?'向上甩布 ↑':'准备向上甩 ↑';$('#load-meter').hidden=!(sim.contactTime!==null&&!sim.collection&&!sim.outcome);$('#load-fill').style.width=`${Math.round(Math.max(0,Math.min(1,controller.load))*100)}%`;$('#whole-count').textContent=String(sim.totals?.whole||0);$('#snack-count').textContent=String(sim.totals?.snacks||0);$('#eat').hidden=!sim.canEat;$('#collect').hidden=!(sim.collectReady&&stage!=='collecting'&&!out);$('#start').innerHTML=stage==='ready'?'开始采收 <span>↗</span>':sim.running?'重新来一颗 <span>↻</span>':'再采一颗 <span>↗</span>';
}
function draw(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;const scale=Math.min(w/640,h/600),offsetX=(w-640*scale)/2,offsetY=(h-600*scale)/2;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#dbe3cc';ctx.fillRect(0,0,w,h);ctx.setTransform(scale,0,0,scale,offsetX,offsetY);const cam=cameraFor(sim);ctx.save();ctx.translate(320,300);ctx.scale(cam.zoom,cam.zoom);ctx.translate(-cam.x,-cam.y);background();basket();person();trail();cloth(false);if(!sim.outcome||sim.outcome==='whole')drawFruitAt();cloth(true);if(sim.outcome==='pulp'||sim.outcome==='smashed')debris();
 if(sim.inputOpen&&sim.contactTime===null){ctx.setLineDash([4,7]);ctx.beginPath();ctx.moveTo(330,390);ctx.bezierCurveTo(373,335,429,276,434,305);ctx.strokeStyle='#73865790';ctx.lineWidth=1.7;ctx.stroke();ctx.setLineDash([])}

 ctx.restore();ui();}
function frame(t){const dt=last?Math.min((t-last)/1000,.1):0;last=t;if(!document.hidden){const elapsed=dt*(slow&&!controller.contactSeen?.35:1);visualTime+=elapsed;controller.advance(sim,dt,slow?.35:1);if(sim.outcome!==lastOutcome){if(sim.outcome==='pulp'||sim.outcome==='smashed'){impactAt=visualTime;impactPoint=P(sim.fruit)}lastOutcome=sim.outcome;}}draw();requestAnimationFrame(frame)}requestAnimationFrame(frame);
function start(demo){release();sim.start(demo);sim.demo=false;controller.reset();controller.demo=demo;sim.controller=controller;impactAt=null;impactPoint=null;lastOutcome=null;}
function eventClock(e){return controller.realTime+(last?Math.max(0,Math.min(.1,((e.timeStamp||last)-last)/1000)):0);}
function screen(e){const r=canvas.getBoundingClientRect(),s=Math.min(r.width/640,r.height/600);return{x:(e.clientX-r.left-(r.width-640*s)/2)/s,y:(e.clientY-r.top-(r.height-600*s)/2)/s}}
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||!e.isPrimary||drag||sim.stage==='collecting')return;if(!sim.running)start(false);drag={id:e.pointerId};controller.demo=false;controller.queue('begin',screen(e),eventClock(e));canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const samples=typeof e.getCoalescedEvents==='function'?e.getCoalescedEvents():[];for(const sample of samples)controller.queue('move',screen(sample),eventClock(sample));if(!samples.length||samples[samples.length-1].timeStamp!==e.timeStamp)controller.queue('move',screen(e),eventClock(e))});
function release(e){const pointer=e&&e.pointerId!==undefined;if(pointer&&(!drag||e.pointerId!==drag.id))return;if(drag){const id=drag.id;drag=null;if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id)}if(e&&(e.type==='pointerup'||e.type==='pointercancel')&&Number.isFinite(e.timeStamp))controller.queue('cancel',null,eventClock(e));else controller.cancel(sim)}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);window.addEventListener('blur',release);window.addEventListener('resize',release);document.addEventListener('visibilitychange',()=>{if(document.hidden)release();last=0});
$('#start').onclick=()=>start(false);$('#demo').onclick=()=>start(true);$('#collect').onclick=()=>{release();sim.requestCollect()};$('#eat').onclick=()=>sim.eat();$('#reset-totals').onclick=()=>sim.resetTotals();$('#slow').onclick=e=>{slow=!slow;e.currentTarget.setAttribute('aria-pressed',String(slow))};$('#mesh').onchange=e=>mesh=e.target.checked;
