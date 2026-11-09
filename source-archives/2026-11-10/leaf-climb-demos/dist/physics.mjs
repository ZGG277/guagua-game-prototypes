export const DT = 1 / 120;
export const G = 820;
export const R = 13;
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const MODES = {
  A: { name: '蓄力一跃', verb: '掌握力度', description: '按住蓄力，拖动瞄准，松手起跳。', hint: '按住空白处蓄力 · 拖动改变方向 · 松手跳', question: '差一点落上去，会让你想再蓄力一次吗？', leaves: [[120,790],[300,650],[130,510],[300,370],[150,230]] },
  B: { name: '伸手攀藤', verb: '亲手够到', description: '拖动小手抓住光点，再向下拖动收臂。', hint: '按住拖向光点 · 抓住后向下拖收臂 · 松手甩出', question: '手指差一点抓住时，你想立刻再够一次吗？', leaves: [[135,790],[285,672],[135,554],[285,436],[150,318]] },
  C: { name: '借势摆荡', verb: '等待时机', description: '随藤蔓摆动，轻点松手，让惯性带你落下。', hint: '观察摆动 · 轻点画面松手 · 落叶后自动挂藤', question: '放早或放晚一点，会让你想再等一摆吗？', leaves: [[125,790],[305,720],[125,650],[305,580],[135,510]] }
};
export function classifyMiss(x, leaf, originX) {
  const direction = Math.sign(leaf.x-originX)||1;
  const offset = x-leaf.x;
  const gap = Math.max(0, Math.abs(offset)-(leaf.w/2-R));
  return { kind: gap < .000001 ? 'hit' : offset*direction < 0 ? 'short' : 'long', gap: gap > 0 ? Math.max(1, Math.round(gap)) : 0, x, y: leaf.y, targetX: leaf.x, edgeX: leaf.x+Math.sign(offset)*(leaf.w/2-R), direction };
}
export class Engine {
  constructor(mode='A') { this.reset(mode); }
  reset(mode=this.mode) {
    if (!MODES[mode]) throw new Error('Unknown mode');
    this.mode=mode; this.leaves=MODES[mode].leaves.map(([x,y],i)=>({x,y,w: i===0?112:100,i,bend:0,bendV:0}));
    this.index=0; this.time=0; this.events=[]; this.trail=[]; this.feedback=null; this.feedbackUntil=0; this.completed=false; this.input=null;
    this.phase=0; this.cameraY=0; this.fallPenalty=null; this.spawn(0); return this;
  }
  target() { return this.leaves[Math.min(this.index+1,this.leaves.length-1)]; }
  direction() { return Math.sign(this.target().x-this.leaves[this.index].x)||1; }
  spawn(index) {
    this.index=clamp(index,0,this.leaves.length-1); const l=this.leaves[this.index];
    this.body={x:l.x,y:l.y-R,vx:0,vy:0}; this.status='grounded'; this.input=null; this.arm=null; this.rope=null; this.flight=null; this.trail=[]; this.fallPenalty=null;
    this.completed=this.index===this.leaves.length-1;
    if(this.mode==='C'&&!this.completed) this.hang();
  }
  hang() {
    const l=this.leaves[this.index], d=this.direction(), pivot={x:l.x-d*20,y:l.y-175};
    const length=Math.hypot(this.body.x-pivot.x,this.body.y-pivot.y);
    const theta=Math.atan2(this.body.x-pivot.x,this.body.y-pivot.y);
    this.rope={pivot,length,phase:Math.asin(clamp(theta/(d*1.18),-.95,.95)),direction:d};
    this.status='hanging'; this.flight=null;
  }
  retry() { const i=this.fallPenalty??this.index; this.feedback=null; this.spawn(i); this.events.push({type:'retry',index:i}); }
  down(x,y) {
    if(this.completed||this.input) return false;
    if(this.mode==='A'&&this.status==='grounded') { this.input={x,y,startX:x,startY:y,held:0,angle:Math.atan2(-.91,this.direction()*.415)}; return true; }
    if(this.mode==='B') { this.input={x,y,startX:x,startY:y,held:0}; this.arm={x:this.body.x,y:this.body.y-4,grip:null}; return true; }
    if(this.mode==='C'&&this.status==='hanging') { this.launch(this.body.vx,this.body.vy); this.input={x,y,startX:x,startY:y,held:0}; return true; }
    return false;
  }
  move(x,y) {
    if(!this.input) return;
    this.input.x=x; this.input.y=y;
    if(this.mode==='A') { const dx=x-this.input.startX,dy=y-this.input.startY; if(Math.hypot(dx,dy)>13) this.input.angle=clamp(Math.atan2(Math.min(dy,-8),dx),-Math.PI+.18,-.18); }
  }
  up() {
    if(!this.input) return;
    if(this.mode==='A'&&this.status==='grounded') {
      const speed=290+310*clamp(this.input.held/1.05,0,1); const a=this.input.angle; this.launch(Math.cos(a)*speed,Math.sin(a)*speed);
    } else if(this.mode==='B'&&this.status==='gripping') this.launch(this.body.vx,this.body.vy);
    this.input=null; this.arm=null;
  }
  cancel() {
    if(this.mode==='B'&&this.status==='gripping') this.launch(this.body.vx,this.body.vy);
    this.input=null; this.arm=null;
  }
  launch(vx,vy) {
    this.body.vx=vx;this.body.vy=vy; this.status='flying'; this.rope=null;
    this.flight={origin:this.index,originX:this.body.x,start:this.time,checked:false,minDistance:Infinity};
    this.feedback=null;this.trail=[];this.events.push({type:'launch',vx,vy,index:this.index});
  }
  miss(data) {
    if(this.flight?.checked) return;
    if(this.flight) this.flight.checked=true;
    this.feedback={...data,type:'miss',time:this.time}; this.feedbackUntil=this.time+5;
    this.fallPenalty=Math.max(0,this.index-1); this.events.push(this.feedback);
  }
  land(i) {
    const l=this.leaves[i],old=this.index;
    this.body.y=l.y-R; this.body.vx=0;this.body.vy=0;this.status='grounded';this.rope=null;this.flight=null;this.arm=null;this.input=null;this.fallPenalty=null;
    this.index=i; l.bendV=42; this.completed=i===this.leaves.length-1;
    if(i>old) { this.feedback={type:'land',index:i,time:this.time};this.feedbackUntil=this.time+1.7;this.events.push(this.feedback); }
    else if(i<old) { this.events.push({type:'fall',from:old,to:i}); }
    if(this.mode==='C'&&!this.completed) this.hang();
  }
  step(dt=DT) {
    this.time+=dt;
    for(const l of this.leaves) { l.bendV+=(-130*l.bend-9*l.bendV)*dt;l.bend+=l.bendV*dt; }
    if(this.input) this.input.held+=dt;
    if(this.completed) return;
    if(this.status==='hanging') {
      const r=this.rope;r.phase+=2.8*dt;
      const theta=r.direction*1.18*Math.sin(r.phase),omega=r.direction*1.18*2.8*Math.cos(r.phase);
      this.body.x=r.pivot.x+r.length*Math.sin(theta);this.body.y=r.pivot.y+r.length*Math.cos(theta);
      this.body.vx=r.length*Math.cos(theta)*omega;this.body.vy=-r.length*Math.sin(theta)*omega;
      return;
    }
    if(this.mode==='B'&&this.input&&this.arm&&!this.arm.grip) {
      const b=this.body,dx=this.input.x-b.x,dy=this.input.y-b.y,d=Math.hypot(dx,dy)||1;
      const dest={x:b.x+dx*Math.min(1,280/d),y:b.y+dy*Math.min(1,280/d)};
      const hx=dest.x-this.arm.x,hy=dest.y-this.arm.y,hd=Math.hypot(hx,hy)||1;
      this.arm.x+=hx*Math.min(1,950*dt/hd);this.arm.y+=hy*Math.min(1,950*dt/hd);
      const candidates=this.leaves.filter(l=>l.i<=this.index+1&&!this.completed);
      for(const l of candidates) { const anchor={x:l.x,y:l.y-58};
        if(Math.hypot(this.input.x-anchor.x,this.input.y-anchor.y)<48&&Math.hypot(this.arm.x-anchor.x,this.arm.y-anchor.y)<25&&Math.hypot(b.x-anchor.x,b.y-anchor.y)<=282) {
          const length=Math.hypot(b.x-anchor.x,b.y-anchor.y);
          this.arm.grip={anchor,leaf:l.i,length,startLength:length,startY:this.input.y,startX:this.input.x};
          this.arm.x=anchor.x;this.arm.y=anchor.y;this.status='gripping';
          if(!this.flight) this.flight={origin:this.index,originX:b.x,start:this.time,checked:false,minDistance:Infinity};
          this.events.push({type:'grip',index:l.i});break;
        }
      }
    }
    if(this.status==='grounded') return;
    const b=this.body,prev={x:b.x,y:b.y};
    b.vy+=G*dt;
    if(this.status==='gripping') {
      const g=this.arm?.grip;
      if(!g) {this.status='flying';return;}
      const desired=clamp(g.startLength-(this.input.y-g.startY)*1.15,36,280);
      g.length+=clamp(desired-g.length,-270*dt,270*dt);
      b.vx+=clamp((this.input.x-g.startX)*5,-440,440)*dt;
      b.vx*=Math.exp(-.24*dt);b.vy*=Math.exp(-.1*dt);
    }
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    if(this.status==='gripping') {
      const g=this.arm.grip,dx=b.x-g.anchor.x,dy=b.y-g.anchor.y,len=Math.hypot(dx,dy)||1;
      if(len>g.length) {
        const nx=dx/len,ny=dy/len;b.x=g.anchor.x+nx*g.length;b.y=g.anchor.y+ny*g.length;
        const outward=b.vx*nx+b.vy*ny;if(outward>0){b.vx-=nx*outward;b.vy-=ny*outward;}
      }
      const l=this.leaves[g.leaf];
      if(g.leaf===this.index+1&&g.length<61&&Math.hypot(b.x-l.x,b.y-(l.y-R))<55) {this.land(g.leaf);return;}
    }
    if(this.flight) {
      const t=this.target();this.flight.minDistance=Math.min(this.flight.minDistance,Math.hypot(b.x-t.x,b.y-(t.y-R)));
      if(!this.flight.checked&&this.mode!=='B'&&b.vy>=0) {
        if(prev.y<=t.y-R&&b.y>=t.y-R) {
          const u=(t.y-R-prev.y)/(b.y-prev.y||1),x=prev.x+(b.x-prev.x)*u;
          const miss=classifyMiss(x,t,this.flight.originX);
          if(miss.kind==='hit'){b.x=x;this.land(t.i);return;}this.miss(miss);
        } else if(b.y>t.y-R&&prev.y<b.y&&this.time-this.flight.start>.06) {
          this.miss({kind:'height',gap:Math.max(1,Math.round(b.y-(t.y-R))),x:b.x,y:b.y,targetX:t.x});
        }
      }
    }
    if(b.vy>0) {
      for(let i=this.index+1;i>=0;i--) { const l=this.leaves[i];
        if(i===this.index&&this.flight&&this.time-this.flight.start<.15)continue;
        if(prev.y+R<=l.y&&b.y+R>=l.y) {
          const u=(l.y-R-prev.y)/(b.y-prev.y||1),x=prev.x+(b.x-prev.x)*u;
          if(Math.abs(x-l.x)<=l.w/2-R) {b.x=x;this.land(i);return;}
        }
      }
    }
    if(this.mode==='B'&&!this.flight?.checked&&b.y>this.leaves[this.index].y+90) this.miss({kind:'reach',gap:Math.round(this.flight?.minDistance??0),x:b.x,y:b.y,targetX:this.target().x});
    if(b.y>this.leaves[0].y+150||b.x< -180||b.x>620) {
      if(!this.feedback||this.feedback.type!=='miss') this.miss({kind:'fall',gap:Math.round(this.flight?.minDistance??0),x:b.x,y:b.y,targetX:this.target().x});
      const feedback=this.feedback,from=this.index;this.spawn(0);this.feedback=feedback;this.events.push({type:'fall',from,to:0});
    }
    if(this.status==='flying'&&Math.floor(this.time/ .04)!==Math.floor((this.time-dt)/.04)) {this.trail.push({x:b.x,y:b.y});if(this.trail.length>25)this.trail.shift();}
  }
  advance(seconds) { for(let n=0;n<Math.round(seconds/DT);n++)this.step();return this; }
  snapshot() { return {mode:this.mode,index:this.index,status:this.status,completed:this.completed,body:{...this.body},feedback:this.feedback?{...this.feedback}:null,input:!!this.input}; }
}
