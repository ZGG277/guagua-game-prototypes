import test from 'node:test';
import assert from 'node:assert/strict';
import {createMotionControl} from '../dist/motion.js';

function env(options = {}) {
  let now = 0, angle = 0, hidden = false, nextTimer = 0, asked = 0, removed = 0;
  let listener = null, visibility = null;
  const timers = new Map(), callbacks = [];
  return {
    supported: () => options.supported ?? true,
    requestPermission: () => { asked++; if (options.throw) throw Error('unavailable'); return options.permission ?? 'granted'; },
    now: () => now,
    screenAngle: () => angle,
    hidden: () => hidden,
    subscribeVisibility: callback => { visibility = callback; return () => { visibility = null; }; },
    add: callback => { listener = callback; callbacks.push(callback); },
    remove: callback => { if (listener === callback) listener = null; removed++; },
    setTimeout: (callback, delay) => { const id = ++nextTimer; timers.set(id, {callback, at: now + delay}); return id; },
    clearTimeout: id => timers.delete(id),
    event: event => listener?.(event),
    rotate: degrees => { angle = degrees; },
    hide: () => { hidden = true; visibility?.(true); },
    show: () => { hidden = false; visibility?.(false); },
    advance(ms, fireTimers = true) {
      const target = now + ms;
      if (fireTimers) {
        for (;;) {
          const due = [...timers].filter(([, value]) => value.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
          if (!due) break;
          timers.delete(due[0]); now = due[1].at; due[1].callback();
        }
      }
      now = target;
    },
    get asked() { return asked; },
    get removed() { return removed; },
    get callbacks() { return callbacks; },
    get timerCount() { return timers.size; },
    get watching() { return !!visibility; }
  };
}
const near = (a, b, epsilon = 1e-8) => assert.ok(Math.abs(a - b) < epsilon, `${a} should be near ${b}`);
const flatEvent = {beta: 0, gamma: 0};
const gravity = (x, y, z) => ({accelerationIncludingGravity: {x, y, z}});

async function enabled(options) {
  const e = env(options), m = createMotionControl(e);
  assert.equal(await m.enable(), true);
  return {e, m};
}

test('sensor is opt-in, returns a complete touch snapshot, and installs nothing', () => {
  const e = env(), m = createMotionControl(e);
  assert.deepEqual(m.read(), {mode: 'touch', value: 0, tiltX: 0, tiltY: 0, status: '触控平衡', flat: false});
  assert.equal(e.asked, 0); assert.equal(e.callbacks.length, 0); assert.equal(e.watching, false);
});
test('default environment is safe when no browser exists', async () => {
  const m = createMotionControl();
  assert.equal(await m.enable(), false); assert.equal(m.read().mode, 'touch');
});
test('unsupported devices do not request permission', async () => {
  const e = env({supported: false}), m = createMotionControl(e);
  assert.equal(await m.enable(), false); assert.equal(e.asked, 0);
});
for (const permission of ['denied', 'prompt', undefined]) {
  test(`non-granted permission (${String(permission)}) falls back`, async () => {
    const e = env(); e.requestPermission = () => permission;
    const m = createMotionControl(e);
    assert.equal(await m.enable(), false); assert.equal(m.read().mode, 'touch'); assert.equal(e.timerCount, 0);
  });
}
test('permission exceptions fall back cleanly', async () => {
  const e = env({throw: true}), m = createMotionControl(e);
  assert.equal(await m.enable(), false); assert.equal(e.watching, false);
});
test('permission invocation stays synchronous within the enable gesture', async () => {
  const e = env(), m = createMotionControl(e), promise = m.enable();
  assert.equal(e.asked, 1); await promise; m.stop();
});
test('permission promise that never settles times out without requiring read()', async () => {
  const e = env(); e.requestPermission = () => new Promise(() => {});
  const m = createMotionControl(e), promise = m.enable();
  e.advance(8000);
  assert.equal(await promise, false); assert.match(m.read().status, /超时/); assert.equal(e.watching, false);
});
test('late permission after timeout cannot reactivate a sensor', async () => {
  let resolve;
  const e = env(); e.requestPermission = () => new Promise(r => { resolve = r; });
  const m = createMotionControl(e), promise = m.enable(); e.advance(8000);
  assert.equal(await promise, false); const state = m.read();
  resolve('granted'); await Promise.resolve();
  assert.deepEqual(m.read(), state); assert.equal(e.callbacks.length, 0);
});
test('permission deadline is checked even when its timeout has not run', async () => {
  let resolve;
  const e = env(); e.requestPermission = () => new Promise(r => { resolve = r; });
  const m = createMotionControl(e), promise = m.enable(); e.advance(8100, false);
  resolve('granted'); assert.equal(await promise, false); assert.equal(e.callbacks.length, 0);
});
test('no valid sample is never reported flat', async () => {
  const {m} = await enabled(); assert.equal(m.read().flat, false);
});
test('first sample uses actual horizontal, not the initial pose', async () => {
  const {e, m} = await enabled(); e.event({beta: 70, gamma: 12});
  assert.equal(m.read().flat, false); assert.ok(m.read().tiltY > .99); assert.ok(m.read().tiltX > .5);
  e.event(flatEvent); assert.equal(m.read().flat, true); assert.equal(m.read().value, 0);
});
test('both axes are independently measured and value aliases tiltX', async () => {
  const {e, m} = await enabled(); e.event({beta: 0, gamma: 9});
  near(m.read().tiltX, .5); near(m.read().tiltY, 0); assert.equal(m.read().value, m.read().tiltX);
  e.event({beta: -9, gamma: 0}); near(m.read().tiltY, -.5); near(m.read().tiltX, 0);
});
test('flat uses the total tilt cone, not two independent loose axis thresholds', async () => {
  const {e, m} = await enabled();
  e.event({beta: 8, gamma: 8}); assert.equal(m.read().flat, false);
  e.event({beta: 5, gamma: 5}); assert.equal(m.read().flat, true);
  e.event({beta: 0, gamma: 10}); assert.equal(m.read().flat, true);
  e.event({beta: 0, gamma: 10.1}); assert.equal(m.read().flat, false);
});
test('vertical and face-down poses are not horizontal', async () => {
  const {e, m} = await enabled();
  for (const beta of [90, -90, 180, -180, 150]) {
    e.event({beta, gamma: 0}); assert.equal(m.read().flat, false); assert.ok(Math.abs(m.read().tiltY) > .99);
  }
  assert.match(m.read().status, /屏幕朝上/);
});
test('recenter cannot redefine horizontal or erase a vertical/face-down pose', async () => {
  const {e, m} = await enabled();
  for (const beta of [70, 180]) {
    e.event({beta, gamma: 15}); const before = m.read(); m.recenter();
    assert.deepEqual(m.read(), before); e.event({beta, gamma: 15}); assert.equal(m.read().flat, false);
  }
});
test('screen rotation remaps both axes and updates without a fresh sample', async () => {
  const {e, m} = await enabled(); e.event({beta: 9, gamma: 0});
  near(m.read().tiltX, 0); near(m.read().tiltY, .5);
  e.rotate(90); near(m.read().tiltX, .5); near(m.read().tiltY, 0);
  e.rotate(180); near(m.read().tiltX, 0); near(m.read().tiltY, -.5);
  e.rotate(270); near(m.read().tiltX, -.5); near(m.read().tiltY, 0);
  e.rotate(-90); near(m.read().tiltX, -.5); assert.equal(m.read().flat, true);
});
test('motion gravity samples detect screen-up, both tilt axes, and face-down', async () => {
  const {e, m} = await enabled(); e.event(gravity(0, 0, 9.81)); assert.equal(m.read().flat, true);
  e.event(gravity(-1.535, 0, 9.689)); near(m.read().tiltX, .5, .001);
  e.event(gravity(0, 1.535, 9.689)); near(m.read().tiltY, .5, .001);
  e.event(gravity(0, 0, -9.81)); assert.equal(m.read().flat, false); assert.match(m.read().status, /屏幕朝上/);
});
test('available user acceleration is removed before using motion gravity', async () => {
  const {e, m} = await enabled();
  e.event({...gravity(3, -2, 10.81), acceleration: {x: 3, y: -2, z: 1}});
  assert.equal(m.read().flat, true); near(m.read().tiltX, 0); near(m.read().tiltY, 0);
});
test('invalid samples, nulls, and implausible gravity cannot keep a sensor alive', async () => {
  const {e, m} = await enabled();
  const invalid = [null, {}, {beta: null, gamma: 0}, {beta: NaN, gamma: 0}, {beta: 181, gamma: 0},
    {beta: 0, gamma: Infinity}, {beta: 0, gamma: 91}, gravity(null, 0, 9.81), gravity(0, 0, 0), gravity(0, 0, 30)];
  for (const event of invalid) { e.event(event); e.advance(200); }
  assert.equal(m.read().flat, false); e.advance(500);
  assert.equal(m.read().mode, 'touch'); assert.equal(e.removed, 1);
});
test('no data falls back automatically after 2500 ms and cleans resources', async () => {
  const {e, m} = await enabled(); e.advance(2500);
  assert.equal(e.removed, 1); assert.equal(e.watching, false); assert.equal(e.timerCount, 0);
  assert.match(m.read().status, /未收到/);
});
test('a valid sample at monotonic time zero still expires correctly', async () => {
  const {e, m} = await enabled(); e.event(flatEvent); e.advance(2500);
  assert.equal(m.read().mode, 'touch'); assert.match(m.read().status, /过期/);
});
test('fresh samples extend the deadline, but recenter does not', async () => {
  const {e, m} = await enabled(); e.advance(2000); e.event(flatEvent); e.advance(1000);
  assert.equal(m.read().mode, 'sensor'); m.recenter(); e.advance(1500);
  assert.equal(m.read().mode, 'touch');
});
test('read catches stale data even if background timers were throttled', async () => {
  const {e, m} = await enabled(); e.event(flatEvent); e.advance(2600, false);
  assert.equal(m.read().mode, 'touch');
});
test('an arriving event cannot revive an already expired sensor', async () => {
  const {e, m} = await enabled(); e.event(flatEvent); e.advance(2600, false); e.event(flatEvent);
  assert.equal(m.read().mode, 'touch'); assert.equal(m.read().flat, false);
});
test('stop resolves pending permission immediately and ignores late completion', async () => {
  let resolve;
  const e = env(); e.requestPermission = () => new Promise(r => { resolve = r; });
  const m = createMotionControl(e), promise = m.enable(); m.stop();
  assert.equal(await promise, false); resolve('granted'); await Promise.resolve();
  assert.equal(m.read().mode, 'touch'); assert.equal(e.callbacks.length, 0);
});
test('late rejection from an old attempt cannot stop a newer sensor', async () => {
  const e = env(); let call = 0, rejectOld;
  e.requestPermission = () => ++call === 1 ? new Promise((_, r) => { rejectOld = r; }) : 'granted';
  const control = createMotionControl(e), old = control.enable();
  assert.equal(await control.enable(), true); assert.equal(await old, false);
  e.event(flatEvent); rejectOld(Error('cancelled')); await Promise.resolve(); await Promise.resolve();
  assert.equal(control.read().mode, 'sensor'); assert.equal(control.read().flat, true); control.stop();
});
test('late permission grant from an older enable cannot overwrite a denied retry', async () => {
  const e = env(); let call = 0, resolveOld;
  e.requestPermission = () => ++call === 1 ? new Promise(r => { resolveOld = r; }) : 'denied';
  const m = createMotionControl(e), old = m.enable(); assert.equal(await m.enable(), false);
  assert.equal(await old, false); resolveOld('granted'); await Promise.resolve();
  assert.equal(m.read().mode, 'touch'); assert.match(m.read().status, /未获权限/); assert.equal(e.callbacks.length, 0);
});
test('queued old event callbacks cannot mutate a new session', async () => {
  const {e, m} = await enabled(), old = e.callbacks[0];
  m.stop(); await m.enable(); e.event(flatEvent); old({beta: 90, gamma: 0});
  assert.equal(m.read().flat, true); m.stop(); old(flatEvent); assert.equal(m.read().mode, 'touch');
});
test('backgrounding cancels active sensing and foregrounding never auto-enables it', async () => {
  const {e, m} = await enabled(); e.event(flatEvent); e.hide(); e.show(); e.callbacks[0](flatEvent);
  assert.equal(m.read().mode, 'touch'); assert.equal(e.asked, 1); assert.equal(e.watching, false);
  assert.equal(await m.enable(), true); e.event(flatEvent); assert.equal(m.read().flat, true);
});
test('backgrounding also cancels a pending permission and its late result', async () => {
  let resolve;
  const e = env(); e.requestPermission = () => new Promise(r => { resolve = r; });
  const m = createMotionControl(e), promise = m.enable(); e.hide();
  assert.equal(await promise, false); e.show(); resolve('granted'); await Promise.resolve();
  assert.equal(m.read().mode, 'touch'); assert.equal(e.callbacks.length, 0);
});
test('already hidden documents do not request permission', async () => {
  const e = env(); e.hide(); const m = createMotionControl(e);
  assert.equal(await m.enable(), false); assert.equal(e.asked, 0);
});
test('partially failing listener installation is removed and settles enable', async () => {
  const e = env(); let callback; e.add = f => { callback = f; throw Error('blocked'); };
  const m = createMotionControl(e); assert.equal(await m.enable(), false);
  callback(flatEvent); assert.equal(m.read().mode, 'touch'); assert.equal(e.removed, 1); assert.equal(e.timerCount, 0);
});
test('recenter in touch mode preserves the status', () => {
  const m = createMotionControl(env()); m.recenter(); assert.equal(m.read().status, '触控平衡');
});

function fakeBrowser({orientation = true, motion = true, secure = true} = {}) {
  const events = new Map(), docEvents = new Map();
  let asked = 0;
  const eventMethods = map => ({
    addEventListener: (type, callback) => map.set(type, callback),
    removeEventListener: (type, callback) => { if (map.get(type) === callback) map.delete(type); }
  });
  const permissionAPI = {requestPermission() { asked++; return Promise.resolve('granted'); }};
  return {
    ...eventMethods(events),
    isSecureContext: secure,
    DeviceOrientationEvent: orientation ? permissionAPI : undefined,
    DeviceMotionEvent: motion ? permissionAPI : undefined,
    screen: {orientation: {angle: 0}},
    document: {...eventMethods(docEvents), hidden: false},
    emit: (type, event) => events.get(type)?.(event),
    hide() { this.document.hidden = true; docEvents.get('visibilitychange')?.(); },
    get asked() { return asked; },
    get listeners() { return events.size + docEvents.size; }
  };
}

async function withBrowser(options, check) {
  const previous = globalThis.window;
  globalThis.window = fakeBrowser(options);
  try { await check(globalThis.window); }
  finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; }
}

