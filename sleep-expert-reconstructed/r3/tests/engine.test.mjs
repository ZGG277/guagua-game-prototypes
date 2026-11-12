import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,step,tap,change,rhythmInfo,RHYTHM,isInhale,SOURCES,noiseWake,sourceAt,SOURCE_HIT_SIZE,ROCK,HAND,rockInfo,handInfo,resetInput} from '../dist/engine.js';
const run=(s,secs,fn=()=>({}))=>{for(let i=0;i<Math.ceil(secs*60);i++)step(s,fn(s),1/60);return s};
function rhythm(s){const phase=s.phase;for(let i=0;i<1800&&s.phase===phase;i++){if(phase==='rock'){if(rockInfo(s).canTap)tap(s);}else{const beat=rhythmInfo(s);if(beat.distance<.03&&beat.beat!==s.lastBeat)tap(s);}step(s,{},1/60)}assert.notEqual(s.phase,phase);}
function lower(s){for(let i=0;i<1200&&s.phase==='lower';i++){const t=s.time+1/60;const drift=Math.sin(t*1.05)*.29+Math.sin(t*.57+1)*.11;step(s,{down:true,balance:-drift},1/60)}assert.equal(s.phase,'leg')}
function handInput(s,dt=1/60){const h=handInfo(s);if(!h)return {};const cfg=HAND[s.phase];return h.open&&h.windowLeft>dt&&h.cycleProgress<cfg.cap-1e-8?{down:true,dx:h.direction*(s.phase==='leg'?80:65)*dt}:{};}
function hands(s,fps=60){for(const phase of ['leg','head']){assert.equal(s.phase,phase);for(let i=0;i<60*fps&&s.phase===phase;i++)step(s,handInput(s,1/fps),1/fps);assert.notEqual(s.phase,phase)}}
function fullCycle(s){rhythm(s);assert.equal(s.phase,'pat');rhythm(s);assert.equal(s.phase,'lower');lower(s);hands(s);assert.equal(s.phase,'settle');rhythm(s);assert.equal(s.phase,'sleeping');}

test('full sequence reaches sleep in exact order',()=>{const s=createGame();fullCycle(s);assert.deepEqual(s.transitions,['pat','lower','leg','head','settle','sleeping']);assert.equal(s.sleep,100)});
test('rock and pat have independent rhythms',()=>{assert.notEqual(ROCK.period,RHYTHM.pat.period);assert.notEqual(RHYTHM.pat.period,RHYTHM.settle.period)});
test('waiting and holding do not advance rhythm',()=>{const s=createGame();run(s,45,()=>({down:true}));assert.equal(s.phase,'rock');assert.equal(s.progress,0)});
test('one rhythm beat can only score once',()=>{const s=createGame();tap(s);const before=s.progress;tap(s);assert.equal(s.progress,before)});
test('correct timing is better than offbeat tapping',()=>{const a=createGame(),b=createGame();run(a,.65);tap(a);run(b,.2);assert.equal(tap(b),'miss');assert.ok(a.progress>b.progress);assert.ok(b.arousal>0)});
test('continuous spam does not become a winning sequence',()=>{const s=createGame();for(let i=0;i<900;i++){tap(s);step(s,{},1/60)}assert.notEqual(s.phase,'sleeping');assert.notEqual(s.phase,'lower')});
test('lowering requires a hold and balance',()=>{const s=createGame();change(s,'lower');s.sleep=85;run(s,4,()=>({balance:0}));assert.equal(s.lower,0);run(s,2,()=>({down:true,balance:1}));assert.ok(s.lower<.1)});
test('imbalance raises arousal gradually before full wake',()=>{const s=createGame();change(s,'lower');s.sleep=85;run(s,1,()=>({down:true,balance:.9}));assert.equal(s.phase,'lower');assert.ok(s.arousal>5&&s.arousal<100);run(s,4,()=>({down:true,balance:1}));assert.ok(s.wakes>0)});
test('balanced recovery reduces arousal without abrupt reset',()=>{const s=createGame();change(s,'lower');s.arousal=70;run(s,2,s=>({balance:-Math.sin((s.time+1/60)*1.05)*.29-Math.sin((s.time+1/60)*.57+1)*.11}));assert.ok(s.arousal<60&&s.arousal>0);assert.equal(s.phase,'lower')});
test('right leg hand precedes left head hand',()=>{const s=createGame();change(s,'leg');s.sleep=85;s.lower=1;run(s,2,()=>({down:true,dx:-.4,vx:24}));assert.equal(s.leg,0);assert.equal(s.head,0);hands(s);assert.equal(s.phase,'settle')});
test('pulling continuously through inhalation never extracts the hand',()=>{const s=createGame();change(s,'leg');s.sleep=85;run(s,3.4,()=>({down:true,dx:65/60,vx:65}));assert.equal(s.leg,0);assert.notEqual(s.phase,'sleeping')});
test('noise wakes immediately, unlike imbalance',()=>{const s=createGame();change(s,'sleeping');s.rest=12;noiseWake(s,'手机');assert.equal(s.phase,'awake');assert.equal(s.arousal,100);assert.equal(s.sleep,0);assert.equal(s.rest,0);assert.equal(s.noiseSerial,1)});
test('noise warning lasts several seconds and can be tapped away',()=>{const s=createGame();change(s,'sleeping');run(s,5.1);assert.equal(s.events.length,1);const e=s.events[0];assert.ok(e.left>3.5);assert.equal(tap(s,e.id),'saved');run(s,3);assert.equal(s.phase,'sleeping');assert.equal(s.cleared,1)});
test('wrong object cannot dismiss another warning',()=>{const s=createGame();change(s,'sleeping');run(s,5.1);assert.equal(tap(s,'cat'),'empty');assert.equal(s.events[0].status,'warning')});
test('missed warning causes immediate full wake',()=>{const s=createGame();change(s,'sleeping');run(s,9.4);assert.equal(s.phase,'awake');assert.equal(s.arousal,100);assert.equal(s.wakes,1)});
test('all eight sources appear and can be cleared',()=>{const s=createGame();change(s,'sleeping');for(let i=0;i<65*60;i++){for(const e of s.events)if(e.status==='warning')tap(s,e.id);step(s,{},1/60)}assert.equal(s.phase,'sleeping');assert.deepEqual(new Set(s.eventHistory.map(e=>e.id)),new Set(SOURCES.map(s=>s.id)));assert.ok(s.rest>64);assert.ok(s.mamaRest>.8);assert.ok(s.complete)});
test('after long rest more than one warning may need attention',()=>{const s=createGame();change(s,'sleeping');s.rest=46;s.phaseTime=46;s.nextEvent=46;run(s,3.1);assert.equal(s.events.filter(e=>e.status==='warning').length,2)});
test('wake returns to a new held cycle',()=>{const s=createGame();noiseWake(s);run(s,2.5);assert.equal(s.phase,'rock');assert.equal(s.lower,0);assert.equal(s.leg,0);assert.equal(s.head,0)});
test('time caps prevent jumps and outputs remain finite',()=>{const s=createGame();step(s,{},500);assert.equal(s.time,.05);for(let i=0;i<9000;i++){if(i%37===0)tap(s);step(s,{down:i%3>0,balance:Math.sin(i),dx:Math.cos(i)*4,vx:200},.016)}for(const k of ['sleep','arousal','lower','leg','head','balance','rest'])assert.ok(Number.isFinite(s[k]))});

