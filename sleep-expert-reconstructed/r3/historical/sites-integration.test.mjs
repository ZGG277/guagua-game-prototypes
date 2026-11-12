import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as engine from '../dist/engine.js';

// Execute the shipped modules, including their real event handlers, in a tiny
// deterministic DOM fixture. No copied game/sensor logic and no browser needed.
const mainSource = readFileSync(new URL('../dist/main.js', import.meta.url), 'utf8');
const motionSource = readFileSync(new URL('../dist/motion.js', import.meta.url), 'utf8');
const inputSource = readFileSync(new URL('../dist/input.js', import.meta.url), 'utf8');
const unexport = source => source.replace(/^export\s+(?=(?:function|const|let|class)\b)/gm, '').replace(/^export\s*\{[^}]+\};?\s*$/gm, '');

function target() {
  const listeners = new Map();
  return {
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
    },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
    emit(type, data = {}) {
      const event = {type, cancelable: true, preventDefault() {}, ...data};
      for (const listener of [...(listeners.get(type) ?? [])]) listener(event);
    }
  };
}

function harness({permission = () => 'granted', supported = true} = {}) {
  let now = 0, nextID = 0, permissionCalls = 0;
  const timers = new Map(), frames = new Map(), elements = new Map();
  const canvasContext = new Proxy({}, {get: (object, key) => key in object ? object[key] : () => ({addColorStop() {}})});
  const element = id => {
    if (elements.has(id)) return elements.get(id);
    const classes = new Set(id === 'help-overlay' ? ['hidden'] : []);
    const el = {
      ...target(), id, dataset: {}, disabled: false, style: {}, textContent: '', innerHTML: '',
      parentElement: {parentElement: {dataset: {}}},
      classList: {
        add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name),
        toggle(name, force) { const on = force ?? !classes.has(name); on ? classes.add(name) : classes.delete(name); return on; }
      },
      getContext: () => canvasContext,
      getBoundingClientRect: () => ({left: 0, top: 0, right: 390, bottom: 530, width: 390, height: 530}),
      setAttribute() {}, focus() {}, setPointerCapture() {}
    };
    elements.set(id, el); return el;
  };
  const practice = ['lower', 'leg', 'head', 'sleeping'].map(phase => {
    const el = element(`practice-${phase}`); el.dataset.practice = phase; return el;
  });
  const document = {...target(), hidden: false, getElementById: element, querySelectorAll: () => practice};
  const window = {
    ...target(), document, devicePixelRatio: 1, isSecureContext: true, screen: {orientation: {angle: 0}},
    DeviceOrientationEvent: supported ? {requestPermission() { permissionCalls++; return permission(); }} : undefined
  };
  const sandbox = {
    ...engine, window, document,
    performance: {now: () => now},
    localStorage: {getItem: () => null, setItem() {}},
    requestAnimationFrame: callback => { const id = ++nextID; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: (callback, delay) => { const id = ++nextID; timers.set(id, {at: now + delay, callback}); return id; },
    clearTimeout: id => timers.delete(id)
  };
  const context = vm.createContext(sandbox);
  context.createMotionControl = vm.runInContext(`(function(){${unexport(motionSource)}; return createMotionControl;})()`, context);
  context.BabyInput = vm.runInContext(`(function(){${unexport(inputSource)}; return BabyInput;})()`, context);
  vm.runInContext(mainSource.replace(/^import .*;\s*$/gm, '') + '\n;globalThis.inspect = () => ({game, playing, paused, sensorRequest, flatTime, input, keys, motion: motion.read()});', context);

  function advance(ms) {
    const end = now + ms;
    for (;;) {
      const due = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]); now = due[1].at; due[1].callback();
    }
    now = end;
  }
  return {
    window, document, element, advance,
    read: () => context.inspect(),
    click: id => element(id).emit('click', {detail: 0, clientX: 195, clientY: 200}),
    keydown: key => element('scene').emit('keydown', {key, repeat: false}),
    keyup: key => window.emit('keyup', {key}),
    sensor: (beta = 0, gamma = 0) => window.emit('deviceorientation', {beta, gamma}),
    frame(ms = 16) {
      advance(ms);
      const current = [...frames]; frames.clear();
      for (const [, callback] of current) callback(now);
    },
    hide() { document.hidden = true; document.emit('visibilitychange'); },
    show() { document.hidden = false; document.emit('visibilitychange'); },
    get permissionCalls() { return permissionCalls; }
  };
}

