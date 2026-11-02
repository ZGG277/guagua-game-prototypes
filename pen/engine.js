export class CircleTracker {
  constructor(minRadius=30){this.minRadius=minRadius;this.reset();}
  reset(){this.last=null;this.angle=0;this.bounds=null;}
  move(x,y){
    const r=Math.hypot(x,y), a=Math.atan2(y,x);
    if(r<this.minRadius){this.reset();return {count:0,moving:false};}
    if(this.last===null){this.last=a;this.bounds=[x,y,x,y];return {count:0,moving:false};}
    let d=Math.atan2(Math.sin(a-this.last),Math.cos(a-this.last));this.last=a;
    if(Math.abs(d)>.8){this.angle=0;this.bounds=[x,y,x,y];return {count:0,moving:false};}
    this.angle+=d;const b=this.bounds;b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y);
    let count=0;if(Math.abs(this.angle)>=Math.PI*2-1e-8){if(b[2]-b[0]>=this.minRadius*2&&b[3]-b[1]>=this.minRadius*2)count=1;this.angle-=Math.sign(this.angle)*Math.PI*2;this.bounds=[x,y,x,y];}
    return {count,moving:Math.abs(d)>1e-6};
  }
}
export class Game {
  constructor(random=Math.random){this.random=random;this.reset();}
  range(a,b){return a+this.random()*(b-a);}
  reset(){this.time=0;this.score=0;this.phase='playing';this.reason='';this.teacher='safe';this.teacherUntil=this.range(4,7);this.motionUntil=0;this.paused=false;}
  stop(){this.motionUntil=0;}
  move(){if(this.phase!=='playing'||this.paused)return;this.motionUntil=this.time+.14;if(this.teacher==='watch')this.finish('caught');}
  add(n){if(this.phase==='playing'&&!this.paused)this.score+=n;}
  finish(reason){this.phase='over';this.reason=reason;this.stop();}
  step(dt){if(this.phase!=='playing'||this.paused)return;let remaining=Number.isFinite(dt)?Math.max(0,Math.min(dt,60)):0;while(remaining>0&&this.phase==='playing'){let d=Math.min(.02,remaining);remaining-=d;this.time+=d;
    if(this.time>=60){this.time=60;this.finish('time');break;}
    if(this.time>=this.teacherUntil){if(this.teacher==='safe'){this.teacher='warning';this.teacherUntil=this.time+2.2;}else if(this.teacher==='warning'){this.teacher='watch';this.teacherUntil=this.time+1;this.stop();}else{this.teacher='safe';this.teacherUntil=this.time+this.range(4,7);}}
  }}
}
