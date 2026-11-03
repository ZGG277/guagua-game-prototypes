export const W=390,H=780,MIN_R=18,SAFE_R=53,MAX_R=67;
export class Game {
 constructor(){this.reset()}
 reset(){Object.assign(this,{phase:'ready',x:W/2,y:568,r:MIN_R,vx:0,vy:0,age:0,score:0,factor:1,wind:0,fanX:W/2,fanTarget:W/2,fanVelocity:0,blowing:false,reason:'',time:0});}
 start(){if(this.phase!=='ready')return false;this.phase='inflate';this.blowing=true;return true}
 release(){if(this.phase!=='inflate')return false;this.phase='float';this.blowing=false;this.factor=(this.r/MIN_R)**2;this.vy=-27;return true}
 pop(reason){if(this.phase==='pop')return;this.phase='pop';this.reason=reason;this.blowing=false}
 step(dt,fan=false,power=1){if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);let n=Math.ceil(dt/(1/120));for(let i=0;i<n;i++)this.tick(dt/n,fan,power)}
 tick(dt,fan,power){this.time+=dt;if(this.phase==='inflate'){this.r+=17*dt*Math.max(.2,power);this.y=586-this.r;if(this.r>=MAX_R){this.r=MAX_R;this.pop('too-big')}return}if(this.phase!=='float')return;if(this.x-this.r<=0||this.x+this.r>=W||this.y-this.r<=0||this.y+this.r>=H){this.pop('edge');return}
 const old=this.fanX;this.fanX+=(this.fanTarget-this.fanX)*(1-Math.exp(-dt*15));this.fanVelocity=(this.fanX-old)/dt;
 this.wind+=((fan?1:0)-this.wind)*(1-Math.exp(-dt*(fan?5:2.5)));
 const reach=Math.exp(-(((this.x-this.fanX)/135)**2));const ax=(this.fanX-this.x)*.52*this.wind+Math.sin(this.age*.95)*7+this.fanVelocity*.045*this.wind;
 const ay=10-22*Math.exp(-this.age/5)-43*this.wind*reach;
 this.vx=(this.vx+ax*dt)*Math.exp(-dt*.32);this.vy=(this.vy+ay*dt)*Math.exp(-dt*.12);
 this.x+=this.vx*dt;this.y+=this.vy*dt;this.age+=dt;this.score=this.factor*this.age;
 if(this.x-this.r<=0||this.x+this.r>=W||this.y-this.r<=0||this.y+this.r>=H)this.pop('edge');
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