const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return {promise, resolve, reject}; };
function run(h, count, sample) { for (let i = 0; i < count; i++) { if (sample) h.sensor(...sample); h.frame(); } }
const pointer = (x = 160, y = 100) => ({pointerId: 1, isPrimary: true, button: 0, clientX: x, clientY: y});

async function sensing(h) {
  h.click('practice-lower'); h.click('sensor'); await flush();
  assert.equal(h.read().motion.mode, 'sensor'); assert.equal(h.read().paused, false);
}

test('integration: permission is opt-in and unresolved permission freezes game', async () => {
  const request = deferred(), h = harness({permission: () => request.promise});
  h.click('practice-lower'); assert.equal(h.permissionCalls, 0); h.click('sensor');
  const time = h.read().game.time; run(h, 50);
  assert.equal(h.permissionCalls, 1); assert.equal(h.read().paused, true); assert.equal(h.read().game.time, time);
  assert.equal(h.element('sensor').disabled, true);
  request.resolve('denied'); await flush();
  assert.equal(h.read().paused, false); assert.equal(h.read().motion.mode, 'touch'); assert.equal(h.element('sensor').disabled, false);
});

test('integration: help wins over a pending sensor request and late grant', async () => {
  const request = deferred(), h = harness({permission: () => request.promise});
  h.click('practice-lower'); h.click('sensor'); h.click('help');
  const requestID = h.read().sensorRequest; await flush(); request.resolve('granted'); await flush();
  assert.equal(h.read().sensorRequest, requestID); assert.equal(h.read().paused, true);
  assert.equal(h.element('help-overlay').classList.contains('hidden'), false);
  assert.equal(h.read().motion.mode, 'touch'); assert.equal(h.element('sensor').disabled, false);
  h.click('resume'); assert.equal(h.read().paused, false); assert.equal(h.read().motion.mode, 'touch');
});

test('integration: old request cannot unlock a newer request or a new help pause', async () => {
  const old = deferred(), current = deferred(); let calls = 0;
  const h = harness({permission: () => ++calls === 1 ? old.promise : current.promise});
  h.click('practice-lower'); h.click('sensor'); h.click('practice-lower'); h.click('sensor');
  old.resolve('granted'); await flush();
  assert.equal(h.read().paused, true); assert.equal(h.element('sensor').disabled, true); assert.equal(h.read().motion.mode, 'touch');
  h.click('help'); current.reject(Error('late permission failure')); await flush();
  assert.equal(h.read().paused, true); assert.equal(h.element('help-overlay').classList.contains('hidden'), false);
  assert.equal(h.read().motion.mode, 'touch');
});

test('integration: backgrounding wins over pending permission and requires explicit resume', async () => {
  const request = deferred(), h = harness({permission: () => request.promise});
  h.click('practice-lower'); h.click('sensor'); h.hide(); request.resolve('granted'); await flush(); h.show(); run(h, 2);
  assert.equal(h.read().paused, true); assert.equal(h.read().motion.mode, 'touch');
  assert.equal(h.element('help-overlay').classList.contains('hidden'), false);
  h.click('resume'); assert.equal(h.read().paused, false); assert.equal(h.permissionCalls, 1);
});

test('integration: permission timeout releases only its own pause to touch', async () => {
  const h = harness({permission: () => new Promise(() => {})});
  h.click('practice-lower'); h.click('sensor'); h.advance(8000); await flush();
  assert.equal(h.read().paused, false); assert.equal(h.read().motion.mode, 'touch'); assert.equal(h.element('sensor').disabled, false);
});

test('integration: no sample cannot lower the baby, and eventually falls back', async () => {
  const h = harness(); await sensing(h); run(h, 100);
  assert.equal(h.read().motion.mode, 'sensor'); assert.equal(h.read().motion.flat, false); assert.equal(h.read().flatTime, 0);
  assert.equal(h.read().game.lower, 0); run(h, 65);
  assert.equal(h.read().motion.mode, 'touch'); assert.equal(h.read().game.lower, 0);
});

