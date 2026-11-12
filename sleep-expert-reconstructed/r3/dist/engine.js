export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const PHASES=['rock','pat','lower','leg','head','settle','sleeping'];
export const SOURCES=[
 {id:'phone',name:'手机来电',hint:'亮屏了，快按掉',x:338,y:118,w:40,h:52,lead:4.2},
 {id:'ledge',name:'桌边小猪',hint:'小猪滑到桌边了',x:338,y:231,w:56,h:54,lead:4.6},
 {id:'bell',name:'滚动铃铛',hint:'小铃铛滚起来了',x:43,y:367,w:52,h:42,lead:4.4},
 {id:'door',name:'有人敲门',hint:'门把手在动',x:43,y:145,w:52,h:82,lead:3.9},
 {id:'cat',name:'猫碰杯子',hint:'杯子快倒了',x:337,y:346,w:60,h:65,lead:4.1},
 {id:'clock',name:'闹钟',hint:'指针快到了',x:47,y:439,w:50,h:48,lead:3.8},
 {id:'toy',name:'发声玩具',hint:'玩具自己启动了',x:329,y:462,w:64,h:45,lead:3.7},
 {id:'window',name:'窗页晃动',hint:'窗要被风吹响',x:43,y:286,w:52,h:65,lead:4.1},
];
export const SOURCE_HIT_SIZE=68;
export function sourceAt(x,y,active=[]){const label=SOURCES.find(s=>active.includes(s.id)&&Math.abs(x-s.x)<=22&&y>=s.y+s.h*.54&&y<=s.y+s.h*.54+16);if(label)return label.id;return SOURCES.filter(s=>Math.abs(x-s.x)<=Math.max(SOURCE_HIT_SIZE,s.w)/2&&Math.abs(y-s.y)<=Math.max(SOURCE_HIT_SIZE,s.h)/2).sort((a,b)=>(Number(active.includes(b.id))-Number(active.includes(a.id)))||((x-a.x)**2+(y-a.y)**2-(x-b.x)**2-(y-b.y)**2))[0]?.id||'baby';}
export const RHYTHM={pat:{period:.84,gain:.15},settle:{period:1.02,gain:.22}};
export function createGame(){return {rockTheta:0,rockAmplitude:.22,rockLastVertex:-99,rockPending:null,handDown:false,handArmed:false,handLocked:false,handCycle:-1,handCycleProgress:0,handCycles:0,handReason:'wait',phase:'rock',time:0,phaseTime:0,sleep:14,arousal:0,progress:0,lastBeat:-1,lastTap:-99,hit:0,feedback:'',feedbackTime:0,lower:0,leg:0,head:0,balance:0,stable:0,rest:0,totalRest:0,mamaRest:0,best:0,noiseSerial:0,eventSerial:0,nextEvent:5,events:[],eventHistory:[],cleared:0,wakes:0,notice:'',noticeTime:0,complete:false,transitions:[]};}
export function signal(s,t){s.notice=t;s.noticeTime=2.5;}
export function change(s,p){s.phase=p;s.phaseTime=0;s.progress=0;s.lastBeat=-1;s.lastTap=-99;s.stable=0;s.transitions.push(p);resetInput(s);if(p==='rock'){s.rockTheta=0;s.rockAmplitude=.22;s.rockLastVertex=-99;s.rockPending=null;}if(p==='leg'||p==='head'){s.handCycle=-1;s.handCycleProgress=0;s.handCycles=0;}if(p==='sleeping')s.complete=false;}
// Deterministic damped oscillator: one inward impulse per turning point.
export const ROCK={period:2.6,windowRatio:.72,maxAmplitude:.50,minAmplitude:.035,cooldown:.35,gain:.14};
export const HAND={period:3.8,start:2.2,settle:.25,finishSettle:.65,leg:{window:.50,cap:.25,minCycles:4,distance:100,maxSpeed:90},head:{window:.35,cap:.20,minCycles:5,distance:80,maxSpeed:75}};
const finite=v=>Number.isFinite(v)?v:0;
export function resetInput(s){s.handDown=false;s.handArmed=false;s.handLocked=false;s.stable=0;s.rockPending=null;}
export function rockInfo(s){
 const theta=s.rockTheta,amplitude=s.rockAmplitude,angle=Math.sin(theta)*amplitude,velocity=Math.cos(theta)*amplitude*2*Math.PI/ROCK.period;
 const vertex=Math.round((theta-Math.PI/2)/Math.PI),near=Math.abs(Math.sin(theta))>=ROCK.windowRatio;
 return {angle,amplitude,velocity,vertex,side:angle>=0?'right':'left',pending:s.rockPending!==null,canTap:(near||amplitude<.06)&&vertex!==s.rockLastVertex&&s.time-s.lastTap>=ROCK.cooldown};
}
export function handInfo(s){
 if(s.phase!=='leg'&&s.phase!=='head')return null;const cfg=HAND[s.phase];
 const cycle=Math.floor(s.phaseTime/HAND.period),position=s.phaseTime-cycle*HAND.period;
 const open=position>=HAND.start&&position<HAND.start+cfg.window;
 return {open,cycle,position,untilOpen:position<HAND.start?HAND.start-position:HAND.period-position+HAND.start,windowLeft:open?HAND.start+cfg.window-position:0,direction:s.phase==='leg'?1:-1,reason:s.handReason,cycles:s.handCycles,minCycles:cfg.minCycles,cycleProgress:s.handCycleProgress,window:cfg.window};
}
function rockPush(s){const r=rockInfo(s),angle=r.angle;s.rockAmplitude=Math.min(ROCK.maxAmplitude,s.rockAmplitude+.07);/* Preserve position; add only inward velocity by advancing oscillator phase. */s.rockTheta=Math.PI/2+r.vertex*Math.PI+Math.acos(clamp(Math.abs(angle)/s.rockAmplitude,0,1));s.progress=clamp(s.progress+ROCK.gain,0,1);s.sleep=14+s.progress*31;s.arousal=Math.max(0,s.arousal-4);s.hit=1;s.feedback='顺势向内推';s.feedbackTime=.7;if(s.progress>=.999){change(s,'pat');signal(s,'换轻拍，节奏变快一点。');}}
function rockTap(s){
 const r=rockInfo(s);if(s.time-s.lastTap<ROCK.cooldown){s.lastTap=s.time;return 'spam';}s.lastTap=s.time;
 if(!r.canTap){s.arousal=clamp(s.arousal+2,0,100);s.feedback='等摇篮到顶点';s.feedbackTime=.7;return 'miss';}
 s.rockLastVertex=r.vertex;
 if(r.amplitude<.06){s.rockAmplitude=.16;rockPush(s);return 'restart';}
 const apex=Math.PI/2+r.vertex*Math.PI;
 if(s.rockTheta<apex-1e-9){s.rockPending=apex;s.feedback='接住了，等它转回来';s.feedbackTime=.7;return 'queued';}
 rockPush(s);return 'good';
}
const HAND_REASONS={wait:'等呼气的短窗口',ready:'现在，轻轻抽一点',release:'松开，下一口气再来',steady:'先停稳，再轻轻抽',direction:'方向反了，松开重来',fast:'太快了，松开后慢一点',slow:'轻轻滑动，不要猛拉',window:'错过窗口，松开等下一口气',cap:'这一口气够了，松开停稳',moving:'很好，慢慢抽',finish:'抽出来了，松开停稳'};
function handFeedback(s,reason){s.handReason=reason;s.feedback=HAND_REASONS[reason];s.feedbackTime=.7;}
function handStep(s,input,dt,before){
 const cfg=HAND[s.phase],info=handInfo(s),down=!!input.down,dx=down?finite(input.dx):0,move=dx*info.direction,speed=Math.abs(dx)/dt;
 if(info.cycle!==s.handCycle){s.handCycle=info.cycle;s.handCycleProgress=0;}
 const wasStable=s.stable;
 if(!down||speed<8)s.stable+=dt;else s.stable=0;
 if(!down){s.handArmed=false;s.handLocked=false;handFeedback(s,s[s.phase]>=.999?'finish':info.open?'ready':'wait');}
 else if(!s.handDown){
  s.handArmed=info.open&&wasStable>=HAND.settle;s.handLocked=!s.handArmed;
  if(!s.handArmed)handFeedback(s,!info.open?'window':'steady');
 }
 if(down&&Math.abs(dx)>0){
  let reason='';
  if(s.handLocked||!s.handArmed)reason='release';
  else if(!info.open||before<HAND.start+info.cycle*HAND.period)reason='window';
  else if(move<=0)reason='direction';
  else if(speed>cfg.maxSpeed+1e-6)reason='fast';
  else if(speed<12)reason='slow';
  else if(s.handCycleProgress>=cfg.cap-1e-9)reason='cap';
  if(reason){s.handLocked=true;s.handArmed=false;handFeedback(s,reason);s.arousal+=dt*(reason==='cap'?0:18);}
  else {const gain=Math.min(move/cfg.distance,cfg.cap-s.handCycleProgress,1-s[s.phase]);if(gain>0){if(s.handCycleProgress===0)s.handCycles++;s.handCycleProgress+=gain;s[s.phase]=clamp(s[s.phase]+gain,0,1);}handFeedback(s,'moving');s.arousal=Math.max(0,s.arousal-dt*2);}
 }
 if(!down||speed<8)s.arousal=Math.max(0,s.arousal-dt*8);
 s.handDown=down;
 if(s[s.phase]>=1-1e-8&&s.handCycles>=cfg.minCycles&&!down&&s.stable>=HAND.finishSettle&&s.arousal<32){s[s.phase]=1;if(s.phase==='leg'){change(s,'head');signal(s,'腿下的手出来了，头下的手再慢一点。');}else{change(s,'settle');signal(s,'都抽出来了。在床上再轻拍几下。');}}
}
export function isInhale(s){const t=(s.phase==='leg'||s.phase==='head')?s.phaseTime:s.time;return Math.sin(t*2*Math.PI/HAND.period)>.1;}
export function rhythmInfo(s){const r=RHYTHM[s.phase];if(!r)return null;const fraction=(s.phaseTime%r.period)/r.period;return {period:r.period,fraction,distance:Math.min(fraction,1-fraction)*r.period,beat:Math.round(s.phaseTime/r.period)};}
export function noiseWake(s,source='响动'){s.noiseSerial++;s.wakes++;s.arousal=100;s.sleep=0;s.rest=0;s.mamaRest=Math.max(0,s.mamaRest-.12);s.events=[];s.lower=0;s.leg=0;s.head=0;change(s,'awake');signal(s,`${source}响了！一下惊醒了。`);}
function gradualWake(s){s.wakes++;s.sleep=12;s.rest=0;s.events=[];s.lower=0;s.leg=0;s.head=0;change(s,'awake');signal(s,'越来越清醒了……重新抱稳。');}
export function tap(s,target='baby'){
 if(s.phase==='sleeping'){
  const e=s.events.find(e=>e.id===target&&e.status==='warning');if(!e)return 'empty';e.status='saved';e.fade=1.15;s.cleared++;s.eventHistory.push({id:e.id,result:'saved'});signal(s,e.id==='ledge'?'扶住小猪，没掉下去。':e.id==='bell'?'按住铃铛，安静了。':'嘘，消灭一个响动。');return 'saved';
 }
 if(s.phase==='rock'&&target==='baby')return rockTap(s);
 const r=RHYTHM[s.phase];if(!r||target!=='baby')return 'ignored';
 if(s.time-s.lastTap<.22){s.arousal=clamp(s.arousal+1.4,0,100);return 'spam';}s.lastTap=s.time;
 const beat=rhythmInfo(s);if(beat.distance<=.20&&beat.beat!==s.lastBeat){s.lastBeat=beat.beat;const perfect=beat.distance<=.105;s.progress=clamp(s.progress+r.gain*(perfect?1:.7),0,1);s.arousal=Math.max(0,s.arousal-4);s.hit=1;s.feedback=perfect?'正好':'跟上了';s.feedbackTime=.65;const base=s.phase==='rock'?14:s.phase==='pat'?45:90;const span=s.phase==='rock'?31:s.phase==='pat'?40:10;s.sleep=base+s.progress*span;if(s.progress>=.999){if(s.phase==='rock'){change(s,'pat');signal(s,'换轻拍，节奏变快一点。');}else if(s.phase==='pat'){s.sleep=85;change(s,'lower');signal(s,'睡了。托稳头和腿，慢慢放。');}else{s.sleep=100;change(s,'sleeping');s.nextEvent=5;s.events=[];signal(s,'终于睡了。留心床边的动静。');}}return perfect?'perfect':'good';}
 s.arousal=clamp(s.arousal+4,0,100);s.progress=Math.max(0,s.progress-.015);s.feedback='等节奏点';s.feedbackTime=.65;return 'miss';
}
export function step(s,input={},dt=1/60){dt=clamp(finite(dt),0,.05);if(!dt)return s;const before=s.phaseTime;s.time+=dt;s.phaseTime+=dt;s.noticeTime=Math.max(0,s.noticeTime-dt);s.feedbackTime=Math.max(0,s.feedbackTime-dt);s.hit=Math.max(0,s.hit-dt*3.8);const down=!!input.down;const dx=down?(input.dx||0):0;const speed=down?Math.abs(input.vx||0):0;
 if(s.phase==='rock'){s.rockTheta+=dt*2*Math.PI/ROCK.period;s.rockAmplitude=Math.max(ROCK.minAmplitude,s.rockAmplitude*Math.exp(-dt*.045));if(s.rockPending!==null&&s.rockTheta>=s.rockPending){s.rockPending=null;rockPush(s);}s.arousal=Math.max(0,s.arousal-dt*2.4);}
 else if(RHYTHM[s.phase])s.arousal=Math.max(0,s.arousal-dt*2.4);
 else if(s.phase==='lower'){
  const drift=input.absoluteBalance?0:Math.sin(s.time*1.05)*.29+Math.sin(s.time*.57+1)*.11;const target=clamp(input.balance||0,-1,1)+drift;s.balance+=(target-s.balance)*Math.min(1,dt*5);const off=Math.abs(s.balance);
  if(off>.19)s.arousal+=(off-.19)*45*dt;else s.arousal-=7*dt;
  if(down&&s.arousal<74){const rate=off<.18?1:off<.34?.32:0;s.lower=clamp(s.lower+dt*.16*rate,0,1);}
  if(s.lower>=.999&&off<.19){s.stable+=dt;if(s.stable>.65){s.lower=1;change(s,'leg');signal(s,'先抽右手，腿下面的那只。');}}else s.stable=0;
 }else if(s.phase==='leg'||s.phase==='head'){
  handStep(s,input,dt,before);
 }else if(s.phase==='sleeping'){
  s.rest+=dt;s.totalRest+=dt;s.best=Math.max(s.best,s.rest);s.mamaRest=clamp(s.mamaRest+dt/70,0,1);s.arousal=Math.max(0,s.arousal-dt*7);
  if(s.rest>=60-1e-8&&!s.complete){s.complete=true;signal(s,'守住一小觉。继续帮妈妈回血。');}
  if(s.phaseTime>=s.nextEvent){const src=SOURCES[s.eventSerial%SOURCES.length];s.eventSerial++;if(!s.events.some(e=>e.id===src.id&&e.status==='warning'))s.events.push({...src,status:'warning',left:src.lead,fade:0});s.nextEvent=s.phaseTime+(s.rest>45?2.9:6.1);}
  for(const e of s.events){if(e.status==='warning'){e.left-=dt;if(e.left<=0){s.eventHistory.push({id:e.id,result:'missed'});noiseWake(s,e.name);break;}}else e.fade-=dt;}s.events=s.events.filter(e=>e.status==='warning'||e.fade>0);
 }else if(s.phase==='awake'){
  if(s.phaseTime>2.2){s.arousal=22;change(s,'rock');}
 }
 if(s.phase!=='awake'&&s.arousal>=100)gradualWake(s);
 s.arousal=clamp(s.arousal,0,100);s.sleep=clamp(s.sleep,0,100);return s;
}
export function getHint(s){
 if(s.phase==='awake')return '醒了！先重新抱稳。';
 if(s.arousal>67&&s.phase!=='sleeping')return '快醒了，先停稳。';
 if(s.phase==='rock')return rockInfo(s).canTap?'到顶点了，轻点向内推':'等摇篮到左边或右边顶点，轻点一下';
 if(s.phase==='pat')return '右下轻点，跟上轻拍的新节奏';
 if(s.phase==='lower')return Math.abs(s.balance)>.19?'偏了，左右微调，把小球留在中央':'保持平衡，按住宝宝缓慢放下';
 if(s.phase==='leg'||s.phase==='head')return HAND_REASONS[s.handReason]||'等呼气的短窗口';
 if(s.phase==='settle')return '放好了，在右下再轻拍几下';
 const e=s.events.find(e=>e.status==='warning');return e?`${e.hint}，点它！`:'守住这一小觉，哪里要响就点哪里';
}