for(const id of ['ledge','bell']){
 test(`${id} warns visibly before the noise and can be stopped`,()=>{const s=createGame();change(s,'sleeping');const src=SOURCES.find(e=>e.id===id);s.events=[{...src,status:'warning',left:src.lead,fade:0}];s.nextEvent=99;run(s,2);assert.equal(s.phase,'sleeping');assert.ok(s.events[0].left>2);assert.equal(tap(s,id),'saved');run(s,4);assert.equal(s.phase,'sleeping');assert.equal(s.cleared,1);assert.equal(s.wakes,0)});
 test(`${id} really wakes baby if its warning is ignored`,()=>{const s=createGame();change(s,'sleeping');const src=SOURCES.find(e=>e.id===id);s.events=[{...src,status:'warning',left:.1,fade:0}];s.nextEvent=99;run(s,.2);assert.equal(s.phase,'awake');assert.equal(s.noiseSerial,1)});
}
test('smaller visual objects keep roomy touch targets at 320px width',()=>{const renderedCanvas=288;assert.ok(SOURCE_HIT_SIZE*renderedCanvas/390>=44);for(const src of SOURCES){assert.equal(sourceAt(src.x+27,src.y,[src.id]),src.id);assert.equal(sourceAt(src.x,src.y+27,[src.id]),src.id)}});
test('middle of bed and outside scene do not dismiss distant alerts',()=>{assert.equal(sourceAt(195,320,['bell','ledge']),'baby');assert.equal(sourceAt(195,560,['bell','ledge']),'baby')});

test('visible warning labels are also forgiving tap targets',()=>{for(const s of SOURCES)assert.equal(sourceAt(s.x,s.y+s.h*.54+8,SOURCES.map(x=>x.id)),s.id)});

test('absolute sensor balance does not add invented drift',()=>{const s=createGame();change(s,'lower');s.sleep=85;run(s,8,()=>({down:true,balance:0,absoluteBalance:true}));assert.equal(s.phase,'leg');assert.equal(s.arousal,0)});
test('absolute off-level phone stops descent and gradually wakes',()=>{const s=createGame();change(s,'lower');s.sleep=85;run(s,2,()=>({down:false,balance:.8,absoluteBalance:true}));assert.equal(s.lower,0);assert.ok(s.arousal>20&&s.arousal<100);assert.equal(s.phase,'lower')});