test('integration: a continuous flat pose waits 0.45 seconds and lowers without artificial drift', async () => {
  const h = harness(); await sensing(h); run(h, 25, [0, 0]);
  assert.equal(h.read().game.lower, 0); assert.ok(h.read().flatTime < .45);
  run(h, 20, [0, 0]); assert.ok(h.read().game.lower > 0); assert.equal(h.read().game.balance, 0);
  assert.equal(h.read().game.arousal, 0); assert.equal(h.read().input.down, false);
});

test('integration: losing either-axis level immediately stops lowering and resets stability', async () => {
  const h = harness(); await sensing(h); run(h, 50, [0, 0]); const lower = h.read().game.lower;
  run(h, 12, [30, 0]); assert.equal(h.read().game.lower, lower); assert.equal(h.read().flatTime, 0);
  run(h, 15, [0, 0]); assert.equal(h.read().game.lower, lower); run(h, 15, [0, 30]);
  assert.equal(h.read().game.lower, lower); assert.equal(h.read().flatTime, 0); assert.ok(h.read().game.arousal > 0);
});

test('integration: inverted phone never lowers even with a held touch or keyboard', async () => {
  const h = harness(); await sensing(h); h.keydown(' ');
  h.element('gesture-pad').emit('pointerdown', pointer()); run(h, 50, [180, 0]);
  assert.equal(h.read().game.lower, 0); assert.equal(h.read().flatTime, 0); assert.equal(h.read().motion.flat, false);
});

test('integration: window keyup releases a keyboard hold outside the canvas', () => {
  const h = harness(); h.click('practice-lower'); h.keydown(' '); h.frame();
  assert.equal(h.read().input.down, true); assert.equal(h.read().input.id, null);
  h.keyup(' '); assert.equal(h.read().input.down, false); assert.equal(h.read().keys.size, 0);
  const lower = h.read().game.lower; run(h, 8); assert.equal(h.read().game.lower, lower);
});

test('integration: global pointerup and lostpointercapture release touch lowering', () => {
  const h = harness(); h.click('practice-lower');
  h.element('gesture-pad').emit('pointerdown', pointer()); h.frame(); assert.equal(h.read().input.down, true);
  h.window.emit('pointerup', pointer(600, 700)); assert.equal(h.read().input.down, false);
  h.element('scene').emit('pointerdown', pointer()); h.frame(); assert.equal(h.read().input.down, true);
  h.element('scene').emit('lostpointercapture', pointer()); assert.equal(h.read().input.down, false);
});

test('integration: global touchend and mouseup release their fallback gestures', () => {
  for (const family of ['touch', 'mouse']) {
    const h = harness(); h.click('practice-lower'); const pad = h.element('gesture-pad');
    if (family === 'touch') {
      const touch = {identifier: 3, clientX: 150, clientY: 100};
      pad.emit('touchstart', {touches: [touch], changedTouches: [touch]});
      assert.equal(h.read().input.down, true); h.window.emit('touchend', {changedTouches: [touch]});
    } else {
      pad.emit('mousedown', {button: 0, clientX: 150, clientY: 100});
      assert.equal(h.read().input.down, true); h.window.emit('mouseup', {button: 0, clientX: 700, clientY: 800});
    }
    assert.equal(h.read().input.down, false); assert.equal(h.read().input.id, null);
  }
});

test('integration: blur and help clear active pointer and keyboard input', () => {
  const h = harness(); h.click('practice-lower'); h.keydown('ArrowRight');
  h.element('gesture-pad').emit('pointerdown', pointer()); h.frame(); h.window.emit('blur');
  assert.equal(h.read().input.down, false); assert.equal(h.read().keys.size, 0); assert.equal(h.read().input.dx, 0);
  h.element('gesture-pad').emit('pointerdown', pointer()); h.click('help');
  assert.equal(h.read().input.down, false); assert.equal(h.read().paused, true);
  h.window.emit('pointerup', pointer()); h.click('resume'); assert.equal(h.read().input.down, false);
});
