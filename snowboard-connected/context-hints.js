// Presentation only: reads riding state without changing controls or progress.
export class ContextHints {
 constructor(){this.seen=new Set();this.reset();}
 reset(){this.text='';this.remaining=0;this.quiet=1;this.elapsed=0;this.hadPair=false;this.feature=null;}
 update(dt,{playing,paired,oneFoot,state,input,trail,obstacles=[],jumps=[]}){
  if(!playing)return this.text;
  this.elapsed+=dt;this.hadPair||=paired;
  this.remaining=Math.max(0,this.remaining-dt);this.quiet=Math.max(0,this.quiet-dt);
  if(!this.remaining)this.text='';
  const moved=Math.max(...Object.values(input).map(Math.abs))>.2;
  if(moved)this.seen.add('controls');
  if(state.jumpCount>0)this.seen.add('jump');
  const ahead=o=>o.z-state.z>0&&o.z-state.z<Math.max(30,Math.hypot(state.vx,state.vz)*3);
  const hazard=obstacles.find(ahead);
  // Route cues take priority and expire when the feature is behind the rider.
  if(this.feature&&this.feature.z<=state.z){this.text='';this.remaining=0;this.feature=null;}
  if(hazard&&!this.seen.has('obstacles'))return this.show('obstacles','前方有障碍，提前绕开',hazard);
  if(trail&&state.z>1808&&state.z<2008&&!this.seen.has('fork'))return this.show('fork','前方分岔：向左松林缓线，向右雪脊线',{z:2208});
  const jump=jumps.find(ahead)||(trail&&state.z>630&&state.z<672?{z:672}:null);
  if(jump&&!this.seen.has('jump'))return this.show('jump','轻点雪面，试着跳起',jump);
  if(this.text||this.quiet)return this.text;
  if(this.elapsed>1&&!moved&&!this.seen.has('controls'))return this.show('controls','拖动两侧圆环，调整重心与板刃');
  if(this.hadPair&&oneFoot&&!this.seen.has('one-foot'))return this.show('one-foot','松开一手，另一手仍可控板');
  if(trail&&state.z>600&&Math.hypot(state.vx,state.vz)>13&&Math.abs(state.edge)<.25&&!this.seen.has('brake'))return this.show('brake','上下拖动圆环立刃，放慢速度');
  return this.text;
 }
 show(id,text,feature=null){this.seen.add(id);this.text=text;this.remaining=3.5;this.quiet=6;this.feature=feature;return text;}
}