test('default browser adapter requests orientation only on enable and cleans visibility hooks', async () => {
  await withBrowser({}, async win => {
    const m = createMotionControl(); assert.equal(win.asked, 0); assert.equal(win.listeners, 0);
    await m.enable(); assert.equal(win.asked, 1);
    win.emit('deviceorientation', flatEvent); assert.equal(m.read().flat, true);
    win.hide(); assert.equal(m.read().mode, 'touch'); assert.equal(win.listeners, 0);
  });
});
test('default adapter uses DeviceMotion when orientation is absent', async () => {
  await withBrowser({orientation: false}, async win => {
    const m = createMotionControl(); await m.enable(); win.emit('devicemotion', gravity(0, 0, 9.81));
    assert.equal(m.read().flat, true); m.stop(); assert.equal(win.listeners, 0);
  });
});
test('default adapter handles pagehide without waiting for a read', async () => {
  await withBrowser({}, async win => {
    const m = createMotionControl(); await m.enable(); win.emit('pagehide', {});
    assert.equal(win.listeners, 0); assert.equal(m.read().mode, 'touch');
  });
});
test('default adapter refuses an insecure context without a permission prompt', async () => {
  await withBrowser({secure: false}, async win => {
    const m = createMotionControl(); assert.equal(await m.enable(), false); assert.equal(win.asked, 0);
  });
});
