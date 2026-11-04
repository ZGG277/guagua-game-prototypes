export const W=390,H=780,MIN_R=18,SAFE_R=53,MAX_R=67;
export const RIM=8,POST=18;
const rand=(i,seed)=>{let n=Math.sin((i+1)*127.1+seed*311.7)*43758.5453;return n-Math.floor(n)};
export function gate(i,seed=0){let y=260;for(let j=1;j<=i;j++)y-=j<3?400:400+(rand(j,seed)-.5)*Math.min(90,(j-2)*12);return{id:i,y,x:i<3?195:195+22*Math.sin((i-2)*.8+seed),half:i<3?120:Math.max(96,112-Math.min(12,(i-3)*1.2)+(rand(i+987,seed)-.5)*Math.min(20,(i-2)*3)),passed:false}}
export function bird(i,t,y=gate(i).y){return{x:195+165*Math.sin(t*.48+i*1.7),y:y-140,r:18,id:i}}
// Segment-to-point distance, used in relative motion for swept circle collision.
export function segmentDistance(ax,ay,bx,by,x,y){let dx=bx-ax,dy=by-ay,q=dx*dx+dy*dy;let t=q?Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/q)):0;return Math.hypot(ax+t*dx-x,ay+t*dy-y)}
export function rimPoints(q,side){const points=[];for(let i=0;i<=8;i++){const a=-.45+i*.9/8;points.push({x:q.x+side*(q.half+RIM)*Math.cos(a)/Math.cos(.45),y:q.y+POST*Math.sin(a)/Math.sin(.45)})}return points}
function segmentsDistance(ax,ay,bx,by,cx,cy,dx,dy){const rx=bx-ax,ry=by-ay,sx=dx-cx,sy=dy-cy,den=rx*sy-ry*sx;if(Math.abs(den)>1e-12){const t=((cx-ax)*sy-(cy-ay)*sx)/den,u=((cx-ax)*ry-(cy-ay)*rx)/den;if(t>=0&&t<=1&&u>=0&&u<=1)return 0}return Math.min(segmentDistance(ax,ay,bx,by,cx,cy),segmentDistance(ax,ay,bx,by,dx,dy),segmentDistance(cx,cy,dx,dy,ax,ay),segmentDistance(cx,cy,dx,dy,bx,by))}
export function rimHit(ax,ay,bx,by,r,q){if(Math.min(ay,by)-r>q.y+POST+RIM||Math.max(ay,by)+r<q.y-POST-RIM)return false;for(const side of[-1,1]){const p=rimPoints(q,side);for(let i=1;i<p.length;i++)if(segmentsDistance(ax,ay,bx,by,p[i-1].x,p[i-1].y,p[i].x,p[i].y)<=r+RIM+1e-9)return true}return false}
export class Game{
 constructor({birds=true}={}){this.birds=birds;this.reset()}
 reset(){this.seed=Math.random()*10000;Object.assign(this,{phase:'ready',x:195,y:568,r:18,vx:0,vy:0,age:0,score:0,coins:0,height:0,camera:0,factor:1,wind:0,fanX:195,fanTarget:195,fanVelocity:0,blowing:false,reason:'',time:0,gates:Array.from({length:8},(_,i)=>gate(i,this.seed)),nextGate:8,events:[],forceX:0,forceY:0})}
 start(){if(this.phase!=='ready')return false;this.phase='inflate';this.blowing=true;return true}
 release(){if(this.phase!=='inflate')return false;this.phase='float';this.blowing=false;this.factor=(this.r/18)**2;this.vy=-10;return true}
 pop(reason){if(this.phase==='pop')return;this.phase='pop';this.reason=reason;this.blowing=false}
 step(dt,fan=false,power=1){if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);let n=Math.ceil(dt/(1/120));for(let i=0;i<n;i++)this.tick(dt/n,fan,power)}
 tick(dt,fan,power){this.time+=dt;if(this.phase==='inflate'){this.r+=17*dt*Math.max(.2,power);this.y=586-this.r;if(this.r>=MAX_R){this.r=MAX_R;this.pop('too-big')}return}if(this.phase!=='float')return;
 if(this.x-this.r<=0||this.x+this.r>=W||this.y+this.r>=this.camera+H){this.pop('edge');return}
 const old=this.fanX;this.fanX+=(this.fanTarget-this.fanX)*(1-Math.exp(-dt*15));this.fanVelocity=(this.fanX-old)/dt;this.wind+=((fan?1:0)-this.wind)*(1-Math.exp(-dt*(fan?5:2.5)));
 const dx=this.x-this.fanX,height=Math.max(0,719-(this.y-this.camera)),spread=90+height*.55;
 const reach=Math.exp(-((dx/spread)**2))*(.72+.28*Math.exp(-height/700));
 const ax=Math.max(-90,Math.min(90,dx*2.4))*this.wind*reach;
 const pace=Math.min(1,this.coins/16);
 this.forceX=ax;this.forceY=-(62+32*pace)*this.wind*reach;
 const ay=22-(this.r-18)*.2-4*Math.exp(-this.age/3)-(62+32*pace)*this.wind*reach;
 this.vx=(this.vx+ax*dt)*Math.exp(-dt*.65);this.vy=Math.max(-280,(this.vy+ay*dt)*Math.exp(-dt*.24));
 const px=this.x,py=this.y,oldAge=this.age;this.x+=this.vx*dt;this.y+=this.vy*dt;this.age+=dt;
 for(const q of this.gates){if(rimHit(px,py,this.x,this.y,this.r,q)){this.pop('gold');return}}
 for(const q of this.gates){if(this.birds&&q.id>=4&&q.id%3===1){const a=bird(q.id,oldAge,q.y),b=bird(q.id,this.age,q.y);if(segmentDistance(px-a.x,py-a.y,this.x-b.x,this.y-b.y,0,0)<=this.r+b.r){this.pop('bird');return}}}
 if(this.x-this.r<=0||this.x+this.r>=W||this.y+this.r>=this.camera+H){this.pop('edge');return}
 // Entire bubble plus post depth must clear the gate, once only. Going around earns nothing.
 for(const q of this.gates){if(!q.passed&&py+this.r>=q.y-POST-RIM&&this.y+this.r<q.y-POST-RIM&&Math.abs(this.x-q.x)+this.r<q.half){q.passed=true;this.coins++;this.score=this.coins;this.vy=Math.max(-280,this.vy-(65+Math.min(25,this.coins*2)));this.events.push({type:'coin',x:q.x,y:q.y,id:q.id,half:q.half,impulse:65+Math.min(25,this.coins*2)})}}
 this.height+=Math.hypot(this.x-px,this.y-py)/10;this.camera=Math.min(this.camera,this.y-400);
 while(this.gates[this.gates.length-1].y>this.camera-1400)this.gates.push(gate(this.nextGate++,this.seed));
 this.gates=this.gates.filter(q=>q.y<this.camera+H+600);
 }
}
export class Input {
 constructor(game){this.g=game;this.id=null;this.mode=null;this.origin=null;this.fan=false;this.blocked=false}
 down(id,x,y){if(this.blocked||this.id!==null)return false;if(this.g.phase==='ready'){this.g.start();this.mode='inflate'}else if(this.g.phase==='float'&&y>H*.72){this.mode='fan';this.fan=true;this.g.fanTarget=Math.max(25,Math.min(W-25,x))}else return false;this.id=id;this.origin={x,y};return true}
 move(id,x,y){if(id!==this.id)return;if(this.mode==='inflate'&&Math.hypot(x-this.origin.x,y-this.origin.y)>32){this.g.release();this.mode='released'}else if(this.mode==='fan')this.g.fanTarget=Math.max(25,Math.min(W-25,x))}
 up(id){if(id!==this.id)return;if(this.mode==='inflate')this.g.release();this.clear()}
 clear(){this.id=null;this.mode=null;this.fan=false;this.origin=null}
 cancel(){if(this.g.phase==='inflate')this.g.release();this.clear()}
}
