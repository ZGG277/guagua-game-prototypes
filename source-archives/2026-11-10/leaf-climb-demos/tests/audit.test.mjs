/** Independent deterministic behavior audit: no browser, network, or UI stubs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine, DT, classifyMiss } from '../dist/physics.mjs';

const clone = e => Object.assign(Object.create(Engine.prototype), structuredClone(e));
const settle = (e, previousIndex, max = 600) => {
  for (let n = 0; n < max && !e.completed && e.index === previousIndex; n++) e.step();
  return e;
};
const finite = e => {
  for (const key of ['x', 'y', 'vx', 'vy']) assert.ok(Number.isFinite(e.body[key]), `${e.mode} body.${key}`);
};
const pullStage = (e, wait = null) => {
  const target = e.target(), before = e.index;
  assert.equal(e.down(target.x, target.y - 58), true);
  if (wait === null) {
    for (let n = 0; n < 120 && !e.arm?.grip; n++) e.step();
  } else e.advance(wait);
  assert.ok(e.arm?.grip, `B stage ${before} should grip`);
  assert.equal(e.arm.grip.leaf, before + 1, `B stage ${before}: aiming at next leaf must not snag current leaf`);
  const anchor = e.arm.grip.anchor;
  e.move(anchor.x, anchor.y + 230);
  settle(e, before);
  assert.equal(e.index, before + 1);
};

test('A: actual four-target chain has valid charge/aim solutions', () => {
  let e = new Engine('A');
  for (let index = 0; index < 4; index++) {
    let solution;
    outer: for (let hold = .8; hold <= 1.1; hold += .025) {
      for (let tilt = 1.0; tilt <= 1.45; tilt += .025) {
        const n = clone(e), angle = n.direction() > 0 ? -tilt : -Math.PI + tilt;
        n.down(220, 400); n.move(220 + Math.cos(angle) * 150, 400 + Math.sin(angle) * 150);
        n.advance(hold); n.up(); settle(n, index, 360);
        if (n.index === index + 1) { solution = n; break outer; }
      }
    }
    assert.ok(solution, `A stage ${index} is reachable from actual previous landing`);
    e = solution;
  }
  assert.equal(e.completed, true);
  assert.equal(e.events.filter(x => x.type === 'land').length, 4);
});

test('A: strength changes launch speed, aim changes horizontal direction, charge caps', () => {
  const shot = (held, dx = 80) => {
    const e = new Engine('A'); e.down(200, 400); e.move(200 + dx, 250); e.advance(held); e.up();
    return e;
  };
  assert.ok(Math.hypot(shot(.9).body.vx, shot(.9).body.vy) > Math.hypot(shot(.2).body.vx, shot(.2).body.vy));
  assert.ok(shot(.9, 80).body.vx > 0);
  assert.ok(shot(.9, -80).body.vx < 0);
  assert.ok(Math.abs(Math.hypot(shot(2).body.vx, shot(2).body.vy) - Math.hypot(shot(1.1).body.vx, shot(1.1).body.vy)) < 1e-9);
});

test('A: weak, well-timed and overcharged default jumps differ meaningfully', () => {
  const shoot = hold => { const e = new Engine('A'); e.down(200, 400); e.advance(hold); e.up(); e.advance(3); return e; };
  assert.equal(shoot(.3).feedback.kind, 'height');
  assert.equal(shoot(.9).index, 1);
  assert.equal(shoot(1.05).feedback.kind, 'long');
});

for (const wait of [null, .4]) test(`B: all four targets via direct reach and pull (grip wait ${wait ?? 'until-grip'})`, () => {
  const e = new Engine('B');
  for (let i = 0; i < 4; i++) pullStage(e, wait);
  assert.equal(e.completed, true);
});

test('B: merely holding a target does not automatically climb; downward pull changes rope length', () => {
  const e = new Engine('B'), t = e.target(); e.down(t.x, t.y - 58); e.advance(.4);
  assert.equal(e.arm?.grip?.leaf, 1);
  const initial = e.arm.grip.length;
  e.advance(4);
  assert.equal(e.index, 0);
  assert.equal(e.completed, false);
  assert.ok(Math.abs(e.arm.grip.length - initial) < 1e-9);
  e.move(t.x, t.y + 22); e.advance(.25);
  assert.ok(e.arm.grip.length < initial - 40);
  finite(e);
});

test('B: horizontal drag changes swing and release retains measured velocity', () => {
  const base = new Engine('B'), t = base.target(); base.down(t.x, t.y - 58); base.advance(.4);
  const left = clone(base), right = clone(base);
  left.move(t.x - 110, t.y - 58); right.move(t.x + 110, t.y - 58);
  left.advance(.5); right.advance(.5);
  assert.ok(Math.abs(left.body.x - right.body.x) > 5);
  const velocity = {vx: right.body.vx, vy: right.body.vy}; right.up();
  assert.equal(right.status, 'flying');
  assert.equal(right.body.vx, velocity.vx); assert.equal(right.body.vy, velocity.vy);
  assert.equal(right.arm, null); assert.equal(right.input, null);
});

test('C: all four targets have nonzero release windows from actual previous landings', () => {
  let e = new Engine('C');
  for (let index = 0; index < 4; index++) {
    const hits = [];
    for (let frame = 1; frame <= 280; frame++) {
      const n = clone(e); n.advance(frame * DT); n.down(200, 400); n.up(); settle(n, index, 360);
      if (n.index === index + 1) hits.push(n);
    }
    assert.ok(hits.length >= 5, `C stage ${index} has several valid fixed-step release frames`);
    e = hits[Math.floor(hits.length / 2)];
  }
  assert.equal(e.completed, true);
  assert.equal(e.events.filter(x => x.type === 'land').length, 4);
});

test('C: release uses tangent velocity, not target snapping, and early/late inputs matter', () => {
  const outcomes = [.2, .4, .6].map(wait => {
    const e = new Engine('C'); e.advance(wait);
    const before = {...e.body}; e.down(220, 400); e.up();
    assert.equal(e.body.x, before.x); assert.equal(e.body.y, before.y);
    assert.equal(e.body.vx, before.vx); assert.equal(e.body.vy, before.vy);
    e.advance(3); return e;
  });
  assert.equal(outcomes[0].feedback.kind, 'long');
  assert.equal(outcomes[1].index, 1);
  assert.equal(outcomes[2].feedback.kind, 'short');
});

for (const mode of ['A', 'B', 'C']) test(`${mode}: idle has no automatic progress and remains finite for 30 s`, () => {
  const e = new Engine(mode); e.advance(30); finite(e);
  assert.equal(e.index, 0); assert.equal(e.completed, false);
});

for (const mode of ['A', 'B', 'C']) test(`${mode}: cancel/retry/reset clear gesture state and reset reproducibly`, () => {
  const e = new Engine(mode), t = e.target();
  e.down(t.x, t.y - 58); e.advance(.4); e.cancel();
  assert.equal(e.input, null); assert.equal(e.arm, null);
  if (mode === 'A') assert.equal(e.status, 'grounded');
  if (mode === 'B') assert.equal(e.status, 'flying');
  e.advance(.2); finite(e);
  e.retry(); assert.equal(e.input, null); assert.equal(e.arm, null);
  assert.equal(e.feedback, null);
  for (const next of ['C', 'B', 'A', mode]) {
    e.reset(next);
    assert.deepEqual(e.snapshot(), new Engine(next).snapshot());
    assert.equal(e.time, 0); assert.equal(e.events.length, 0);
  }
});

for (const mode of ['A', 'B', 'C']) test(`${mode}: misses can lose height, never silently award progression`, () => {
  const e = new Engine(mode); e.spawn(3);
  if (mode === 'A') { e.down(200, 400); e.move(350, 390); e.advance(.9); e.up(); }
  if (mode === 'B') { const t = e.target(); e.down(t.x, t.y - 58); e.advance(.3); e.cancel(); }
  if (mode === 'C') { e.advance(.8); e.down(200, 400); e.up(); }
  e.advance(5);
  assert.ok(e.index < 3);
  assert.ok(e.events.some(x => x.type === 'fall' && x.from === 3 && x.to < 3));
  assert.ok(e.events.some(x => x.type === 'miss'));
  finite(e);
});

test('miss feedback short/long is mirrored correctly for both traversal directions', () => {
  const leaf = {x: 200, y: 300, w: 100};
  assert.equal(classifyMiss(150, leaf, 100).kind, 'short');
  assert.equal(classifyMiss(250, leaf, 100).kind, 'long');
  assert.equal(classifyMiss(250, leaf, 300).kind, 'short');
  assert.equal(classifyMiss(150, leaf, 300).kind, 'long');
  assert.equal(classifyMiss(200, leaf, 100).kind, 'hit');
});

for (const mode of ['A', 'B', 'C']) test(`${mode}: interrupted/repeated gesture sequence preserves state invariants`, () => {
  const e = new Engine(mode);
  let seed = 0x4c454146;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  for (let i = 0; i < 1200; i++) {
    const x = random() * 440, y = random() * 950;
    switch (Math.floor(random() * 9)) {
      case 0: e.down(x, y); break;
      case 1: e.move(x, y); break;
      case 2: e.up(); break;
      case 3: e.cancel(); break;
      case 4: e.retry(); break;
      case 5: e.reset(mode); break;
      default: e.advance(random() * .4);
    }
    finite(e);
    assert.ok(e.index >= 0 && e.index < e.leaves.length);
    assert.ok(['grounded', 'hanging', 'gripping', 'flying'].includes(e.status));
    if (e.status === 'gripping') { assert.ok(e.arm?.grip); assert.ok(e.input); }
    if (e.status === 'hanging') assert.ok(e.rope);
    if (e.completed) { assert.equal(e.index, 4); assert.equal(e.input, null); }
  }
});

test('DOM adapter: pointer ownership, cancel, mode switch, blur and resize do not leave live gestures', async () => {
  const names = ['document', 'window', 'devicePixelRatio', 'matchMedia', 'ResizeObserver', 'requestAnimationFrame'];
  const saved = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const target = () => {
    const handlers = new Map();
    return {
      addEventListener(name, fn) { if (!handlers.has(name)) handlers.set(name, []); handlers.get(name).push(fn); },
      emit(name, data = {}) { for (const fn of handlers.get(name) ?? []) fn({preventDefault() {}, ...data}); },
      classList: {toggle() {}}, setAttribute() {}, style: {}, hidden: false,
      querySelector() { return target(); }, querySelectorAll() { return []; }
    };
  };
  const elements = new Map();
  const element = id => { if (!elements.has(id)) elements.set(id, target()); return elements.get(id); };
  const modes = ['A', 'B', 'C'].map(mode => Object.assign(target(), {dataset: {mode}}));
  const canvas = element('scene'), captures = new Set();
  let rect = {left: 0, top: 0, width: 600, height: 650}, resizeCallback, frame;
  const gradient = {addColorStop() {}};
  const context = new Proxy({}, {get(_, key) { return key.startsWith('create') ? () => gradient : () => {}; }, set() {return true;}});
  canvas.getContext = () => context;
  canvas.getBoundingClientRect = () => rect;
  canvas.focus = () => {};
  canvas.setPointerCapture = id => captures.add(id);
  canvas.releasePointerCapture = id => { captures.delete(id); canvas.emit('lostpointercapture', {pointerId: id}); };
  const document = Object.assign(target(), {hidden: false, getElementById: element, querySelectorAll: () => modes});
  const window = target();
  Object.assign(globalThis, {
    document, window, devicePixelRatio: 1, matchMedia: () => ({matches: false}),
    ResizeObserver: class {constructor(callback) {resizeCallback = callback;} observe() {}},
    requestAnimationFrame: callback => {frame = callback;}
  });
  try {
    await import('../dist/main.mjs?independent-input-audit');
    const snapshot = () => window.leafLab.snapshot();
    const pointer = (name, id = 1, x = 300, y = 400) => canvas.emit(name, {pointerId: id, clientX: x, clientY: y});
    pointer('pointerdown'); assert.equal(snapshot().input, true);
    pointer('pointerdown', 2); pointer('pointerup', 2); assert.equal(snapshot().input, true, 'second pointer cannot release first');
    pointer('pointercancel'); assert.equal(snapshot().input, false); assert.equal(snapshot().status, 'grounded');
    assert.equal(captures.size, 0);
    pointer('pointerdown'); canvas.emit('lostpointercapture', {pointerId: 1}); assert.equal(snapshot().input, false);
    captures.clear();
    pointer('pointerdown'); modes[1].emit('click');
    assert.equal(snapshot().mode, 'B'); assert.equal(snapshot().input, false); assert.equal(captures.size, 0);
    pointer('pointerup'); assert.equal(snapshot().status, 'grounded');
    pointer('pointerdown', 3, 365, 305);
    for (let i = 0; i <= 50; i++) frame(1000 + i * 1000 / 120);
    assert.equal(snapshot().status, 'gripping');
    window.emit('blur'); assert.equal(snapshot().input, false); assert.equal(snapshot().status, 'flying'); assert.equal(captures.size, 0);
    window.emit('focus'); modes[0].emit('click');
    pointer('pointerdown', 4); assert.equal(snapshot().input, true);
    rect = {...rect, width: 390, height: 500}; resizeCallback();
    assert.equal(snapshot().input, false, 'geometry change cancels stale-coordinate gesture');
    assert.equal(snapshot().status, 'grounded'); assert.equal(captures.size, 0);
    pointer('pointerdown', 5); document.hidden = true; document.emit('visibilitychange');
    assert.equal(snapshot().input, false); assert.equal(captures.size, 0);
    document.hidden = false; document.emit('visibilitychange');
    modes[2].emit('click'); pointer('pointerdown', 6);
    assert.equal(snapshot().status, 'flying'); pointer('pointerup', 6); assert.equal(snapshot().input, false);
  } finally {
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
    }
  }
});
