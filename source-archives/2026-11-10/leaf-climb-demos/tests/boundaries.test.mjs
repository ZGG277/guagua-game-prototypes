import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine, classifyMiss, DT} from '../dist/physics.mjs';

test('Exact playable edge hits; microscopic outside-edge misses remain legible',()=>{
 const l={x:200,y:300,w:100};
 assert.equal(classifyMiss(163,l,100).kind,'hit');
 assert.equal(classifyMiss(237,l,100).kind,'hit');
 assert.equal(classifyMiss(162.9,l,100).kind,'short');
 assert.equal(classifyMiss(162.9,l,100).gap,1);
 assert.equal(classifyMiss(237.1,l,100).kind,'long');
 assert.equal(classifyMiss(237.1,l,100).gap,1);
});
test('Impossible underpowered A launch cannot be credited a target',()=>{
 const e=new Engine('A');e.down(200,600);e.up();e.advance(4);
 assert.equal(e.index,0);assert.equal(e.completed,false);
 assert.equal(e.events.filter(v=>v.type==='land').length,0);
 assert.equal(e.feedback.kind,'height');assert.ok(e.feedback.gap>0);
});
test('B cannot grip a distant target or auto-advance from arbitrary sky input',()=>{
 const e=new Engine('B'),top=e.leaves[4];e.down(top.x,top.y-58);e.advance(3);
 assert.equal(e.index,0);assert.equal(e.arm?.grip,null);assert.equal(e.status,'grounded');e.up();assert.equal(e.arm,null);
});
test('Fixed timestep replay is identical for identical inputs in every mode',()=>{
 for(const mode of ['A','B','C']){
   const replay=()=>{const e=new Engine(mode),t=e.target();e.down(t.x,t.y-58);for(let i=0;i<99;i++)e.step(DT);e.move(t.x+40,t.y+170);for(let i=0;i<47;i++)e.step(DT);e.up();for(let i=0;i<360;i++)e.step(DT);return e.snapshot();};
   assert.deepEqual(replay(),replay());
 }
});
test('Immediate retry of a confirmed high-leaf miss retains a one-leaf height penalty',()=>{
 const e=new Engine('A');e.spawn(3);e.down(200,400);e.advance(.1);e.up();
 for(let i=0;i<240&&!e.feedback;i++)e.step();
 assert.equal(e.feedback?.type,'miss');e.retry();assert.equal(e.index,2);assert.equal(e.status,'grounded');assert.equal(e.input,null);
});
test('Pointer cancellation during charging never launches; repeated cancel is idempotent',()=>{
 const e=new Engine('A');e.down(100,100);e.advance(.9);e.cancel();e.cancel();e.up();e.advance(2);
 assert.equal(e.status,'grounded');assert.equal(e.index,0);assert.equal(e.events.length,0);
});
