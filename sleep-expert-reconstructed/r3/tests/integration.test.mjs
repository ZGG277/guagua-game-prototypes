import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// The unchanged, shipped classic bundle is the system under test. No engine
// imports, source rewriting, exposed private state, copied gameplay logic, or
// sensor shim. The DOM/canvas/audio/native bridge below are test doubles, not
// evidence that a browser layout or a real Xiaohongshu API has been validated.
const bundle = readFileSync(new URL('../artifact/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../artifact/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../artifact/style.css', import.meta.url), 'utf8');
const flush = async () => { for (let i = 0; i < 25; i++) await Promise.resolve(); };
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return {promise, resolve, reject}; }
function eventTarget(parent = null) {
  const listeners = new Map();
  const api = {
    _parent: parent,
    _listeners: listeners,
    addEventListener(type, callback, options) { if (!listeners.has(type)) listeners.set(type, new Map()); listeners.get(type).set(callback, typeof options === 'boolean' ? options : !!options?.capture); },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
    emit(type, data = {}) {
      const event = {type, target: this, bubbles: !['blur', 'visibilitychange'].includes(type), cancelable: true, defaultPrevented: false, stopped: false,
        preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; }, ...data};
      const chain = [this];
      for (let node = this._parent?.(); node; node = node._parent?.()) chain.push(node);
      const call = (node, capture) => { event.currentTarget = node; for (const [listener, isCapture] of [...(node._listeners.get(type) || [])]) if (isCapture === capture) listener(event); };
      for (const node of [...chain].reverse()) { call(node, true); if (event.stopped) return event; }
      call(chain[0], false);
      if (event.bubbles) for (const node of chain.slice(1)) { if (event.stopped) break; call(node, false); }
      return event;
    }
  };
  return api;
}
function canvasDouble() {
  const calls = [];
  const context = new Proxy({calls}, {get(object, key) {
    if (key in object) return object[key];
    if (key === 'createRadialGradient' || key === 'createLinearGradient') return () => ({addColorStop() {}});
    return (...args) => { if (key === 'clearRect') calls.length = 0; calls.push({method: key, args}); };
  }});
  return context;
}
function audioDouble(now, schedule) {
  const log = {contexts: 0, starts: 0, stops: 0, gains: []};
  const param = () => ({value: 0, setValueAtTime(value) { this.value = value; }, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}});
  function node() { return {gain: param(), frequency: param(), connect() {}, disconnect() {}, start() { log.starts++; }, stop(at) { log.stops++; if (at) schedule(() => this.onended?.(), Math.max(0, at * 1000 - now())); else this.onended?.(); }}; }
  class Context {
    constructor() { log.contexts++; this.state = 'running'; this.sampleRate = 100; this.destination = {}; }
    get currentTime() { return now() / 1000; }
    createGain() { const result = node(); log.gains.push(result); return result; }
    createOscillator() { return node(); }
    createBufferSource() { return node(); }
    createBiquadFilter() { return node(); }
    createBuffer() { return {getChannelData: () => new Float32Array(100)}; }
    async resume() { this.state = 'running'; }
    async close() { this.state = 'closed'; }
  }
  return {Context, log};
}
function bridgeDouble(overrides = {}) {
  const calls = {getRankList: [], getMyRank: [], submitScore: [], postNote: [], followAuthor: [], getFollowStatus: []};
  const defaults = {
    getRankList: async () => ({data: [{rank: 1, nickname: '安静的小红薯', score: -42.5}]}),
    getMyRank: async () => ({status: 'EXACT', rank: 1, score: -42.5}),
    submitScore: async args => ({score: args.score}),
    postNote: async () => ({}), followAuthor: async () => ({follow_status: 1}), getFollowStatus: async () => ({follow_status: 0})
  };
  const miniTool = Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, (...args) => { calls[key].push(args); return (overrides[key] || value)(...args); }]));
  return {xhs: {launchOptions: {miniToolEnv: {buildVersion: 9510000}}, miniTool}, calls};
}
function harness({bridge = bridgeDouble(), width = 390, storage = {}, storageFailure = '', audio = false} = {}) {
  let now = 1000, nextId = 0;
  const frames = new Map(), timers = new Map(), elements = new Map(), practice = [];
  const schedule = (callback, delay = 0) => { const id = ++nextId; timers.set(id, {at: now + delay, callback}); return id; };
  function makeElement(tag = 'div', attributes = '') {
    const attrs = Object.fromEntries([...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
    const classes = new Set((attrs.class || '').split(/\s+/).filter(Boolean));
    const canvas = tag === 'canvas' ? canvasDouble() : null;
    let text = '', inner = '';
    const el = {
      ...eventTarget(() => document), tagName: tag.toUpperCase(), id: attrs.id || '', dataset: {}, style: {}, children: [], attributes: attrs,
      disabled: /(?:^|\s)disabled(?:\s|$)/.test(attributes), width: Number(attrs.width || 0), height: Number(attrs.height || 0),
      get clientWidth() { return width; },
      get textContent() { return text + this.children.map(child => child.textContent).join(''); },
      set textContent(value) { text = String(value); this.children.length = 0; },
      get innerHTML() { return inner; }, set innerHTML(value) { inner = String(value); this.children.length = 0; },
      classList: {add: (...names) => names.forEach(name => classes.add(name)), remove: (...names) => names.forEach(name => classes.delete(name)), contains: name => classes.has(name), toggle(name, force) { const enabled = force ?? !classes.has(name); if (enabled) classes.add(name); else classes.delete(name); return enabled; }},
      setAttribute(name, value) { attrs[name] = String(value); }, getAttribute(name) { return attrs[name] ?? null; },
      appendChild(child) { this.children.push(child); return child; },
      getContext() { assert.ok(canvas, 'getContext only belongs to an actual canvas'); return canvas; },
      toDataURL() { return 'data:image/png;base64,Y2FyZA=='; },
      getBoundingClientRect() { const height = tag === 'canvas' && this.id === 'scene' ? 530 * width / 390 : 112; return {left: 0, top: 0, right: width, bottom: height, width, height}; },
      focus() {}, setPointerCapture() {}, releasePointerCapture() {}
    };
    for (const [key, value] of Object.entries(attrs)) if (key.startsWith('data-')) el.dataset[key.slice(5)] = value;
    if (el.id) elements.set(el.id, el);
    if (attrs['data-practice']) { practice.push(el); elements.set('practice-' + attrs['data-practice'], el); }
    return el;
  }
  for (const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/g)) makeElement(match[1], match[2]);
  const element = id => { const el = elements.get(id); assert.ok(el, `Missing actual HTML element: ${id}`); return el; };
  const document = {...eventTarget(() => window), hidden: false, getElementById: element, querySelectorAll(selector) { assert.equal(selector, '[data-practice]'); return practice; }, createElement: tag => makeElement(tag)};
  const sound = audioDouble(() => now, schedule);
  const window = {...eventTarget(), document, devicePixelRatio: 1, xhs: bridge?.xhs, AudioContext: audio ? sound.Context : undefined};
  const saved = new Map(Object.entries(storage));
  const localStorage = {getItem: key => { if (storageFailure === 'read') throw Error('Storage read blocked'); return saved.get(key) ?? null; }, setItem: (key, value) => { if (storageFailure === 'write') throw Error('Storage quota exceeded'); saved.set(key, String(value)); }};
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const sandbox = {window, document, Date: ClockDate, performance: {now: () => now}, localStorage,
    requestAnimationFrame: callback => { const id = ++nextId; frames.set(id, callback); return id; }, cancelAnimationFrame: id => frames.delete(id),
    setTimeout: schedule, clearTimeout: id => timers.delete(id), console};
  vm.runInNewContext(bundle, sandbox, {filename: 'artifact/app.js', timeout: 2000});
  const pointer = (x = width / 2, y = 50, id = 1) => ({pointerId: id, isPrimary: id === 1, button: 0, clientX: x, clientY: y});
  function advance(ms) {
    const end = now + ms;
    for (;;) { const due = [...timers].filter(([, item]) => item.at <= end).sort((a, b) => a[1].at - b[1].at)[0]; if (!due) break; timers.delete(due[0]); now = due[1].at; due[1].callback(); }
    now = end;
  }
  const h = {
    window, document, element, saved, bridge, sound: sound.log, pointer, advance,
    now: () => now, phase: () => element('scene').dataset.phase,
    number: name => Number(element('scene').dataset[name]),
    hidden: id => element(id).classList.contains('hidden'),
    click: id => element(id).emit('click', {detail: 0, clientX: width / 2, clientY: 50}),
    down: (id, x, y, pointerId) => element(id).emit('pointerdown', pointer(x, y, pointerId)),
    move: (x, y, pointerId) => window.emit('pointermove', pointer(x, y, pointerId)),
    up: (x, y, pointerId) => window.emit('pointerup', pointer(x, y, pointerId)),
    keydown: key => element('scene').emit('keydown', {key, repeat: false}), keyup: key => window.emit('keyup', {key}),
    frame(ms = 20) { advance(ms); const current = [...frames]; frames.clear(); for (const [, callback] of current) callback(now); },
    hide() { document.hidden = true; document.emit('visibilitychange'); }, show() { document.hidden = false; document.emit('visibilitychange'); },
    draw: id => element(id).getContext('2d').calls,
    shortTap(id = 'rhythm-pad') { h.down(id); h.frame(20); h.up(); },
    until(predicate, maxMs = 10000, beforeFrame = () => {}) { const limit = now + maxMs; while (!predicate() && now < limit) { beforeFrame(); h.frame(); } assert.ok(predicate(), `Timed out at ${h.phase()} after ${maxMs}ms: ${element('feedback').textContent}`); },
    run(ms, beforeFrame = () => {}) { const limit = now + ms; while (now < limit) { beforeFrame(); h.frame(Math.min(20, limit - now)); } }
  };
  return h;
}
function ready(h, id = 'rhythm-pad') { return h.element(id).classList.contains('ready'); }
function reachLower(h) {
  h.click('start');
  h.until(() => h.phase() === 'pat', 30000, () => { if (ready(h)) h.shortTap(); });
  h.until(() => h.phase() === 'lower', 15000, () => { if (ready(h)) h.shortTap(); });
}
function lower(h) {
  let x = 160;
  h.down('gesture-pad', x, 50);
  // Steer from the actual rendered balance dot, like a user reading the gauge.
  h.until(() => h.phase() === 'leg', 20000, () => {
    const dot = h.draw('scene').find(call => call.method === 'ellipse' && call.args[1] === 53 && call.args[2] === 5 && call.args[3] === 5);
    if (dot) { x -= (dot.args[0] - 195) * .08; h.move(x, 50); }
  });
  h.up(x, 50);
}
function extractHands(h) {
  const attempts = {leg: 0, head: 0};
  for (const phase of ['leg', 'head']) {
    assert.equal(h.phase(), phase);
    let held = false, started = 0;
    h.until(() => h.phase() !== phase, 50000, () => {
      if (held && (h.now() - started >= (phase === 'leg' ? 320 : 260) || !ready(h, 'gesture-pad'))) { h.up(); held = false; }
      else if (!held && ready(h, 'gesture-pad') && h.now() - started > 1000) { h.down('gesture-pad'); held = true; started = h.now(); attempts[phase]++; }
    });
    if (held) h.up();
  }
  assert.equal(h.phase(), 'settle');
  return attempts;
}
function finishSleep(h) {
  h.until(() => h.phase() === 'sleeping', 10000, () => { if (ready(h)) h.shortTap(); });
}
function completeNormalRun(h) { reachLower(h); lower(h); extractHands(h); finishSleep(h); }
function guardSleep(h, ms) {
  h.run(ms, () => {
    // All warning labels are emitted by the actual draw code. Use their screen
    // positions rather than reaching into game.events or reproducing its timer.
    const alerts = h.draw('scene').filter(call => call.method === 'fillText' && call.args[0] === '!');
    for (const alert of alerts) { const r = h.element('scene').getBoundingClientRect(); const x = alert.args[1] * r.width / 390, y = alert.args[2] * r.height / 530; h.down('scene', x, y); h.up(x, y); }
  });
}

test('bundle: boot enables start; actual start handler hides intro and starts one run', () => {
  const h = harness(); assert.equal(h.element('start').disabled, false); assert.equal(h.element('boot-status').textContent, '');
  assert.equal(h.hidden('intro'), false); h.click('start'); assert.equal(h.hidden('intro'), true); assert.equal(h.phase(), 'rock');
  h.run(100); assert.ok(Number.parseFloat(h.element('rest-label').textContent) > 0); assert.equal(h.element('scene').dataset.practice, 'false');
  assert.match(html, /<script src="\.\/app\.js"><\/script>/); assert.doesNotMatch(bundle, /DeviceOrientationEvent|requestPermission|deviceorientation/);
});

test('bundle: main nav has one music toggle and ranking; music switches do not duplicate audio contexts', async () => {
  const nav = html.match(/<nav>(.*?)<\/nav>/s)[1];
  assert.equal((nav.match(/id="music"/g) || []).length, 1); assert.equal((nav.match(/id="ranking"/g) || []).length, 1); assert.doesNotMatch(nav, /all-sound|sensor/);
  const h = harness({audio: true}); assert.equal(h.sound.contexts, 0); h.click('start'); await flush(); h.frame();
  assert.equal(h.sound.contexts, 1); assert.ok(h.sound.starts > 0);
  h.click('music'); const starts = h.sound.starts; h.run(2000); assert.equal(h.sound.starts, starts); assert.equal(h.element('music').textContent, '音乐 关');
  h.click('music'); h.frame(); assert.ok(h.sound.starts > starts); assert.equal(h.sound.contexts, 1);
});

for (const surface of ['rhythm-pad', 'scene']) test(`bundle: short release near vertex scores once on ${surface}, including early queued impulse`, () => {
  const h = harness(); h.click('start'); h.until(() => ready(h));
  h.down(surface); assert.equal(h.number('progress'), 0, 'rock does not score at pointerdown'); h.frame(); h.up();
  assert.equal(h.number('progress'), 0, 'early tap must wait for the apex'); assert.match(h.element('feedback').textContent, /接住|等它转/);
  h.run(350); assert.equal(h.number('progress'), .14, 'normal release must not clear the queued impulse');
  h.element(surface).emit('click', {detail: 1, clientX: 195, clientY: 50}); h.run(50); assert.equal(h.number('progress'), .14, 'compatibility click must not duplicate the impulse');
});

for (const at of [640, 720]) test(`bundle: release at ${at + 20}ms scores an exact/late vertex tap immediately`, () => {
  const h = harness(); h.click('start'); h.run(at); h.shortTap(); assert.equal(h.number('progress'), .14); assert.match(h.element('feedback').textContent, /向内推/);
});

test('bundle: long press and visible drag do not count as a cradle tap', () => {
  for (const drag of [false, true]) {
    const h = harness(); h.click('start'); h.until(() => ready(h)); h.down('rhythm-pad', 120, 50);
    if (drag) { h.move(160, 50); h.frame(); h.up(160, 50); } else { h.run(650); h.up(120, 50); }
    h.run(300); assert.equal(h.number('progress'), 0);
  }
});

test('bundle: a drag that returns to its origin is still not a short tap', () => {
  const h = harness(); h.click('start'); h.until(() => ready(h)); h.down('rhythm-pad', 120, 50); h.move(170, 50); h.frame(); h.move(120, 50); h.up(120, 50); h.run(350);
  assert.equal(h.number('progress'), 0);
});

for (const family of ['pointer', 'touch']) test(`bundle: ${family} multi-contact cancels pending press with no later ghost tap`, () => {
  const h = harness(); h.click('start'); h.until(() => ready(h)); const pad = h.element('rhythm-pad');
  if (family === 'pointer') { h.down('rhythm-pad'); h.down('rhythm-pad', 140, 50, 2); h.up(); }
  else { const a = {identifier: 1, clientX: 100, clientY: 50}, b = {identifier: 2, clientX: 160, clientY: 50}; pad.emit('touchstart', {touches: [a], changedTouches: [a]}); pad.emit('touchstart', {touches: [a, b], changedTouches: [b]}); h.window.emit('touchend', {touches: [], changedTouches: [a, b]}); }
  h.run(350); assert.equal(h.number('progress'), 0);
});

test('bundle: second pointer on another input surface cancels the first press', () => {
  const h = harness(); h.click('start'); h.until(() => ready(h)); h.down('rhythm-pad'); h.down('scene', 140, 50, 2); h.up(); h.run(350);
  assert.equal(h.number('progress'), 0);
});

for (const interrupt of ['help', 'background', 'blur']) test(`bundle: ${interrupt} clears holds, keys and queued impulses; release cannot leak into resume`, () => {
  const h = harness(); h.click('practice-lower'); h.down('gesture-pad'); h.keydown('ArrowRight'); h.run(120);
  if (interrupt === 'help') h.click('help'); else if (interrupt === 'background') h.hide(); else h.window.emit('blur');
  if (interrupt === 'background') { h.advance(60000); h.show(); assert.equal(h.element('scene').dataset.paused, 'true'); }
  if (interrupt !== 'blur') h.click('resume');
  h.up(); h.run(100); const lower = h.number('lower'); h.run(300); assert.equal(h.number('lower'), lower);
  h.click('start'); h.until(() => ready(h)); h.shortTap(); assert.match(h.element('feedback').textContent, /接住|等它转/);
  if (interrupt === 'help') { h.click('help'); h.click('resume'); } else if (interrupt === 'background') { h.hide(); h.show(); h.click('resume'); } else h.window.emit('blur');
  h.run(400); assert.equal(h.number('progress'), 0);
});

for (const family of ['pointer', 'touch', 'mouse', 'keyboard']) test(`bundle: ${family} release outside the pad stops lowering`, () => {
  const h = harness(); h.click('practice-lower'); const pad = h.element('gesture-pad'), t = {identifier: 9, clientX: 150, clientY: 50};
  if (family === 'pointer') h.down('gesture-pad'); else if (family === 'touch') pad.emit('touchstart', {touches: [t], changedTouches: [t]}); else if (family === 'mouse') pad.emit('mousedown', {button: 0, clientX: 150, clientY: 50}); else h.keydown(' ');
  h.run(100); assert.ok(h.number('lower') > 0);
  if (family === 'pointer') h.up(900, 900); else if (family === 'touch') h.window.emit('touchend', {touches: [], changedTouches: [{...t, clientX: 900}]}); else if (family === 'mouse') h.window.emit('mouseup', {button: 0, clientX: 900, clientY: 900}); else h.keyup(' ');
  h.run(100); const stopped = h.number('lower'); h.run(300); assert.equal(h.number('lower'), stopped);
});

test('bundle: holding early through breathing windows never extracts the hand', () => {
  const h = harness(); h.click('practice-leg'); h.down('gesture-pad'); h.run(7000, () => {
    assert.ok(!['head', 'settle', 'sleeping'].includes(h.phase()));
    if (h.phase() === 'leg') assert.equal(h.number('hand'), 0);
  });
  // Wrong continuous input may wake the baby; it must never earn hand progress.
  assert.equal(h.number('hand'), 0); h.up(); h.click('practice-leg');
  h.until(() => ready(h, 'gesture-pad'), 5000); h.down('gesture-pad'); h.run(200); h.up(); h.run(100); assert.ok(h.number('hand') > 0, 'fresh settled press in the window can recover');
});

test('bundle: actual breathing controls require at least four leg and five head windows', () => {
  const h = harness(); h.click('practice-leg'); const begun = h.now(), attempts = extractHands(h);
  assert.ok(attempts.leg >= 4, JSON.stringify(attempts)); assert.ok(attempts.head >= 5, JSON.stringify(attempts)); assert.ok(h.now() - begun >= 30000);
});

test('bundle: full real-handler run seals time at first sleeping, submits once, rewards only after 60 seconds', async () => {
  const h = harness(); reachLower(h); lower(h); const attempts = extractHands(h); assert.ok(attempts.leg >= 4 && attempts.head >= 5); finishSleep(h); await flush();
  assert.equal(h.bridge.calls.submitScore.length, 1); const submitted = h.bridge.calls.submitScore[0][0]; assert.equal(submitted.board, 2); assert.ok(submitted.score < -30);
  const sealedLabel = h.element('rest-label').textContent; assert.equal(h.hidden('reward-overlay'), true);
  guardSleep(h, 59000); assert.equal(h.phase(), 'sleeping'); assert.equal(h.hidden('reward-overlay'), true); assert.equal(h.element('rest-label').textContent, sealedLabel);
  guardSleep(h, 1200); await flush(); assert.equal(h.hidden('reward-overlay'), false);
  assert.equal(h.element('result-time').textContent, (-submitted.score).toFixed(2) + ' 秒'); assert.equal(h.bridge.calls.submitScore.length, 1); assert.equal(h.bridge.calls.getFollowStatus.length, 1);
  const stopped = h.number('rest'); h.run(2000); assert.equal(h.number('rest'), stopped); assert.equal(h.bridge.calls.submitScore.length, 1);
});

test('bundle: help and background wall time stays in the result without a false frame-gap failure', async () => {
  const h = harness(); reachLower(h); h.click('help'); h.advance(60000); h.click('resume'); h.hide(); h.advance(60000); h.show(); h.click('resume');
  lower(h); extractHands(h); finishSleep(h); await flush(); assert.equal(h.bridge.calls.submitScore.length, 1); assert.ok(h.bridge.calls.submitScore[0][0].score < -150);
});

for (const failure of ['read', 'write']) test(`bundle: fastest storage ${failure} failure is visible without erasing a successful score`, async () => {
  const h = harness({storageFailure: failure}); completeNormalRun(h); await flush(); assert.equal(h.bridge.calls.submitScore.length, 1);
  assert.match(h.element('local-save-status').textContent, failure === 'read' ? /读取失败/ : /保存失败/); assert.match(h.element('rank-submit-status').textContent, /已提交/);
});

for (const code of [1005, 2004]) test(`bundle: submission error ${code} is shown truthfully and never retried per frame`, async () => {
  const bridge = bridgeDouble({submitScore: async () => { throw {errCode: code, errMsg: 'submit failed'}; }}), h = harness({bridge});
  completeNormalRun(h); await flush(); assert.equal(bridge.calls.submitScore.length, 1); assert.match(h.element('rank-submit-status').textContent, code === 1005 ? /未授权/ : /待确认/);
  h.run(3000); await flush(); assert.equal(bridge.calls.submitScore.length, 1); assert.equal(h.hidden('ranking'), code === 1005);
});

test('bundle: restarting while score submission is pending ignores the obsolete result', async () => {
  const request = deferred(), bridge = bridgeDouble({submitScore: () => request.promise}), h = harness({bridge});
  completeNormalRun(h); await flush(); assert.equal(bridge.calls.submitScore.length, 1); h.click('restart'); request.resolve({score: -50}); await flush();
  assert.equal(h.phase(), 'rock'); assert.equal(h.element('rank-submit-status').textContent, ''); assert.equal(h.hidden('reward-overlay'), true); assert.equal(bridge.calls.submitScore.length, 1);
});

test('bundle: practice guard sleep reaches the reward without score submission or fastest storage', async () => {
  const h = harness(); h.click('practice-sleeping'); await flush(); assert.equal(h.element('scene').dataset.practice, 'true');
  guardSleep(h, 60300); await flush(); assert.equal(h.hidden('reward-overlay'), false); assert.equal(h.bridge.calls.submitScore.length, 0); assert.equal(h.saved.size, 0); assert.match(h.element('rank-submit-status').textContent, /练习/);
});

test('bundle: ranking renders platform rows and exact status without inventing a result', async () => {
  const h = harness(); h.click('practice-lower'); h.down('gesture-pad'); h.run(100); h.click('ranking'); await flush();
  assert.equal(h.hidden('ranking-overlay'), false); const lower = h.number('lower'); h.run(1000); assert.equal(h.number('lower'), lower);
  assert.equal(h.element('rank-list').children.length, 1); assert.match(h.element('rank-list').textContent, /安静的小红薯.*42.50 秒/); assert.equal(h.element('my-rank').textContent, '我的排名 1 · 42.50 秒');
  h.click('close-ranking'); assert.equal(h.element('scene').dataset.paused, 'false');
});

test('bundle: local fastest is awaited and displayed using the storage result contract', async () => {
  const h = harness({storage: {'sleep-expert-fastest-ms-v2': '12345'}}); h.click('ranking'); await flush();
  assert.equal(h.element('local-fastest').textContent, '本机最快 12.35 秒');
});

for (const scenario of [
  {code: 1005, message: /未授权/, hidden: true}, {code: 2008, message: /暂不可用/, hidden: false}, {code: null, message: /bridge down/, hidden: false}
]) test(`bundle: ranking error ${scenario.code} is surfaced without false success`, async () => {
  const bridge = bridgeDouble({getRankList: async () => { throw {errCode: scenario.code, errMsg: 'bridge down'}; }});
  const h = harness({bridge}); h.click('ranking'); await flush(); assert.match(h.element('rank-status').textContent, scenario.message);
  assert.equal(h.element('rank-list').children.length, 0); assert.equal(h.element('my-rank').textContent, ''); assert.equal(h.hidden('ranking'), scenario.hidden);
  if (scenario.hidden) { assert.equal(h.hidden('ranking-unavailable'), false); h.click('ranking'); await flush(); assert.equal(bridge.calls.getRankList.length, 1); }
});

test('bundle: unsupported browser shows platform unavailability instead of a fabricated leaderboard', async () => {
  const h = harness({bridge: null}); h.click('ranking'); await flush(); assert.match(h.element('rank-status').textContent, /小红书小工具/); assert.equal(h.element('rank-list').children.length, 0);
});

for (const [status, label] of [['OVER_LIMIT', '我的排名 500+'], ['NO_SCORE', '本期尚无成绩'], ['NOT_PARTICIPATING', '本期未参与排行']]) test(`bundle: platform status ${status} is not converted into an invented exact rank`, async () => {
  const h = harness({bridge: bridgeDouble({getRankList: async () => ({data: []}), getMyRank: async () => ({status})})}); h.click('ranking'); await flush();
  assert.equal(h.element('my-rank').textContent, label); assert.equal(h.element('rank-status').textContent, '还没有有效成绩');
});

test('bundle: malformed leaderboard scores are rejected rather than presented as valid times', async () => {
  const h = harness({bridge: bridgeDouble({getRankList: async () => ({data: [{rank: 1, nickname: '无效成绩', score: 50}]})})}); h.click('ranking'); await flush();
  assert.match(h.element('rank-status').textContent, /成绩单位异常/); assert.equal(h.element('rank-list').children.length, 0); assert.equal(h.element('my-rank').textContent, '');
});

test('bundle: ranking pending coalesces repeated gestures, rows and pause ownership', async () => {
  const request = deferred(), bridge = bridgeDouble({getRankList: () => request.promise}), h = harness({bridge});
  h.click('start'); h.click('ranking'); h.click('ranking'); await flush(); assert.equal(bridge.calls.getRankList.length, 1);
  request.resolve({data: [{rank: 1, nickname: '只出现一次', score: -50}]}); await flush(); assert.equal(h.element('rank-list').children.length, 1);
  h.click('close-ranking'); assert.equal(h.element('scene').dataset.paused, 'false');
});

test('bundle: a closed ranking response cannot duplicate the next view', async () => {
  const request = deferred(), h = harness({bridge: bridgeDouble({getRankList: () => request.promise})});
  h.click('start'); h.click('ranking'); h.click('close-ranking'); h.click('ranking'); await flush(); request.resolve({data: [{rank: 1, nickname: '新视图', score: -50}]}); await flush();
  assert.equal(h.element('rank-list').children.length, 1); h.click('close-ranking'); assert.equal(h.element('scene').dataset.paused, 'false');
});

test('bundle: share and follow pending operations block duplicate actions and display cancellation honestly', async () => {
  const share = deferred(), follow = deferred(), bridge = bridgeDouble({postNote: () => share.promise, followAuthor: () => follow.promise}), h = harness({bridge});
  h.click('practice-sleeping'); guardSleep(h, 60300); await flush(); h.click('share'); h.click('share'); h.click('follow'); h.click('follow'); await flush();
  assert.equal(bridge.calls.postNote.length, 1); assert.equal(bridge.calls.followAuthor.length, 1); assert.equal(h.element('share').disabled, true); assert.equal(h.element('follow').disabled, true);
  follow.reject({errCode: 20002}); await flush(); assert.match(h.element('result-status').textContent, /取消/); assert.equal(h.element('follow').disabled, false);
  share.reject({errMsg: 'share cancelled'}); await flush(); assert.match(h.element('result-status').textContent, /share cancelled/); assert.equal(h.element('share').disabled, false);
});

for (const width of [320, 390]) test(`bundle: ${width}px canvas coordinates hit the actual visible warning`, () => {
  const h = harness({width}); h.click('practice-sleeping'); h.run(5100); const alert = h.draw('scene').find(call => call.method === 'fillText' && call.args[0] === '!'); assert.ok(alert);
  const r = h.element('scene').getBoundingClientRect(), x = alert.args[1] * r.width / 390, y = alert.args[2] * r.height / 530;
  h.down('scene', x, y); h.up(x, y); assert.equal(h.number('cleared'), 1);
});

test('bundle: declared gesture and rhythm input sizes exceed 44px, including narrow-screen override', () => {
  assert.match(css, /#gesture-pad\{[^}]*width:96px;[^}]*height:96px/); assert.match(css, /#gesture-pad\{width:86px;height:86px/);
  assert.match(css, /#rhythm-ui\{height:112px/); assert.match(css, /#rhythm-pad\{[^}]*width:31%/); assert.match(css, /\.rock-mode #rhythm-pad\{width:100%;top:22px/);
  assert.ok((320 - 24) * .31 >= 44); assert.ok(112 - 22 >= 44);
  // Static CSS contract only. This fixture intentionally does not assert real
  // viewport placement, occlusion, browser pointer capture, or hardware behavior.
});

test('bundle r2: old-client Storage falls back before any native read or write', async () => {
  const bridge=bridgeDouble();bridge.xhs.launchOptions.miniToolEnv.buildVersion=9459999;let nativeCalls=0;
  bridge.xhs.miniTool.getStorage=async()=>{nativeCalls++;throw Error('unsupported native storage');};
  bridge.xhs.miniTool.setStorage=async()=>{nativeCalls++;throw Error('unsupported native storage');};
  const h=harness({bridge,storage:{'sleep-expert-fastest-ms-v2':'12345'}});h.click('ranking');await flush();
  assert.equal(nativeCalls,0);assert.equal(h.element('local-fastest').textContent,'本机最快 12.35 秒');
  assert.match(h.element('rank-status').textContent,/9.51/);
});

test('bundle r2: follow 10003 displays pending-confirmation message without a leaderboard claim', async () => {
  const bridge=bridgeDouble({followAuthor:async()=>{throw {errCode:10003,errMsg:'confirmation pending'};}}),h=harness({bridge});
  h.click('practice-sleeping');guardSleep(h,60300);await flush();h.click('follow');await flush();
  assert.equal(bridge.calls.followAuthor.length,1);assert.equal(h.element('follow').disabled,false);
  assert.match(h.element('result-status').textContent,/关注确认流程尚未结束/);assert.doesNotMatch(h.element('result-status').textContent,/排行榜|白名单/);
});

test('bundle r3: stale share/follow replies cannot overwrite a restarted run', async () => {
 const share=deferred(),follow=deferred(),bridge=bridgeDouble({postNote:()=>share.promise,followAuthor:()=>follow.promise}),h=harness({bridge});
 h.click('practice-sleeping');guardSleep(h,60300);await flush();h.click('share');h.click('follow');await flush();
 h.click('result-restart');assert.equal(h.phase(),'rock');assert.equal(h.element('share').disabled,false);assert.equal(h.element('follow').disabled,false);
 share.reject({errMsg:'old share failed'});follow.reject({errCode:20002});await flush();
 assert.equal(h.element('result-status').textContent,'');assert.equal(h.hidden('reward-overlay'),true);assert.equal(h.element('share').disabled,false);assert.equal(h.element('follow').disabled,false);
});
test('bundle r3: stale follow status cannot mutate a restarted run',async()=>{
 const status=deferred(),bridge=bridgeDouble({getFollowStatus:()=>status.promise}),h=harness({bridge});
 h.click('practice-sleeping');guardSleep(h,60300);await flush();h.click('result-restart');status.resolve({follow_status:1});await flush();
 assert.equal(h.element('follow').disabled,false);
});
