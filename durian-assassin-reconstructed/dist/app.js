(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
  var __privateWrapper = (obj, member, setter, getter) => ({
    set _(value) {
      __privateSet(obj, member, value, setter);
    },
    get _() {
      return __privateGet(obj, member, getter);
    }
  });

  // source/orchard-art.js
  var C = { ink: "#173e3a", teal: "#216356", sage: "#76906c", paper: "#f1dfb5", amber: "#d8a033", rust: "#cb472a", bark: "#9a6335" };
  var TAU = Math.PI * 2;
  function fruitSlots(sim2) {
    var _a;
    return ((_a = sim2.canopy) == null ? void 0 : _a.slots) || [{ id: "legacy", x: Number.isFinite(sim2.landingX) ? sim2.landingX : 408, y: -850, z: 0, state: "released" }];
  }
  function stemTip(p) {
    const a = (p.x - 408) * 0.017;
    return { x: p.x + 2 * Math.cos(a) + 27 * Math.sin(a), y: p.y + 2 * Math.sin(a) - 27 * Math.cos(a) };
  }
  function path(c, pts, color, width = 1) {
    c.beginPath();
    pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.stroke();
  }
  function shape(c, pts, color) {
    c.beginPath();
    pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
    c.closePath();
    c.fillStyle = color;
    c.fill();
  }
  function oval(c, x, y, rx, ry, color) {
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, TAU);
    c.fillStyle = color;
    c.fill();
  }
  function branch(c, pts, width) {
    path(c, pts, C.ink, width + 4);
    path(c, pts, C.bark, width);
    path(c, pts.map(([x, y]) => [x - 3, y - 2]), C.amber, 1.8);
  }
  function leaf(c, x, y, l, w, a, color = C.teal) {
    c.save();
    c.translate(x, y);
    c.rotate(a);
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(-w * 0.9, -l * 0.19, -w * 0.9, -l * 0.64, 0, -l);
    c.bezierCurveTo(w * 0.72, -l * 0.72, w, -l * 0.3, 0, 0);
    c.fillStyle = color;
    c.fill();
    c.strokeStyle = C.ink;
    c.lineWidth = 2;
    c.stroke();
    c.save();
    c.clip();
    path(c, [[0, -3], [-1, -l * 0.52], [0, -l + 6]], C.paper, 1.1);
    for (let j = 1; j < 8; j++) {
      const t = j / 9, ww = w * Math.sin(t * Math.PI) * 0.7;
      path(c, [[0, -l * t], [-ww, -l * t - l * 0.12]], C.paper, 0.7);
      path(c, [[0, -l * t], [ww * 0.85, -l * t - l * 0.16]], C.paper, 0.7);
      if (j % 2) path(c, [[-ww * 0.5, -l * t], [1, -l * t - l * 0.11]], C.sage, 0.65);
    }
    c.restore();
    c.restore();
  }
  function drawOrchard(c, sim2, layer = "back") {
    c.save();
    if (layer === "front") {
      c.beginPath();
      c.rect(-1800, -2e3, 4e3, 1350);
      c.clip();
      for (const p of fruitSlots(sim2)) {
        c.save();
        c.beginPath();
        c.rect(p.x - 27, p.y - 29, 54, 32);
        c.clip();
        leaf(c, p.x + 9, p.y + 5, 40, 20, -0.56, C.teal);
        c.restore();
      }
      c.restore();
      return;
    }
    c.fillStyle = C.paper;
    c.fillRect(-1800, -2200, 4e3, 4400);
    oval(c, -120, -935, 143, 143, C.rust);
    c.save();
    c.beginPath();
    c.arc(-120, -935, 143, 0, TAU);
    c.clip();
    for (let i = 0; i < 20; i++) path(c, [[-280, -1070 + i * 15], [50, -1082 + i * 15]], C.paper, 0.9);
    c.restore();
    for (let i = 0; i < 5; i++) {
      let x = -740 + i * 480;
      path(c, [[x, 525], [x - 23, -420 - i % 3 * 70]], "rgba(118,144,108,0.3333333333333333)", 11);
      for (let j = 0; j < 3; j++) leaf(c, x, -170 - j * 90, 210, 49, (j - 1) * 0.65, "rgba(118,144,108,0.3333333333333333)");
    }
    shape(c, [[-1800, 523], [-400, 492], [160, 500], [700, 478], [1800, 501], [1800, 1800], [-1800, 1800]], C.amber);
    for (let i = 0; i < 33; i++) {
      let x = i * 179 % 2300 - 800, y = 564 + i * 31 % 210;
      path(c, [[x - 5, y], [x + 8, y - 2]], C.bark, 0.8);
    }
    c.save();
    c.translate(0, 550);
    c.scale(1, 1.4);
    c.translate(0, -550);
    branch(c, [[595, 558], [567, 230], [581, -180], [551, -590], [566, -1040]], 61);
    for (let i = 0; i < 8; i++) {
      const x = 545 + i * 5;
      path(c, [[x + 34, 535], [x + 9, 190], [x + 20, -180], [x - 5, -590], [x + 7, -1030]], i % 3 ? C.ink : C.amber, i % 3 ? 1 : 2.1);
    }
    for (let i = 0; i < 28; i++) {
      let y = 480 - i * 53, x = 573 + Math.sin(i * 0.65) * 9;
      path(c, [[x + 5, y], [x, y - 17], [x + 3, y - 26]], C.paper, 0.9);
    }
    shape(c, [[569, 490], [536, 547], [486, 565], [570, 550], [625, 568], [656, 560], [609, 537], [597, 490]], C.ink);
    branch(c, [[554, -543], [405, -704], [240, -784], [152, -949]], 29);
    branch(c, [[562, -805], [486, -922], [340, -929]], 18);
    branch(c, [[572, -370], [714, -522], [866, -597]], 24);
    branch(c, [[565, -959], [742, -1030], [901, -1042]], 22);
    for (const [k, root] of [[152, -949], [240, -784], [340, -929], [566, -1030], [742, -1030], [901, -1042], [866, -597]].entries()) {
      for (let j = 0; j < 5; j++) {
        const angle = (j - 2) * 0.57 + (k % 2 ? 0.15 : -0.13), length = (k > 2 && k < 6 ? 80 : 120) + j % 3 * 15;
        leaf(c, root[0], root[1] + 8, length, 27 + j % 2 * 7, angle, (j + k) % 5 === 0 ? C.sage : C.teal);
      }
    }
    c.restore();
    for (const [i, p] of fruitSlots(sim2).entries()) {
      const t = stemTip(p), forkX = 555 - i % 3 * 8;
      branch(c, [[forkX, p.y - 95], [p.x + 39, p.y - 65], [t.x, t.y]], i % 3 === 0 ? 4 : 3);
      leaf(c, p.x + 40, p.y - 65, 68, 16, 0.9, C.teal);
    }
    for (const p of fruitSlots(sim2)) if (p.state === "hanging") drawFruit(c, { x: p.x + (p.z || 0) * 0.48, y: p.y - (p.z || 0) * 0.24 }, 1);
    for (const side of [-1, 1]) {
      const x = side < 0 ? -34 : 805;
      for (let i = 0; i < 4; i++) leaf(c, x, 559, 95 + i * 22, 17 + i * 3, side * (0.22 + i * 0.27), i % 2 ? C.ink : C.teal);
    }
    oval(c, 290, 552, 106, 6, "rgba(23,62,58,0.09411764705882353)");
    const f = sim2.fruit;
    if (f) {
      const proximity = Math.max(0, 1 - (550 - f.y) / 450);
      oval(c, f.x + (f.z || 0) * 0.48, 553, 22 + Math.max(0, 550 - f.y) * 0.025, 4 + proximity * 2, "rgba(23,62,58,".concat(proximity * 0.22, ")"));
    }
    c.restore();
  }
  function drawFruit(c, p, size = 1) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
    c.save();
    c.translate(p.x, p.y);
    c.scale(size, size);
    c.rotate((p.x - 408) * 0.017);
    const ring = [];
    for (let i = 0; i < 44; i++) {
      const a = i * TAU / 44, r = i % 2 ? 20.4 : 24.7 + i % 6 * 0.12;
      ring.push([Math.cos(a) * r, Math.sin(a) * r * 1.04]);
    }
    shape(c, ring, C.ink);
    oval(c, 0, 0, 19.4, 21.6, C.amber);
    c.save();
    c.beginPath();
    c.ellipse(0, 0, 19.4, 21.6, 0, 0, TAU);
    c.clip();
    shape(c, [[3, -23], [23, -15], [23, 24], [-3, 24], [6, 8]], C.teal);
    for (let i = 0; i < 28; i++) {
      const a = i * 2.399, r = Math.sqrt((i + 0.5) / 28) * 19, x = Math.cos(a) * r, y = Math.sin(a) * r * 1.08;
      shape(c, [[x - 2.7, y + 1.8], [x + 0.2, y - 3.4], [x + 2.7, y + 1.6]], x > 4 ? C.amber : C.ink);
      path(c, [[x - 0.8, y + 1], [x + 0.3, y - 1.7]], C.paper, 0.65);
    }
    path(c, [[-7, -19], [-10, -7], [-7, 7], [-3, 19]], C.paper, 0.8);
    c.restore();
    path(c, [[0, -21], [2, -27]], C.ink, 3);
    path(c, [[0, -22], [1, -26]], C.bark, 1);
    c.restore();
  }

  // source/material-art.js
  var clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  var finite = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y);
  var sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) });
  var cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
  var len = (a) => Math.hypot(a.x, a.y, a.z || 0);
  var unit = (a) => {
    const d = len(a);
    return d > 1e-8 ? { x: a.x / d, y: a.y / d, z: a.z / d } : { x: 0, y: 0, z: 1 };
  };
  var dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  var uv = (p, u, v) => ({ x: p[0].x * (1 - u) * (1 - v) + p[1].x * u * (1 - v) + p[2].x * u * v + p[3].x * (1 - u) * v, y: p[0].y * (1 - u) * (1 - v) + p[1].y * u * (1 - v) + p[2].y * u * v + p[3].y * (1 - u) * v });
  function quad(ctx2, p) {
    ctx2.beginPath();
    ctx2.moveTo(p[0].x, p[0].y);
    for (let i = 1; i < 4; i++) ctx2.lineTo(p[i].x, p[i].y);
    ctx2.closePath();
  }
  function fiber(ctx2, p, across, t, color, width, begin = 0, end = 1) {
    ctx2.beginPath();
    for (let j = 0; j <= 4; j++) {
      const s = begin + (end - begin) * j / 4, wave = Math.sin(s * Math.PI * 4 + t * 11) * Math.sin(s * Math.PI) * 0.012, q = across ? uv(p, s, t + wave) : uv(p, t + wave, s);
      if (!j) ctx2.moveTo(q.x, q.y);
      else ctx2.lineTo(q.x, q.y);
    }
    ctx2.strokeStyle = color;
    ctx2.lineWidth = width;
    ctx2.stroke();
  }
  function drawClothPanel(ctx2, ps, ns, mesh2 = false) {
    if (!ctx2 || (ps == null ? void 0 : ps.length) !== 4 || (ns == null ? void 0 : ns.length) !== 4 || !ps.every(finite) || !ns.every((p) => {
      var _a;
      return finite(p) && Number.isFinite((_a = p.z) != null ? _a : 0);
    })) return false;
    const area = Math.abs(ps.reduce((s, p, i) => s + p.x * ps[(i + 1) % 4].y - p.y * ps[(i + 1) % 4].x, 0)) * 0.5;
    if (area < 0.035) return false;
    const n1 = unit(cross(sub(ns[1], ns[0]), sub(ns[2], ns[0]))), n2 = unit(cross(sub(ns[2], ns[0]), sub(ns[3], ns[0]))), normal = unit({ x: n1.x + n2.x, y: n1.y + n2.y, z: n1.z + n2.z });
    const fold = clamp((1 - dot(n1, n2)) * 0.5, 0, 1), light = clamp(0.3 + 0.7 * Math.abs(dot(normal, { x: -0.348, y: -0.696, z: 0.628 })), 0, 1);
    const shade = clamp(light - fold * 0.34, 0, 1), r = Math.round(128 + 65 * shade), g = Math.round(96 + 63 * shade), b = Math.round(58 + 48 * shade);
    ctx2.save();
    quad(ctx2, ps);
    ctx2.fillStyle = "rgb(".concat(r, ",").concat(g, ",").concat(b, ")");
    ctx2.fill();
    ctx2.clip();
    ctx2.lineCap = "butt";
    ctx2.lineJoin = "round";
    for (const t of [0.17, 0.5, 0.83]) {
      fiber(ctx2, ps, false, t, "rgba(75,52,28,.32)", 1.15);
      fiber(ctx2, ps, false, t - 0.016, "rgba(231,207,161,.38)", 0.58);
      fiber(ctx2, ps, true, t, "rgba(94,66,35,.32)", 0.95);
      fiber(ctx2, ps, true, t - 0.017, "rgba(216,183,125,.4)", 0.55);
    }
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      const u = 0.17 + col * 0.33, v = 0.17 + row * 0.33;
      if ((row + col) % 2) fiber(ctx2, ps, true, v, "rgba(224,195,144,.48)", 0.72, u - 0.065, u + 0.065);
      else fiber(ctx2, ps, false, u, "rgba(234,211,168,.46)", 0.72, v - 0.065, v + 0.065);
    }
    if (fold > 0.09) {
      const a = uv(ps, 0.06, 0.06), b2 = uv(ps, 0.94, 0.94);
      ctx2.beginPath();
      ctx2.moveTo(a.x, a.y);
      ctx2.lineTo(b2.x, b2.y);
      ctx2.strokeStyle = "rgba(39,52,35,".concat(Math.min(0.48, fold * 0.7), ")");
      ctx2.lineWidth = 0.75 + fold * 1.5;
      ctx2.stroke();
      fiber(ctx2, ps, true, 0.52, "rgba(241,223,181,".concat(Math.min(0.35, fold * 0.45), ")"), 0.65, 0.1, 0.86);
    }
    ctx2.restore();
    if (mesh2) {
      ctx2.save();
      quad(ctx2, ps);
      ctx2.strokeStyle = "#173e3a";
      ctx2.lineWidth = 0.7;
      ctx2.stroke();
      ctx2.restore();
    }
    return true;
  }
  function drawClothEdge(ctx2, points, row = 11) {
    if (!(points == null ? void 0 : points.length)) return;
    ctx2.save();
    ctx2.lineJoin = "round";
    ctx2.lineCap = "round";
    ctx2.beginPath();
    points.forEach((p, i) => i ? ctx2.lineTo(p.x, p.y) : ctx2.moveTo(p.x, p.y));
    ctx2.strokeStyle = "#173e3a";
    ctx2.lineWidth = row === 11 ? 2.7 : 2;
    ctx2.stroke();
    ctx2.strokeStyle = "#d8b77a";
    ctx2.lineWidth = 0.9;
    ctx2.stroke();
    if (row === 11) for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      for (let j = 1; j < 4; j++) {
        const t = j / 4, x = a.x + dx * t, y = a.y + dy * t, n = (i + j) % 3 + 1;
        ctx2.beginPath();
        ctx2.moveTo(x, y);
        ctx2.lineTo(x - dy / d * n + dx / d * 0.6, y + dx / d * n + dy / d * 0.6);
        ctx2.strokeStyle = j % 2 ? "#9a6335" : "#d8b77a";
        ctx2.lineWidth = 0.55;
        ctx2.stroke();
      }
    }
    ctx2.restore();
  }

  // source/survival.js
  var BEST_KEY = "durian-assassin-v101-best";
  var MAX_HEALTH = 6;
  var MAX_FRUIT = 20;
  function compareResults(a, b) {
    return a.coins - b.coins || a.whole - b.whole;
  }
  var validResult = (r) => r && Number.isFinite(r.coins) && Number.isInteger(r.whole) && r.whole >= 0;
  var snapshot = (s) => Object.freeze({ coins: s.coins, whole: s.totals.whole, smashed: s.totals.smashed, settled: s.settled, hits: s.injuryRounds.size });
  var SurvivalSession = class {
    constructor({ storage, adapter = null } = {}) {
      if (storage === void 0) storage = { getItem: () => JSON.stringify(window.DurianPlatform.readBest()), setItem: (key, value) => window.DurianPlatform.saveBest(JSON.parse(value)) };
      this.storage = storage;
      this.adapter = adapter;
      this.best = null;
      try {
        const saved = JSON.parse((storage == null ? void 0 : storage.getItem(BEST_KEY)) || "null");
        if (validResult(saved)) this.best = Object.freeze(__spreadValues({}, saved));
      } catch (e) {
      }
      this.start();
    }
    start({ demo = false } = {}) {
      this.active = true;
      this.demo = !!demo;
      this.health = MAX_HEALTH;
      this.coins = 0;
      this.totals = { whole: 0, pulp: 0, smashed: 0 };
      this.issued = 0;
      this.settled = 0;
      this.dying = false;
      this.gameOver = false;
      this.ended = false;
      this.reason = null;
      this.injuryRounds = /* @__PURE__ */ new Set();
      this.resultRounds = /* @__PURE__ */ new Set();
      return this;
    }
    get canStartFruit() {
      return !this.gameOver && !this.dying && this.issued < MAX_FRUIT;
    }
    fruitStarted() {
      if (!this.canStartFruit) return false;
      this.issued++;
      return true;
    }
    get entries() {
      return this.best ? [this.best] : [];
    }
    get hearts() {
      return this.health / 2;
    }
    observe(sim2) {
      const change = { injured: false, settled: false, gameOver: this.gameOver };
      if (this.demo || sim2.isDemoRound || this.ended) return change;
      const round = sim2.round;
      if ((sim2.injury || sim2.injured) && !this.injuryRounds.has(round)) {
        this.injuryRounds.add(round);
        this.health = Math.max(0, this.health - 1);
        this.dying = this.health === 0;
        change.injured = true;
      }
      if (["whole", "pulp", "smashed"].includes(sim2.outcome) && !this.resultRounds.has(round)) {
        this.resultRounds.add(round);
        this.settled++;
        const whole = sim2.outcome === "whole";
        this.totals[whole ? "whole" : "smashed"]++;
        this.coins += whole ? 20 : -10;
        change.settled = true;
      }
      if (this.dying && !!sim2.outcome || this.settled >= MAX_FRUIT) {
        this.reason = this.dying ? "health" : "harvest";
        this.gameOver = true;
        change.gameOver = true;
        this.end();
      }
      return change;
    }
    saveBest() {
      var _a;
      if (this.demo || !this.gameOver) return false;
      const r = snapshot(this);
      if (this.best && compareResults(r, this.best) <= 0) return false;
      this.best = r;
      try {
        (_a = this.storage) == null ? void 0 : _a.setItem(BEST_KEY, JSON.stringify(r));
      } catch (e) {
      }
      return true;
    }
    end() {
      var _a, _b;
      if (this.ended) return false;
      this.ended = true;
      this.active = false;
      this.saveBest();
      try {
        (_b = (_a = this.adapter) == null ? void 0 : _a.onResult) == null ? void 0 : _b.call(_a, snapshot(this));
      } catch (e) {
      }
      return true;
    }
  };

  // source/harvest-loop.js
  var HarvestLoop = class {
    constructor({ interval = 6 } = {}) {
      this.interval = interval;
      this.enabled = false;
      this.remaining = interval;
      this.round = null;
      this.paused = false;
    }
    begin(sim2) {
      var _a;
      this.enabled = true;
      this.paused = false;
      this.remaining = this.interval;
      this.round = (_a = sim2 == null ? void 0 : sim2.round) != null ? _a : null;
    }
    fruitStarted(sim2) {
      var _a;
      this.round = (_a = sim2 == null ? void 0 : sim2.round) != null ? _a : null;
      this.remaining = this.interval;
    }
    stop() {
      this.enabled = false;
      this.remaining = this.interval;
      this.round = null;
    }
    advance(sim2, dt, next) {
      if (!this.enabled || this.paused) return;
      if (this.round !== sim2.round) this.fruitStarted(sim2);
      const elapsed = Number.isFinite(dt) ? Math.max(0, Math.min(0.1, dt)) : 0;
      this.remaining = Math.max(0, this.remaining - elapsed);
      if (this.remaining > 1e-9 || !sim2.outcome) return;
      this.remaining = this.interval;
      next(!!sim2.isDemoRound);
      this.round = sim2.round;
    }
  };

  // source/character-art.js
  var ink = "#173e3a";
  var paper = "#f1dfb5";
  function stroke(ctx2, pts, width, color = ink) {
    ctx2.beginPath();
    pts.forEach((p, i) => i ? ctx2.lineTo(p.x, p.y) : ctx2.moveTo(p.x, p.y));
    ctx2.strokeStyle = color;
    ctx2.lineWidth = width;
    ctx2.lineCap = "round";
    ctx2.lineJoin = "round";
    ctx2.stroke();
  }
  function cut(ctx2, a, b, width = 1) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, n = { x: -dy / d, y: dx / d };
    stroke(ctx2, [{ x: a.x + dx * 0.17 + n.x, y: a.y + dy * 0.17 + n.y }, { x: a.x + dx * 0.8 + n.x, y: a.y + dy * 0.8 + n.y }], width, "#d8a033");
  }
  function joint(ctx2, p, r = 3) {
    ctx2.beginPath();
    ctx2.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx2.fillStyle = paper;
    ctx2.fill();
    ctx2.strokeStyle = ink;
    ctx2.lineWidth = 1.5;
    ctx2.stroke();
  }
  function drawCharacter(ctx2, p) {
    ctx2.save();
    for (let i = 0; i < 2; i++) {
      const k = p.knees[i], f = p.feet[i];
      stroke(ctx2, [p.hip, k, f], i ? 8 : 6, i ? ink : "#527566");
      stroke(ctx2, [{ x: f.x - 6, y: f.y }, { x: f.x + 14, y: f.y }], i ? 7 : 5, i ? ink : "#527566");
    }
    stroke(ctx2, [p.hip, p.shoulder], 10);
    stroke(ctx2, [p.shoulder, { x: p.head.x, y: p.head.y + 12 }], 6);
    for (let i = 0; i < p.arms.length; i++) {
      const a = p.arms[i];
      stroke(ctx2, [a.shoulder, a.elbow, a.hand], i ? 7 : 5, i ? ink : "#527566");
      joint(ctx2, a.elbow, 2.8);
      joint(ctx2, a.hand, 2.6);
    }
    for (let i = 0; i < 2; i++) {
      cut(ctx2, p.hip, p.knees[i], 0.85);
      cut(ctx2, p.knees[i], p.feet[i], 0.85);
    }
    cut(ctx2, p.hip, p.shoulder, 1.1);
    for (const a of p.arms) {
      cut(ctx2, a.shoulder, a.elbow, 0.8);
      cut(ctx2, a.elbow, a.hand, 0.8);
    }
    joint(ctx2, p.shoulder, 3.4);
    joint(ctx2, p.hip, 3.4);
    for (const k of p.knees) joint(ctx2, k, 3);
    ctx2.beginPath();
    ctx2.arc(p.head.x, p.head.y, 15, 0, Math.PI * 2);
    ctx2.fillStyle = paper;
    ctx2.fill();
    ctx2.strokeStyle = ink;
    ctx2.lineWidth = 3.5;
    ctx2.stroke();
    ctx2.beginPath();
    ctx2.arc(p.head.x - 1, p.head.y - 1, 11, Math.PI * 0.8, Math.PI * 1.62);
    ctx2.strokeStyle = "#9a6335";
    ctx2.lineWidth = 0.8;
    ctx2.stroke();
    const hurt = p.hurtCompression || 0, joy = p.catchJoy || 0, effort = p.catchCompression || 0;
    if (hurt > 0.08) {
      stroke(ctx2, [{ x: p.head.x + 2, y: p.head.y - 6 }, { x: p.head.x + 7, y: p.head.y - 2 }, { x: p.head.x + 3, y: p.head.y + 1 }], 1.8);
      stroke(ctx2, [{ x: p.head.x + 1, y: p.head.y - 10 }, { x: p.head.x + 10, y: p.head.y - 7 }], 1.7);
      ctx2.beginPath();
      ctx2.ellipse(p.head.x + 9, p.head.y + 6, 3.3, 4.6, 0, 0, Math.PI * 2);
      ctx2.fillStyle = ink;
      ctx2.fill();
      stroke(ctx2, [{ x: p.head.x - 7, y: p.head.y + 4 }, { x: p.head.x - 3, y: p.head.y + 6 }], 1.4, "#cb472a");
    } else if (joy > 0.15) {
      ctx2.beginPath();
      ctx2.arc(p.head.x + 6, p.head.y - 2, 3.3, Math.PI, Math.PI * 2);
      ctx2.strokeStyle = ink;
      ctx2.lineWidth = 1.8;
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.arc(p.head.x + 7, p.head.y + 4, 5.3, 0, Math.PI);
      ctx2.stroke();
      stroke(ctx2, [{ x: p.head.x - 4, y: p.head.y + 4 }, { x: p.head.x - 1, y: p.head.y + 5 }], 1.4, "#cb472a");
    } else {
      ctx2.beginPath();
      ctx2.arc(p.head.x + 6, p.head.y - 2, 1.7, 0, Math.PI * 2);
      ctx2.fillStyle = ink;
      ctx2.fill();
      if (effort > 0.18) {
        ctx2.beginPath();
        ctx2.ellipse(p.head.x + 10, p.head.y + 5, 1.8 + effort, 2 + effort * 2, 0, 0, Math.PI * 2);
        ctx2.fill();
        stroke(ctx2, [{ x: p.head.x + 3, y: p.head.y - 7 }, { x: p.head.x + 10, y: p.head.y - 5 }], 1.5);
      } else stroke(ctx2, [{ x: p.head.x + 10, y: p.head.y + 4 }, { x: p.head.x + 14, y: p.head.y + 3 }], 1.5);
    }
    ctx2.restore();
  }

  // source/random.js
  var LANDING = { min: 338, max: 478, center: 408 };
  function nextRandom(state) {
    state = Math.imul(state, 1664525) + 1013904223 >>> 0;
    return { state, value: state / 4294967296 };
  }
  function freshSeed() {
    var _a;
    const a = new Uint32Array(1);
    if ((_a = window.crypto) == null ? void 0 : _a.getRandomValues) {
      crypto.getRandomValues(a);
      return a[0];
    }
    return (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
  }

  // source/cloth-audio.js
  var ClothAudio = class {
    constructor({ AudioContext = window.AudioContext || window.webkitAudioContext } = {}) {
      this.muted = false;
      this.context = null;
      this._AudioContext = AudioContext;
      this._seen = /* @__PURE__ */ new Set();
      this._voices = /* @__PURE__ */ new Set();
      this._paused = true;
      this._unlocked = false;
      this._resumePromise = null;
      this._disposed = false;
      this._hurtBuffer = null;
      this._hurtLoad = null;
      this.hurtStatus = "loading";
      this._hurtBytes = Promise.resolve().then(() => {
        const raw = atob("UklGRiR4AABXQVZFZm10IBAAAAABAAEAgLsAAAB3AQACABAATElTVBoAAABJTkZPSVNGVA0AAABMYXZmNjEuNy4xMDMAAGRhdGHedwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////wAAAAAAAAAAAAABAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////wAAAAAAAAAAAAAAAAAAAAAAAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEAAAAAAAAAAQABAAEAAQABAAEAAQABAAAAAAAAAAAA/////wAAAAAAAAEAAQAAAAAAAAAAAAAAAAAAAAAAAQABAAEAAQAAAAAAAAAAAAAAAQABAAEAAQAAAAAAAAAAAAAA/////wAAAAAAAAAAAAAAAAAAAAAAAAEAAQABAAEAAQABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////8AAAAAAAABAAEAAQABAAEAAAAAAAAAAAAAAAEAAQAAAP//AAD///7/////////AAAAAAAAAAAAAAAA//8AAAAAAAAAAAAAAAAAAAAAAAD/////AAAAAP////////////8AAAAAAAAAAAEAAAD//wAAAAD//wAAAQAAAAAAAAD//////v///////////wEAAAD//wAA///+//7//v////7///8AAP////////7//v/+///////+///////+//7//////////////////v/+//7//v/9//7//v/+//3//v/+//7//v///////////////v/+//////////7//v/+/////////////v/+//7//f/9/////v/+//7////+//7///////7///////////8AAP///v/+/////v/+//7//v/+//////////////8AAAAA//8AAAAAAAAAAAEAAQAAAAEAAQAAAAEAAQAAAAAAAQABAAEAAgADAAIAAgACAAIAAQACAAMAAwADAAUABAADAAQABAADAAQABgAHAAgACgALAAoACQAKAAkACAAJAAoACgAKAAsACwAMAA4ADgANAA0ADgAQABIAEgARABAADgANAA8ADwAMAAkACAAIAAkACQAIAAYABQAFAAcACQAJAAgABwAGAAcABwAHAAgABgADAAMAAgD//////P/2//X/9f/y//H/7//s/+n/5//l/+T/4f/i/+P/4//k/+T/4//j/+L/4f/e/9//4f/f/9n/1//Y/9v/2//a/97/5f/n/+3/9f/7/wMACgAPABcAHwAjACUAIwAiACUAIwAdABgAEgALAAcAAgD8//r/9//x//D/9P/1//X/+f/+/wMACQANAA8AFAAWABYAFgAWABIADwAMAAcAAQD7//T/8f/v/+n/5f/l/+X/5f/n/+j/6P/r/+//8//4//7//f/8/wQACQAMABEAEQASABgAGgAcAB0AHQAhAB8AFgAZAB0AFwASAA4ADQASABEADAANABAAEwAVABcAHQAgACIAJwAlACQAKQAmAB8AHQAcABQACgADAPj/6v/m/+L/0P/I/8L/s/+z/7X/qf+m/6X/oP+q/6v/nv+c/5z/lf+W/5f/kf+I/4T/h/+L/4z/jP+O/5v/q/+z/8H/0f/c/+//BAAVACgAMwA+AFYAjgDsAB8B6ACUAI0A/wB/AQ8BzP9p/4MAbQGsAA3/cf45/wIA0v8s/wL/cv/M/9P/KQC1AGsAnv8RAMcBigJlAf//FQBEAbcBhQD2/tH+6f9oAHP/N/7m/Tf+nP7+/if/+v7i/lT/OgDlAMMANAAaANQA1wEZAmcB0gAdAc0BDQKeAfwA1gBXAeoB1QErAbAAwAAGAR0B8ACvAJIApgC0AJcAiwCSAEIA5f9SACYBMwF9AO//9v96AM0ADwAe/5T/UABw/0/+f/7B/hP+Pf37/HL97/1q/Wr8Yfw7/Y/9Bv3g/Mv9wP7G/mf+0P7U//T/S/+J/3YA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4f/f/9v/2//i/+3/+f8JABIAEwATABcAHQAfAB0AHAAXAAsA/v/x/+P/1f/P/9L/1f/X/93/4//r//j/BQAPABoAKAA1ADoANQAqACAAGgAOAPz/7f/l/+D/3v/f/+T/6//0////DQAaACQALwA5AD8AQgBFAD8ALwAfABUADQAEAPn/8v/z//f/+P/2//n/AgANABoAJwAyADoAPgA/AD4ANQAoABwAEgAMAAgAAwD8//f/+v8BAAYADQAbAC8ARABQAFQAVABSAE4ASAA+ADUALQAkABUAAwDz/+b/2P/L/8T/xf/L/9L/2P/j//P/AwAQABoAJAAxADoAPAA4ADIAKQAeAA8AAgD4//L/8P/u/+v/6f/p/+r/7v/3/wYAEwAfAC0APABGAEsATgBPAE8AUABQAEwAQgA8ADoANwAuACkALQA0ADoAPgBDAEsAUgBVAFQAUQBNAEUAPAAzACcAFgAHAP7/+P/z/+3/6f/p/+3/8//4//3/AgAIAA8AEwARAA8ADwARABAACwAEAP//+f/1//P/9P/2//n/AAAIAA4AFAAaAB4AIgAmACcAJAAeABkAEwAMAAUAAAD9//z//P/7//v//P///wMACQAPABUAHQAlAC4ANgA6ADoAOAA1AC4AJAAYAA0AAgD6//L/6f/h/93/3f/h/+r/9v8CAA8AHAAqADQAOwBBAEgATgBQAEwAQwA4ACwAHwARAAYA/v/3//D/6//n/+D/2v/b/9//5P/r//P//P8DAAcACQAJAAYABAACAAMAAgD7//P/7f/q/+f/3//a/9z/4P/h/+D/3//f/+D/4f/j/+f/7v/1//r///8CAAIAAwAEAAUABwAHAAUABAABAPz/9v/y/+//8P/z//j///8FAAkADwAVABkAGwAfACQAJQAjAB8AFwAMAAIA+P/v/+b/3P/U/87/yP/E/8H/wf/F/8v/1f/d/+L/5v/n/+j/6v/q/+n/7P/v//H/8v/y//H/8P/y//n//v8CAAUABgAHAAUAAQD//////P/4//T/8P/q/+T/4P/e/97/4f/l/+j/6//w//f//f8CAAUABgAGAAIA+f/u/+P/2//U/83/yP/E/7//vP+8/8D/xP/M/9n/5v/x//n/AAAIABEAHQAnACwAKwAoACIAFgAFAPP/5//i/9//2f/S/8z/zf/Q/9T/2P/i//L/AAAIAAoADAALAAUA///+////+//1//L/7P/g/9L/yP/E/8T/xv/K/9D/1v/b/+H/5//t//L/+/8HABAAEAALAAYAAQD6//b/9P/0//j///8EAAIA///8//r/+P/4//n/9//3//r/+//5//X/9f/6////BQAKAA4AEQAUABYAFgATABAAEgAXABkAFAALAAUAAAD3/+7/6f/o/+j/6P/q/+z/7v/y//j/AAAIABAAFgAbAB4AHwAeABoAFgATAA4ACAADAP3/+P/1//H/7//v//H/9v/6//7/AQAEAAgACgALAAsADAAMAAsACAAHAAYAAwAAAP7/+//6//f/8v/t/+f/4v/e/9r/1//W/9f/2f/d/+D/4//n/+3/9P/5////BgALAA8AFAAWABYAGAAZABgAFAAPAAkAAgD8//f/9P/y//T/+P/9/wEABQAJAA8AFQAaAB0AHgAgACAAHAAWAA8ACQAEAP//+//5//j/9v/z//L/8//1//b/+v///wMABwAJAAoACgAKAAkACQAJAAkABwAEAAEA/v/8//r/+//+/wMABwAKAAsACwAMAAwADAAMAA8AEwAUABQAEwASAA8ACwAKAAkACQAJAAsADAANAA0ADgAPABAAEQAUABYAFQATABEAEAAMAAYAAwABAP///f/9//v/+v/6//r/+v/4//n//P///wIAAwADAAMAAgACAAIAAAD//wAA///9//n/9v/0//P/8v/y//T/9//7//7/AgAGAAgACwAOABAAEwAUABMAEwATABIAEQAOAA0ADQAMAAwACgAJAAkACQAIAAkACwAMAAwADAANAA0ADQANAA0ADQANAAsACQAJAAkACgAMAA4AEQAUABQAEwATABQAFAATABEADQAIAAMA/P/z/+z/5//j/+L/4P/f/9//4f/k/+n/7v/1////CwAXACAAJQAnACoAKwApACMAHwAbABgAEwAMAAUA/v/5//X/8//z//T/9//6//3//v/+//3//f/9////AQABAAEAAQD///v/9v/z//L/8f/z//b/+P/6//v//f/+/wAAAgAFAAkACwAMAAsACQAFAAEA/v/9//3//f/+//7//f/6//b/9f/2//n//f8BAAUACQAKAAoACAAGAAUABQAFAAUAAwAAAPz/9//z/+//7P/t/+//8f/z//T/9v/3//f/+P/8/wEABQAIAAsADAANAAwACgAIAAgABwAHAAcACAAIAAYAAwABAAEAAAD///////8AAP7/+//4//X/9P/0//P/8//0//X/9//4//j/+v/9/wAAAQADAAUABQAFAAQAAQD9//v/+f/4//f/9f/0//P/8//x/+//7//w//P/9v/6////BQAKAA0AEAASABMAEwASABIAEAANAAkABAD+//n/9f/w/+z/6P/n/+b/5v/m/+f/6f/s/+//8v/2//r//v8BAAQABwAHAAQAAQD///3/+v/2//P/8f/u/+v/6P/l/+X/6P/r/+//9P/6//7/AgAGAAkADQAQABIAFQAWABUAEwAPAAoABQABAP3/+f/2//T/8//x/+//7v/u//D/8v/z//X/+P/5//v//P/9//7////+//7//v////7//v/+//////8AAP////8AAAAAAQACAAIAAwACAAEAAAD///7//////wAAAQACAAQABAADAAMAAwADAAQABAAEAAQABAACAAEAAAD///7//v/9//7/AAABAAIAAgACAAIAAgABAAEAAQAAAAEAAAAAAAAA/v/8//v/+v/7//v//P/+//////////3//P/8//z//P/9//3//f/8//v/+f/5//n/+v/8//3///8BAAMAAwADAAUABgAHAAkACgAMAA0ADgANAAwACwAJAAgABgAGAAQABAADAAIAAQABAAEAAgACAAMABAAFAAUABQAFAAcABgAHAAkACwANAA4ADgANAA0ACgAIAAUABAADAAIAAQD///7//f/7//r/+f/6//v//P/9//7/AAADAAQABQAGAAcABwAIAAcABwAGAAUABAADAAEA///+//3//f/9//3//v///wAAAQABAAEAAwAFAAcACQALAA4ADwAQABAADwAPABAAEQASABMAEgAQAA4ACgAGAAIA///9//z/+//6//r/+v/5//j/+P/5//r//P/+/wEAAwAEAAQABQAGAAYABgAGAAQAAwABAP///f/8//z/+//8//3///8AAAAAAQACAAMAAwADAAMAAwADAAIAAAD///7//P/6//j/+P/3//f/9//3//j/+f/6//v//P/8//3//v/+//7//f/8//v/+f/4//j/+P/4//n/+//9//3//v/+//7//v/+//3//f/+//7//v/9//3//v/+////AAADAAYACAAJAAoACgAKAAoACgAJAAgABwAGAAQAAgD///v/+P/2//X/9P/0//X/9v/2//f/9//4//j/+f/6//v/+//7//r/+f/4//j/9//5//r/+//9//3//f/9//3//v///wAAAQACAAMABAADAAIAAAD//////////wAAAAABAAIAAgABAAEAAQABAAEAAAAAAP///v/9//3//P/8//3//v8AAAEAAwAEAAUABQAGAAYABgAGAAYABQAEAAMAAgAAAP///v/+//7//////wAAAgADAAQABgAIAAkACgALAAsACwAJAAgABgAEAAIAAQAAAP///f/8//v/+//6//r/+v/6//r/+//7//v/+//8//3//f/9//3//f/8//z/+//7//v/+//7//v/+v/6//r/+v/6//r/+v/7//v/+//8//z//f/9//7//v///wAAAQABAAIAAgACAAIAAgACAAMAAwAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAMAAwACAAEAAAD///7//f/8//z/+//7//v/+//8//3//f/9//7///8AAAAAAQABAAIAAwADAAMAAwADAAMAAwACAAIAAQABAAIAAgACAAIAAgACAAMAAwAEAAQABQAFAAUABAADAAMAAgABAAAA/v/9//z/+//6//n/+f/4//j/9//3//f/9//4//j/+f/6//z//f/+////AQACAAMAAwAEAAQABAAEAAQABAAFAAQABAAEAAMAAwADAAMAAgACAAIAAgABAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAEAAQABAAEAAQABAAEAAAAAAAAA//////7//v/9//z/+//7//v/+//7//z//f/9//7///8AAAEAAgACAAIAAgACAAIAAgABAAEAAAD//////v/+//7//v/+//7//v///wAAAAABAAIAAgADAAIAAgACAAEAAQABAAAA/////////v/+//7//v////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEAAQABAAEAAQABAAEAAQAAAAAAAAAAAP///////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAA///////////////////////////////////+//////////7//v/+//7//v//////////////////////////////AAAAAAAAAAAAAAAAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQACAAIAAgACAAIAAgACAAIAAgACAAEAAQABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//////////////////////////////////8AAAAAAAAAAAAAAAAAAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAD//////////wAAAAAAAAAAAAAAAAAAAAABAAEAAQACAAIAAgACAAIAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQABAAEAAQABAAEAAQABAAEAAAAAAAAAAAAAAAAA/////////////////////////////////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAD///////////////////////////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
        const b = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) b[i] = raw.charCodeAt(i);
        return b.buffer;
      });
    }
    get available() {
      return !this._disposed && typeof this._AudioContext === "function";
    }
    get ready() {
      var _a;
      return !this.muted && !this._paused && this._unlocked && ((_a = this.context) == null ? void 0 : _a.state) === "running";
    }
    async unlock() {
      var _a;
      if (this.muted || !this.available) return false;
      this._paused = false;
      try {
        (_a = this.context) != null ? _a : this.context = new this._AudioContext();
      } catch (e) {
        this._paused = true;
        return false;
      }
      if (this.context.state === "closed") return false;
      void this.preloadHurt();
      if (this._resumePromise) return this._resumePromise;
      const context = this.context;
      this._resumePromise = (async () => {
        try {
          if (context.state !== "running") await context.resume();
          if (this._paused || this.muted || this._disposed) {
            this._unlocked = false;
            try {
              await context.suspend();
            } catch (e) {
            }
            return false;
          }
          this._unlocked = context.state === "running";
          return this._unlocked;
        } catch (e) {
          this._unlocked = false;
          return false;
        }
      })();
      try {
        return await this._resumePromise;
      } finally {
        this._resumePromise = null;
      }
    }
    setMuted(flag) {
      this.muted = !!flag;
      if (this.muted) void this.pause();
      return this.muted;
    }
    reset() {
      for (const voice of [...this._voices]) voice.stop();
    }
    async pause() {
      this._paused = true;
      this._unlocked = false;
      this.reset();
      try {
        if (this.context && this.context.state !== "closed") await this.context.suspend();
      } catch (e) {
      }
    }
    async dispose() {
      var _a;
      this._disposed = true;
      this._paused = true;
      this._unlocked = false;
      this.reset();
      try {
        await ((_a = this.context) == null ? void 0 : _a.close());
      } catch (e) {
      }
    }
    async preloadHurt() {
      if (this._hurtLoad) return this._hurtLoad;
      if (!this.context || this._disposed) return false;
      const context = this.context;
      this._hurtLoad = (async () => {
        try {
          const bytes = await this._hurtBytes;
          if (!bytes || this._disposed) return false;
          const buffer = await context.decodeAudioData(bytes.slice(0));
          if (this._disposed) return false;
          this._hurtBuffer = buffer;
          this.hurtStatus = "ready";
          return true;
        } catch (e) {
          this.hurtStatus = "unavailable";
          return false;
        }
      })();
      return this._hurtLoad;
    }
    coin(id, amount) {
      return this._cue("coin", id, { amount });
    }
    // Event IDs are consumed before checking readiness: no delayed surprise sounds.
    hurt(roundId) {
      return this._cue("hurt", roundId);
    }
    effort(roundId) {
      return this._cue("effort", roundId);
    }
    impact(roundId, tier = "normal", speed = 0) {
      return this._cue("impact", roundId, { tier, speed });
    }
    _cue(kind, roundId, options = {}) {
      if (typeof roundId !== "string" && typeof roundId !== "number" || roundId === "" || typeof roundId === "number" && !Number.isFinite(roundId)) return false;
      const key = kind + ":" + roundId;
      if (this._seen.has(key)) return false;
      this._seen.add(key);
      if (!this.ready) return false;
      if (kind === "hurt" && !this._hurtBuffer) return false;
      if (kind === "coin" && (!Number.isFinite(options.amount) || !options.amount)) return false;
      const c = this.context, nodes = [];
      let source, done = false;
      const voice = { stop: () => {
        if (done) return;
        done = true;
        try {
          source == null ? void 0 : source.stop();
        } catch (e) {
        }
        for (const n of nodes) try {
          n.disconnect();
        } catch (e) {
        }
        this._voices.delete(voice);
      } };
      this._voices.add(voice);
      try {
        let buffer = this._hurtBuffer;
        if (kind !== "hurt") {
          const data = renderHarvestCue(kind, c.sampleRate, options);
          buffer = c.createBuffer(1, data.length, c.sampleRate);
          buffer.getChannelData(0).set(data);
        }
        source = c.createBufferSource();
        nodes.push(source);
        source.buffer = buffer;
        source.connect(c.destination);
        source.onended = () => voice.stop();
        source.start(c.currentTime);
        source.stop(c.currentTime + (buffer.duration || buffer.length / c.sampleRate || 1));
        return true;
      } catch (e) {
        voice.stop();
        return false;
      }
    }
    snap(roundId) {
      if (typeof roundId !== "string" && typeof roundId !== "number" || roundId === "" || typeof roundId === "number" && !Number.isFinite(roundId)) return false;
      if (this._seen.has(roundId)) return false;
      this._seen.add(roundId);
      if (!this.ready) return false;
      const c = this.context, nodes = [], sources = [];
      let ended = false;
      const clean = () => {
        if (ended) return;
        ended = true;
        for (const n of nodes) try {
          n.disconnect();
        } catch (e) {
        }
        this._voices.delete(voice);
      };
      const voice = { stop: () => {
        for (const source of sources) try {
          source.stop();
        } catch (e) {
        }
        clean();
      } };
      this._voices.add(voice);
      const node = (n) => (nodes.push(n), n);
      try {
        const t = c.currentTime, duration = 0.09;
        const master = node(c.createGain());
        master.gain.setValueAtTime(1e-4, t);
        master.gain.linearRampToValueAtTime(0.1, t + 2e-3);
        master.gain.exponentialRampToValueAtTime(1e-4, t + duration);
        master.connect(c.destination);
        const noise = node(c.createBufferSource());
        sources.push(noise);
        const buffer = c.createBuffer(1, Math.max(1, Math.ceil(c.sampleRate * duration)), c.sampleRate), data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (0.8 - 0.45 * i / data.length);
        noise.buffer = buffer;
        const high = node(c.createBiquadFilter());
        high.type = "highpass";
        high.frequency.setValueAtTime(650, t);
        high.Q.setValueAtTime(0.6, t);
        const band = node(c.createBiquadFilter());
        band.type = "bandpass";
        band.frequency.setValueAtTime(1900, t);
        band.Q.setValueAtTime(0.65, t);
        const noiseLevel = node(c.createGain());
        noiseLevel.gain.setValueAtTime(0.7, t);
        noise.connect(high);
        high.connect(band);
        band.connect(noiseLevel);
        noiseLevel.connect(master);
        const low = node(c.createOscillator());
        sources.push(low);
        low.type = "sine";
        low.frequency.setValueAtTime(155, t);
        low.frequency.exponentialRampToValueAtTime(75, t + 0.035);
        const lowLevel = node(c.createGain());
        lowLevel.gain.setValueAtTime(0.18, t);
        lowLevel.gain.exponentialRampToValueAtTime(1e-4, t + 0.045);
        low.connect(lowLevel);
        lowLevel.connect(master);
        low.onended = clean;
        noise.start(t);
        low.start(t);
        noise.stop(t + duration);
        low.stop(t + duration + 5e-3);
        return true;
      } catch (e) {
        voice.stop();
        return false;
      }
    }
  };
  function renderHarvestCue(kind, sampleRate = 48e3, { tier = "normal", speed = 0, amount = 1 } = {}) {
    const rate = Number.isFinite(sampleRate) && sampleRate >= 8e3 ? Math.min(192e3, sampleRate) : 48e3;
    const severe = tier === "shattered" || tier === "severe" || tier === "heavy" || tier === 3;
    const duration = kind === "coin" ? amount > 0 ? 0.64 : 0.34 : kind === "effort" ? 0.22 : kind === "hurt" ? 0.43 : severe ? 0.52 : tier === "intact" ? 0.24 : 0.38;
    const data = new Float32Array(Math.ceil(rate * duration));
    let seed = kind === "effort" ? 313 : 997, phase = 0, air = 0;
    const random = () => {
      seed = Math.imul(seed, 1664525) + 1013904223 >>> 0;
      return seed / 2147483648 - 1;
    };
    const intensity = Math.max(0, Math.min(1, Number.isFinite(speed) ? Math.abs(speed) / 1200 : 0));
    for (let i = 0; i < data.length; i++) {
      const t = i / rate, u = t / duration, n = random();
      let value = 0;
      if (kind === "coin") {
        const strikes = amount > 0 ? [[0, 2050, 1], [0.085, 2650, 0.82], [0.175, 3220, 0.65]] : [[0, 1450, 0.92], [0.075, 860, 0.66], [0.14, 510, 0.42]];
        for (const [at, f, level] of strikes) {
          const dt = t - at;
          if (dt >= 0) {
            const attack = Math.min(1, dt / 1e-3);
            value += level * attack * (0.14 * Math.sin(2 * Math.PI * f * dt) * Math.exp(-dt * 17) + 0.065 * Math.sin(2 * Math.PI * f * 1.47 * dt) * Math.exp(-dt * 29) + 0.035 * Math.sin(2 * Math.PI * f * 2.09 * dt) * Math.exp(-dt * 41) + 0.026 * n * Math.exp(-dt * 170));
          }
        }
      } else if (kind === "effort") {
        const f = 112 + 28 * Math.sin(Math.PI * u);
        phase += 2 * Math.PI * f / rate;
        let vowel = 0;
        for (let h = 1; h <= 16; h++) {
          const hz = h * f, formant = Math.exp(-(((hz - 430) / 220) ** 2)) + 0.45 * Math.exp(-(((hz - 1120) / 310) ** 2));
          vowel += Math.sin(h * phase) * (0.09 / h + 0.21 * formant / h ** 0.65);
        }
        air = 0.72 * air + 0.28 * n;
        const attack = Math.min(1, t / 9e-3);
        const envelope = attack * Math.pow(Math.max(0, 1 - u), 1.8);
        value = envelope * (vowel * 0.62 + air * 0.27);
      } else if (kind === "impact") {
        const base = severe ? 78 : 100;
        const thud = Math.sin(2 * Math.PI * (base * t - 38 * t * t)) * Math.exp(-t * (severe ? 14 : 19)) * 0.2;
        let crack = 0;
        for (const [at, strength] of [[2e-3, 1], [0.023, 0.7], [0.051, 0.42], [0.089, 0.21]]) {
          const dt = t - at;
          if (dt >= 0) crack += n * Math.exp(-dt * 155) * strength * 0.16;
        }
        const debris2 = n * Math.exp(-t * 15) * Math.min(1, t * 90) * 0.035;
        value = (thud + (tier === "intact" ? 0 : crack) + debris2) * (severe ? 1.14 : tier === "intact" ? 0.65 : 0.86) * (0.9 + 0.1 * intensity);
      }
      const fade = Math.min(1, t / 2e-3, (duration - t) / 0.012);
      data[i] = 0.32 * Math.tanh(value / 0.32) * Math.max(0, fade);
    }
    return data;
  }

  // source/canopy.js
  var CANOPY_TOP = -1850;
  var POSITIONS = [[394, -1330], [408, -1250], [422, -1170], [398, -1450], [412, -1380], [402, -1560], [418, -1510], [408, -1660], [380, -1280], [436, -1200], [388, -1440], [430, -1510], [378, -1600], [438, -1660], [352, -1320], [464, -1220], [338, -1180], [478, -1300], [348, -1530], [470, -1580]];
  var CANOPY_SLOTS = Object.freeze(POSITIONS.map(([x, y], i) => Object.freeze({ id: "fruit-" + (i + 1), x, y, z: 0, r: 19 })));
  var Canopy = class {
    constructor() {
      this.reset();
    }
    reset() {
      this.slots = CANOPY_SLOTS.map((p) => __spreadProps(__spreadValues({}, p), { state: "hanging", generation: 0 }));
      this.renewals = [];
      this.selections = [];
    }
    eligible(radius = 70) {
      const remaining = this.slots.filter((p) => p.state === "hanging"), near = remaining.filter((p) => Math.abs(p.x - 408) <= radius + 1e-9);
      if (near.length) return near;
      if (!remaining.length) return [];
      const nearest = Math.min(...remaining.map((p) => Math.abs(p.x - 408)));
      return remaining.filter((p) => Math.abs(p.x - 408) <= nearest + 1e-9);
    }
    select(value, radius = 70) {
      const choices = this.eligible(radius);
      if (!choices.length) throw Error("All 20 fruit are harvested");
      const p = choices[Math.min(choices.length - 1, Math.floor(Math.max(0, value) * choices.length))];
      p.state = "released";
      this.selections.push({ id: p.id, generation: 0 });
      return p;
    }
    prepareNext() {
      return false;
    }
  };

  // source/difficulty.js
  var DIFFICULTY_THRESHOLDS = Object.freeze([0, 3, 7, 12, 18]);
  var DIFFICULTY_PROFILES = Object.freeze([
    { label: "\u8D77\u6B65\u7EC3\u4E60", landingRadius: 14, fruitGravity: 600, restSeconds: 3 },
    { label: "\u5C0F\u5E45\u6362\u4F4D", landingRadius: 35, fruitGravity: 600, restSeconds: 3 },
    { label: "\u5DE6\u53F3\u5224\u65AD", landingRadius: 70, fruitGravity: 600, restSeconds: 3 },
    { label: "\u843D\u679C\u52A0\u901F", landingRadius: 70, fruitGravity: 630, restSeconds: 3 },
    { label: "\u8FDE\u91C7\u6311\u6218", landingRadius: 70, fruitGravity: 630, restSeconds: 3 }
  ].map((profile, level) => Object.freeze(__spreadProps(__spreadValues({
    level
  }, profile), {
    timingAssistFloor: 1.72,
    timingBuffer: 0.4
  }))));
  var MAX_LEVEL = DIFFICULTY_PROFILES.length - 1;
  var RECOVERY_WHOLE = 3;
  var FALLBACK_MISSES = 3;
  var _level, _totalWhole, _consecutiveMisses, _nextPromotionWhole;
  var DifficultyController = class {
    constructor() {
      __privateAdd(this, _level, 0);
      __privateAdd(this, _totalWhole, 0);
      __privateAdd(this, _consecutiveMisses, 0);
      __privateAdd(this, _nextPromotionWhole, DIFFICULTY_THRESHOLDS[1]);
    }
    get profile() {
      return DIFFICULTY_PROFILES[__privateGet(this, _level)];
    }
    get status() {
      return Object.freeze({
        level: __privateGet(this, _level),
        totalWhole: __privateGet(this, _totalWhole),
        consecutiveMisses: __privateGet(this, _consecutiveMisses),
        nextPromotionWhole: __privateGet(this, _nextPromotionWhole),
        wholeToNextLevel: __privateGet(this, _nextPromotionWhole) === null ? 0 : Math.max(0, __privateGet(this, _nextPromotionWhole) - __privateGet(this, _totalWhole))
      });
    }
    reset() {
      __privateSet(this, _level, 0);
      __privateSet(this, _totalWhole, 0);
      __privateSet(this, _consecutiveMisses, 0);
      __privateSet(this, _nextPromotionWhole, DIFFICULTY_THRESHOLDS[1]);
      return this.status;
    }
    record(outcome, { demo = false } = {}) {
      if (demo || !["whole", "pulp", "smashed"].includes(outcome)) return this.status;
      if (outcome === "whole") {
        __privateWrapper(this, _totalWhole)._++;
        __privateSet(this, _consecutiveMisses, 0);
        if (__privateGet(this, _level) < MAX_LEVEL && __privateGet(this, _totalWhole) >= __privateGet(this, _nextPromotionWhole)) {
          __privateWrapper(this, _level)._++;
          __privateSet(this, _nextPromotionWhole, __privateGet(this, _level) === MAX_LEVEL ? null : Math.max(
            DIFFICULTY_THRESHOLDS[__privateGet(this, _level) + 1],
            __privateGet(this, _totalWhole) + RECOVERY_WHOLE
          ));
        }
      } else {
        __privateWrapper(this, _consecutiveMisses)._++;
        if (__privateGet(this, _consecutiveMisses) === FALLBACK_MISSES) {
          __privateSet(this, _consecutiveMisses, 0);
          if (__privateGet(this, _level) > 0) {
            __privateWrapper(this, _level)._--;
            __privateSet(this, _nextPromotionWhole, Math.max(
              DIFFICULTY_THRESHOLDS[__privateGet(this, _level) + 1],
              __privateGet(this, _totalWhole) + RECOVERY_WHOLE
            ));
          }
        }
      }
      return this.status;
    }
  };
  _level = new WeakMap();
  _totalWhole = new WeakMap();
  _consecutiveMisses = new WeakMap();
  _nextPromotionWhole = new WeakMap();

  // source/pose.js
  var clamp2 = (v, a, b) => Math.max(a, Math.min(b, v));
  var smooth = (a, b, v) => {
    const u = clamp2((v - a) / (b - a), 0, 1);
    return u * u * (3 - 2 * u);
  };
  var ARM = 65;
  function elbow(a, b, side = 1) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.max(1e-3, Math.hypot(dx, dy)), along = d / 2, height = Math.sqrt(Math.max(0, ARM * ARM - along * along));
    return { x: a.x + dx / d * along - dy / d * height * side, y: a.y + dy / d * along + dx / d * height * side };
  }
  function catcherPose(hand, collecting = false, motion = {}) {
    const alignment = motion.alignment || 0;
    hand = __spreadProps(__spreadValues({}, hand), { x: hand.x - alignment });
    const time = Number.isFinite(motion.time) ? motion.time : 0, age = Number.isFinite(motion.catchAge) ? motion.catchAge : -1;
    const v = motion.handVelocity || {}, vx = clamp2(v.x || 0, -600, 600), vy = clamp2(v.y || 0, -600, 600);
    const collectionTime = collecting ? Number.isFinite(motion.collectionProgress) ? motion.collectionProgress : 1 : 0;
    const prep = 0;
    const cast = smooth(0, 1, clamp2((450 - hand.y) / 105, 0, 1));
    const impact = age >= 0 ? age / 0.12 * Math.exp(1 - age / 0.12) : 0;
    const hinge = motion.circle && age >= 0 ? smooth(0.12, 0.65, age) * (1 - smooth(1.7, 2.65, age)) * (1 - smooth(0, 1, motion.recoveryProgress || 0)) : 0;
    const carried = 0;
    const bend = age >= 0 ? smooth(0.06, 0.36, age) * clamp2((hand.y - 420) / 65, 0, 1) * (1 - smooth(0, 1, motion.recoveryProgress || 0)) : 0;
    const hip = { x: 267 + clamp2((hand.x - 315) * 0.2, -26, 30) + cast * 5 - prep * 5 - impact * 3 - hinge * 3, y: 440 + bend * 31 + prep * 7 - cast * 5 + impact * 9 + hinge * (8 - bend * 13) };
    const angle = Math.atan2((hand.x - 315) * 0.65 + 20 + clamp2(vx * 8e-3, -4, 4) - impact * 9, 105) + hinge * 0.08;
    const shoulder = { x: hip.x + Math.sin(angle) * 105 - impact * 3, y: hip.y - Math.cos(angle) * 105 + clamp2(vy * 6e-3, -3, 3) + impact * 4 };
    const hands = [{ x: hand.x - 11.52, y: hand.y + 5.76 }, { x: hand.x + 11.52, y: hand.y - 5.76 }];
    for (let pass = 0; pass < 4; pass++) for (let i = 0; i < 2; i++) {
      const h = hands[i], ax = shoulder.x + (i ? 7 : -7), ay = shoulder.y + 5, dx = h.x - ax, dy = h.y - ay, d = Math.hypot(dx, dy);
      if (d > 126) {
        shoulder.x += dx * (d - 126) / d;
        shoulder.y += dy * (d - 126) / d;
      }
    }
    const arms = hands.map((h, i) => {
      const a = { x: shoulder.x + (i ? 7 : -7), y: shoulder.y + 5 };
      let e = elbow(a, h, i ? 1 : -1);
      if (motion.circle) {
        const dx = h.x - a.x, dy = h.y - a.y, d = Math.max(1e-3, Math.hypot(dx, dy)), height = Math.sqrt(Math.max(0, ARM * ARM - d * d / 4)), side = 0.7;
        e = { x: (a.x + h.x) / 2 - dy / d * height * side, y: (a.y + h.y) / 2 + dx / d * height * side, z: Math.sqrt(1 - side * side) * height };
      }
      return { shoulder: a, elbow: e, hand: h };
    });
    const facing = 1 - 2 * carried;
    const head = { x: shoulder.x + 4 - 9 * carried - clamp2(vx * 6e-3, -3, 3), y: shoulder.y - 36 - clamp2(vy * 5e-3, -2.5, 2.5) - impact * 2 };
    const knees = [{ x: hip.x - 32 - bend * 8 - prep * 3, y: 500 + bend * 5 + impact * 2 }, { x: hip.x + 38 + cast * 3, y: 499 + bend * 8 + impact * 2 }];
    const feet = [{ x: 234, y: 539 }, { x: 315, y: 541 }];
    const spread = collecting ? smooth(0.06, 0.4, collectionTime) * (1 - smooth(0, 1, motion.recoveryProgress || 0)) : 0;
    knees[0].x -= 8 * spread;
    knees[1].x += 17 * spread;
    feet[0].x -= 5 * spread;
    feet[1].x += 10 * spread;
    const walk = clamp2(Math.abs(motion.alignmentVelocity || 0) / 120, 0, 1) * (age < 0 ? 1 : 0), step = Math.sin(time * 13) * walk;
    knees[0].y -= Math.max(0, step) * 4;
    knees[1].y -= Math.max(0, -step) * 4;
    feet[0].y -= Math.max(0, step) * 3;
    feet[1].y -= Math.max(0, -step) * 3;
    if (alignment) {
      for (const p of [hip, shoulder, head, ...knees, ...feet]) p.x += alignment;
      for (const a of arms) for (const p of [a.shoulder, a.elbow, a.hand]) p.x += alignment;
    }
    return { bend, hip, shoulder, head, arms, knees, feet, facing, anticipation: prep, catchCompression: impact, carryBlend: carried };
  }

  // source/body-collision.js
  function bodyCapsules(p) {
    const c = [{ part: "head", a: p.head, b: p.head, r: 20 }, { part: "torso", a: p.shoulder, b: p.hip, r: 18 }];
    p.arms.forEach((arm, i) => {
      c.push({ part: "upper-arm-".concat(i), a: arm.shoulder, b: arm.elbow, r: 8 }, { part: "forearm-".concat(i), a: arm.elbow, b: arm.hand, r: 7 });
    });
    p.knees.forEach((k, i) => c.push({ part: "thigh-".concat(i), a: p.hip, b: k, r: 12 }, { part: "shin-".concat(i), a: k, b: p.feet[i], r: 9 }));
    return c;
  }
  var pointSegment = (p, a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  };
  function sweepBody(from, to, pose, r = 19) {
    const n = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z) / 2)), caps = bodyCapsules(pose);
    for (let i = 0; i <= n; i++) {
      const u = i / n, z = from.z + (to.z - from.z) * u;
      if (Math.abs(z) > 32 + r) continue;
      const p = { x: from.x + (to.x - from.x) * u + z * 0.48, y: from.y + (to.y - from.y) * u - z * 0.24 };
      for (const cap of caps) {
        if (pointSegment(p, cap.a, cap.b) <= cap.r + r) return { part: cap.part, u, point: p };
      }
    }
    return null;
  }
  function studyBodyPose(s) {
    return catcherPose(s.hand, false, { time: s.time, catchAge: s.contactTime === null ? -1 : s.time - s.contactTime, handVelocity: s.handVelocity, circle: true, alignment: s.alignment });
  }

  // source/circle-motion.js
  var clamp3 = (v, a, b) => Math.max(a, Math.min(b, v));
  var READY_HAND = Object.freeze({ x: 315, y: 450 });
  var GROUND_CENTER_Y = 531;
  var LOADED_CLOTH_DAMPING = 0.99;
  var ease = (u) => {
    u = clamp3(u, 0, 1);
    return u * u * (3 - 2 * u);
  };
  function castHand(time, start2 = null, alignment = 0) {
    if (start2 === null) return { x: READY_HAND.x + alignment, y: READY_HAND.y };
    const age = time - start2, lift = age < 0.18 ? ease(age / 0.18) : age < 0.3 ? 1 : 1 - ease((age - 0.3) / 0.3);
    return { x: READY_HAND.x + alignment + 55 * lift, y: READY_HAND.y - 105 * lift };
  }
  function driveGrip(s, dt) {
    if (s.collection) return;
    const age = s.circleStart === null ? -1 : s.time - s.circleStart;
    const rotation = !s.circleCancelled && age >= 0 ? age < 0.1 ? ease(age / 0.1) : age < 0.3 ? 1 : 1 - ease((age - 0.3) / 0.3) : 0;
    const angle = 1.32 - 1.48 * rotation;
    s.gripDriveAngle = angle;
    for (let row = 1; row <= 6; row++) for (let col = 0; col < 9; col++) {
      const p = s.nodes[row * 9 + col], r = row * 6, goal = { x: s.hand.x + Math.cos(angle) * r, y: s.hand.y + Math.sin(angle) * r, z: (col - 4) * 11 };
      for (const k of ["x", "y", "z"]) {
        const v = (p[k] - p["p" + k]) / dt, acc = clamp3((goal[k] - p[k]) * 2600 - v * 52, -14e3, 14e3);
        p["p" + k] -= acc * dt * dt;
      }
    }
  }
  function tangent(points, i, k) {
    var _a;
    if (i === 0) return ((_a = points[0].v) == null ? void 0 : _a[k]) || 0;
    if (i === points.length - 1) return 0;
    return (points[i + 1][k] - points[i - 1][k]) / (points[i + 1].t - points[i - 1].t);
  }
  function curve(points, time) {
    let i = 0;
    while (i < points.length - 2 && time > points[i + 1].t) i++;
    const a = points[i], b = points[i + 1], dt = b.t - a.t, u = clamp3((time - a.t) / dt, 0, 1), p = {}, v = {}, acc = {};
    for (const k of ["x", "y", "z"]) {
      const av = a[k] || 0, bv = b[k] || 0, m0 = tangent(points, i, k) * dt, m1 = tangent(points, i + 1, k) * dt;
      p[k] = (2 * u ** 3 - 3 * u * u + 1) * av + (u ** 3 - 2 * u * u + u) * m0 + (-2 * u ** 3 + 3 * u * u) * bv + (u ** 3 - u * u) * m1;
      v[k] = ((6 * u * u - 6 * u) * av + (3 * u * u - 4 * u + 1) * m0 + (-6 * u * u + 6 * u) * bv + (3 * u * u - 2 * u) * m1) / dt;
      acc[k] = ((12 * u - 6) * av + (6 * u - 4) * m0 + (-12 * u + 6) * bv + (6 * u - 2) * m1) / (dt * dt);
    }
    if (time >= points[points.length - 1].t) for (const k of ["x", "y", "z"]) {
      v[k] = 0;
      acc[k] = 0;
    }
    return { p, v, acc };
  }
  function makeLoadedSweep(s) {
    const f = s.fruit, h = s.hand, v = { x: (f.x - f.px) * 240, y: (f.y - f.py) * 240, z: (f.z - f.pz) * 240 }, gap = 275 + s.alignment;
    return {
      // A post-adhesion response, initialized with the real contact position and
      // velocity. Gravity remains the only downward acceleration; tension brakes.
      fruitPath: [{ t: 0, x: f.x, y: f.y, z: f.z, v }, { t: 0.14, x: f.x - 22, y: Math.min(465, f.y + 88), z: -12 }, { t: 0.4, x: gap + 32, y: 503, z: -60 }, { t: 0.7, x: gap + 4, y: 521, z: -28 }, { t: 0.9, x: gap, y: 527, z: -3 }, { t: 1.2, x: gap, y: 533, z: 0 }],
      handPath: [{ t: 0, x: h.x, y: h.y, z: 0, v: s.handVelocity }, { t: 0.08, x: h.x - 3, y: h.y + 5, z: 0 }, { t: 0.25, x: h.x - 24, y: h.y + 45, z: 0 }, { t: 0.5, x: gap + 28, y: 455, z: 0 }, { t: 0.85, x: gap + 5, y: 475, z: 0 }, { t: 1.2, x: gap, y: 475, z: 0 }],
      anchors: s.catchProof.tethers.map((t) => ({ i: t.node, offset: { x: s.nodes[t.node].x - f.x, y: s.nodes[t.node].y - f.y, z: s.nodes[t.node].z - f.z } }))
    };
  }
  function loadedCloth(s, dt, released = false) {
    const n = s.nodes, f = s.fruit, old = n.map((p) => ({ x: p.x, y: p.y, z: p.z })), anchors = s.collection.sweep.anchors, anchorIDs = new Set(anchors.map((a) => a.i)), pinned = (i) => !released && anchorIDs.has(i) || (i === 0 || i === 8) && !!s.hand, damping = (LOADED_CLOTH_DAMPING * (anchors.length && !released ? 1 - 0.015 * clamp3(((s.collection.time || 0) - 0.4) / 0.4, 0, 1) : 1)) ** (dt * 240);
    for (let i = 0; i < n.length; i++) if (!pinned(i)) {
      const p = n[i], x = p.x, y = p.y, z = p.z;
      p.x += (p.x - p.px) * damping;
      p.y += (p.y - p.py) * damping + 600 * dt * dt;
      p.z += (p.z - p.pz) * damping;
      p.px = x;
      p.py = y;
      p.pz = z;
    }
    const pin = () => {
      if (s.hand) {
        for (let i of [0, 8]) if (n[i]) Object.assign(n[i], { x: s.hand.x, y: s.hand.y, z: (i - 4) * 6 });
      }
      if (!released) for (let a of anchors) for (let k of ["x", "y", "z"]) n[a.i][k] = f[k] + a.offset[k];
    };
    for (let pass = 0; pass < 10; pass++) {
      pin();
      for (let l of s.links) {
        let a = n[l.a], b = n[l.b], dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, d = Math.hypot(dx, dy, dz) || 1, wa = pinned(l.a) ? 0 : 1, wb = pinned(l.b) ? 0 : 1, w = wa + wb;
        if (!w) continue;
        let c = (d - l.d) / d * l.k / w;
        for (let [k, v] of [["x", dx], ["y", dy], ["z", dz]]) {
          a[k] += v * c * wa;
          b[k] -= v * c * wb;
        }
      }
      for (let i = 0; i < n.length; i++) {
        if (pinned(i)) continue;
        let p = n[i], dx = p.x - f.x, dy = p.y - f.y, dz = p.z - f.z, d = Math.hypot(dx, dy, dz);
        if (d < 21 && d > 1e-3) {
          p.x = f.x + dx * 21 / d;
          p.y = f.y + dy * 21 / d;
          p.z = f.z + dz * 21 / d;
        }
        if (p.y > 555) {
          p.y = 555;
          p.py = 555;
          p.px = p.x - (p.x - p.px) * 0.85;
        }
      }
    }
    pin();
    for (let i = 0; i < n.length; i++) if (!pinned(i)) {
      const p = n[i], o = old[i], d = Math.hypot(p.x - o.x, p.y - o.y, p.z - o.z), limit = (released || s.collection.time >= 0.12 ? 1440 : 2400) * dt;
      if (d > limit) for (const k of ["x", "y", "z"]) p[k] = o[k] + (p[k] - o[k]) * limit / d;
    }
    for (let i = 0; i < n.length; i++) if (pinned(i)) {
      n[i].px = old[i].x;
      n[i].py = old[i].y;
      n[i].pz = old[i].z;
    }
  }

  // source/physics.js
  var STEP = 1 / 240;
  function classifyImpact(e) {
    if (e.caught) return "intact";
    return e.speed >= 650 || !e.hadClothContact && e.dropDistance > 700 ? "shattered" : "partial";
  }
  var MATERIAL = { clothDamping: 0.996, fruitInverseMass: 0.018, gravity: 600 };
  function integrateParticle(p, dt, damp, gravity = MATERIAL.gravity) {
    let x = p.x, y = p.y, z = p.z;
    p.x += (p.x - p.px) * damp;
    p.y += (p.y - p.py) * damp + gravity * dt * dt;
    p.z += (p.z - p.pz) * damp;
    p.px = x;
    p.py = y;
    p.pz = z;
  }
  var clamp4 = (v, a, b) => Math.max(a, Math.min(b, v));
  var Study = class {
    constructor({ seed = 12345, adaptive = false } = {}) {
      this.difficulty = adaptive ? new DifficultyController() : null;
      this.canopy = new Canopy();
      this.rngState = seed >>> 0;
      this.canopyRngState = (seed ^ 1365458477) >>> 0;
      this.pulpRngState = (seed ^ 2654435769) >>> 0;
      this.coins = 0;
      this.coinEvents = [];
      this.coinSerial = 0;
      this.injurySerial = 0;
      this.injuryEvents = [];
      this.totals = { whole: 0, pulp: 0, snacks: 0 };
      this.round = 0;
      this.reset();
    }
    reset() {
      this.selectedFruitId = null;
      this.releaseProof = null;
      this.returnProgress = 0;
      this.dropTimeOffset = 0;
      this.basketDelivered = false;
      this.groundDelivered = false;
      this.groundSettled = false;
      this.settledAt = null;
      this.groundSettledAt = null;
      this.groundContactAt = null;
      this.stanceGroundX = null;
      this.deliveredAt = null;
      this.collected = false;
      this.injured = false;
      this.injury = null;
      this.pulpCount = 1;
      this.controller = null;
      this.circleStart = null;
      this.alignment = 0;
      this.alignmentTarget = 0;
      this.circleCancelled = false;
      this.catchLocked = false;
      this.controlledPlacement = false;
      this.groundContactSpeed = null;
      this.catchProof = null;
      this.bounce = null;
      this.impactTier = null;
      this.impactEvidence = null;
      this.lastContactY = null;
      this.lastContactTime = null;
      this.supportReleaseY = null;
      this.dropOriginY = -850;
      this.partialCredited = false;
      this.snagHoldTime = 0;
      this.stage = "ready";
      this.outcome = null;
      this.eaten = false;
      this.collectReady = false;
      this.collection = null;
      this.credited = false;
      this.impactSpeed = 0;
      this.arrivalSpeed = 0;
      this.peakFruitSpeed = 0;
      this.time = 0;
      this.acc = 0;
      this.running = false;
      this.demo = false;
      this.contactTime = null;
      this.maxStrain = 0;
      this.broken = false;
      this.success = false;
      this.grounded = false;
      this.wrapEstablished = false;
      this.supportTime = 0;
      this.strictSupportTime = 0;
      this.lastSupportEvidence = -Infinity;
      this.unsupportedTime = 0;
      this.contactHand = null;
      this.heldTime = 0;
      this.yielded = false;
      this.snagCooldown = /* @__PURE__ */ new Map();
      this.checkpoint = false;
      this.continueMode = false;
      this.hand = __spreadValues({}, READY_HAND);
      this.target = __spreadValues({}, this.hand);
      this.nodes = [];
      this.links = [];
      this.snags = [];
      this.fruit = { x: 408, y: -850, z: 0, px: 408, py: -850, pz: 0, r: 19, w: MATERIAL.fruitInverseMass };
      this.cols = 9;
      this.rows = 12;
      for (let j = 0; j < this.rows; j++) for (let i = 0; i < this.cols; i++) {
        let x = 335 + (j <= 6 ? j * 6 : 36 + (j - 6) * 10) + Math.sin(i * 1.8 + j * 0.7), y = 425 + j * 0.1 + Math.sin(i * 1.8 + j * 0.7) * 1.5, z = (i - 4) * 12;
        this.nodes.push({ x, y, z, px: x, py: y, pz: z, w: j === 0 && (i === 0 || i === 8) ? 0 : 1 });
      }
      for (let i of [0, 8]) Object.assign(this.nodes[i], { x: 335, px: 335, y: 425, py: 425, z: (i - 4) * 6, pz: (i - 4) * 6 });
      const add = (a, b, k = 1) => {
        let p = this.nodes[a], q = this.nodes[b];
        this.links.push({ a, b, d: Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z), k });
      };
      for (let j = 0; j < 12; j++) for (let i = 0; i < 9; i++) {
        let a = j * 9 + i;
        if (i < 8) add(a, a + 1);
        if (j < 11) add(a, a + 9);
        if (i < 8 && j < 11) {
          add(a, a + 10, 0.25);
          add(a + 1, a + 9, 0.25);
        }
        if (j < 10) add(a, a + 18, 2e-3);
      }
      for (const p of this.nodes) {
        const dx = p.x - 335, dy = p.y - 425, x = READY_HAND.x + dx * Math.cos(1.32) - dy * Math.sin(1.32), y = READY_HAND.y + dx * Math.sin(1.32) + dy * Math.cos(1.32);
        p.x = p.px = x;
        p.y = p.py = y;
      }
    }
    start(demo = false, { landingX, slotId } = {}) {
      var _a, _b, _c, _d;
      const priorAlignment = this.alignment || 0, priorNodes = this.outcome && !this.resetClothOnStart ? this.nodes : null, priorLinks = priorNodes ? this.links : null, priorHand = priorNodes ? __spreadValues({}, this.hand) : null;
      this.resetClothOnStart = false;
      const sample = nextRandom(this.rngState);
      this.rngState = sample.state;
      this.reset();
      this.alignment = this.alignmentTarget = priorAlignment;
      this.hand.x += priorAlignment;
      this.target.x += priorAlignment;
      for (const p of this.nodes) {
        p.x += priorAlignment;
        p.px += priorAlignment;
      }
      if (priorNodes) {
        this.nodes = priorNodes;
        this.links = priorLinks;
        this.hand = priorHand;
      }
      this.profile = ((_a = this.difficulty) == null ? void 0 : _a.profile) || null;
      this.fruitGravity = ((_b = this.profile) == null ? void 0 : _b.fruitGravity) || 600;
      this.round++;
      const pulp = nextRandom(this.pulpRngState);
      this.pulpRngState = pulp.state;
      this.pulpCount = 1 + Math.floor(pulp.value * 5);
      if (landingX !== void 0) {
        this.landingX = landingX;
        this.fruit.x = this.fruit.px = landingX;
      } else {
        const pick = nextRandom(this.canopyRngState);
        this.canopyRngState = pick.state;
        const radius = (_d = (_c = this.profile) == null ? void 0 : _c.landingRadius) != null ? _d : 70, choices = this.canopy.eligible(radius);
        let value = pick.value;
        if (slotId !== void 0) {
          const index = choices.findIndex((p) => p.id === slotId);
          if (index < 0) throw Error("Requested fruit is not hanging and reachable");
          value = (index + 0.5) / choices.length;
        }
        const slot = this.canopy.select(value, radius);
        this.selectedFruitId = slot.id;
        this.landingX = slot.x;
        this.dropOriginY = slot.y;
        for (const k of ["x", "y", "z"]) this.fruit[k] = this.fruit["p" + k] = slot[k];
        this.releaseProof = Object.freeze({ id: slot.id, generation: slot.generation, x: slot.x, y: slot.y, z: slot.z, r: slot.r, vx: 0, vy: 0, vz: 0 });
      }
      this.fallRate = Math.sqrt(this.fruitGravity / 600);
      this.dropTimeOffset = Math.sqrt(2 * (300 - this.dropOriginY) / this.fruitGravity) - Math.sqrt(2 * 1150 / this.fruitGravity);
      this.running = true;
      this.demo = demo;
      this.isDemoRound = demo;
      this.stage = "falling";
    }
    castTime(baselineTime) {
      return baselineTime / (this.fallRate || 1) + (this.dropTimeOffset || 0);
    }
    setAlignment(landingX) {
      if (this.collection || this.outcome) return;
      this.alignmentTarget = clamp4(Math.round((landingX - LANDING.center) * 1e6) / 1e6 || 0, -70, 70);
    }
    get inputOpen() {
      return this.running && this.time >= this.castTime(this.profile ? 1 : 1.45) && !this.collection && !this.bounce && !this.catchLocked && !this.outcome;
    }
    get canEat() {
      return this.outcome === "pulp" && !this.eaten;
    }
    get catchClock() {
      return Math.max(0, (this.time - this.castTime(1.45)) / 0.6);
    }
    resetTotals() {
      var _a;
      this.resetClothOnStart = true;
      this.alignment = this.alignmentTarget = 0;
      (_a = this.difficulty) == null ? void 0 : _a.reset();
      this.canopy.reset();
      this.coins = 0;
      this.coinEvents = [];
      this.totals = { whole: 0, pulp: 0, snacks: 0 };
    }
    eat() {
      if (!this.canEat) return false;
      this.eaten = true;
      if (!this.isDemoRound) {
        this.totals.pulp = Math.max(0, this.totals.pulp - 1);
        this.totals.snacks++;
      }
      return true;
    }
    requestCollect() {
      if (!this.catchLocked || this.outcome || this.collection || !this.running) return false;
      this.collectReady = false;
      this.collection = { time: 0, origin: { x: this.fruit.x, y: this.fruit.y, z: this.fruit.z }, handOrigin: __spreadValues({}, this.hand), target: { x: 275 + this.alignment, y: GROUND_CENTER_Y, z: 0 }, settle: 0, automatic: true, catchProof: this.catchProof, sweep: makeLoadedSweep(this) };
      this.stage = "collecting";
      this.snags = [];
      this.broken = true;
      return true;
    }
    award(amount, reason) {
      if (this.isDemoRound || !amount) return;
      this.coins += amount;
      this.coinEvents.push(Object.freeze({ id: ++this.coinSerial, amount, reason, round: this.round, time: this.time }));
    }
    hurt(hit) {
      if (this.catchLocked || this.injured || this.outcome) return false;
      this.injured = true;
      this.injury = Object.freeze(__spreadProps(__spreadValues({}, hit), { id: ++this.injurySerial, time: this.time, round: this.round, demo: !!this.isDemoRound }));
      this.injuryEvents.push(this.injury);
      return true;
    }
    finish(outcome) {
      var _a, _b, _c;
      if (outcome === "whole" && !this.groundDelivered) return;
      if (this.outcome || this.catchLocked && outcome !== "whole") return;
      this.outcome = outcome;
      this.stage = outcome === "whole" && this.basketDelivered ? "ready" : "result";
      this.running = false;
      this.collectReady = false;
      if (outcome === "whole" && !this.credited) {
        this.credited = true;
        if (!this.isDemoRound) this.totals.whole++;
        this.award(20, "whole");
      }
      if (outcome === "pulp" && !this.partialCredited) {
        this.partialCredited = true;
        if (!this.isDemoRound) this.totals.pulp++;
        this.award(-10, "broken");
      }
      if (outcome === "smashed") this.award(-10, "broken");
      (_a = this.difficulty) == null ? void 0 : _a.record(outcome, { demo: this.isDemoRound });
      if (this.selectedFruitId) this.canopy.prepareNext((_c = (_b = this.difficulty) == null ? void 0 : _b.profile.landingRadius) != null ? _c : 70);
    }
    aim(x, y) {
      if (!this.inputOpen) return false;
      this.target = { x: clamp4(x, 225, 470), y: clamp4(y, 265, 475) };
      return true;
    }
    cancel() {
      if (this.collection || this.outcome) return;
      this.circleCancelled = true;
      this.alignmentTarget = this.alignment;
      this.target = __spreadValues({}, this.hand);
      this.demo = false;
    }
    demoTarget(t) {
      t = (t - 1.45) / 0.6;
      const points = [[0, 315, 405], [0.28, 315, 410], [0.58, 423, 285], [0.77, 428, 305], [1.14, 320, 430], [1.5, 280, 470], [3, 300, 400], [6, 300, 400]];
      for (let i = 1; i < points.length; i++) {
        if (t <= points[i][0]) {
          let a = points[i - 1], b = points[i], u = clamp4((t - a[0]) / (b[0] - a[0]), 0, 1);
          u = u * u * (3 - 2 * u);
          return { x: a[1] + (b[1] - a[1]) * u, y: a[2] + (b[2] - a[2]) * u };
        }
      }
      return { x: 300, y: 400 };
    }
    advance(dt) {
      this.acc += Math.min(dt, 0.1);
      while (this.acc >= STEP) {
        this.step();
        this.acc -= STEP;
      }
    }
    step() {
      var _a;
      if (!this.running) return;
      const dt = STEP;
      this.time += dt;
      this.alignment += clamp4(this.alignmentTarget - this.alignment, -200 * dt, 200 * dt);
      if (this.controller) this.controller.update(this, dt);
      if (this.bounce) {
        this.stepBounce(dt);
        return;
      }
      if (this.collection) {
        this.stepCollection(dt);
        return;
      }
      this.stage = this.time < this.castTime(1.45) ? "falling" : this.contactTime === null ? "window" : "catching";
      if (this.demo) {
        this.setAlignment(this.landingX);
        if (this.time >= this.castTime(1.82)) (_a = this.circleStart) != null ? _a : this.circleStart = this.castTime(1.82);
        this.target = castHand(this.time, this.circleStart, this.alignment);
      } else if (!this.circleStart && !this.controller) this.target = castHand(this.time, null, this.alignment);
      let dx = this.target.x - this.hand.x, dy = this.target.y - this.hand.y, d = Math.hypot(dx, dy), f = Math.min(1, 1100 * dt / (d || 1));
      this.handVelocity = { x: dx * f / dt, y: dy * f / dt };
      this.hand.x += dx * f;
      this.hand.y += dy * f;
      const bodyFrom = __spreadValues({}, this.fruit);
      driveGrip(this, dt);
      const integrate = (p, damp) => integrateParticle(p, dt, damp);
      for (const p of this.nodes) if (p.w) integrate(p, MATERIAL.clothDamping);
      integrateParticle(this.fruit, dt, 1, this.fruitGravity || 600);
      const pin = () => {
        for (const i of [0, 8]) {
          let p = this.nodes[i];
          p.x = this.hand.x;
          p.y = this.hand.y;
          p.z = (i - 4) * 6;
        }
      };
      pin();
      for (const sn of this.snags) {
        const p = this.nodes[sn.i], distance = Math.hypot(p.x - this.fruit.x, p.y - this.fruit.y, p.z - this.fruit.z);
        sn.localContact = distance <= 24;
        if (distance > 27 || this.time - sn.created > 2.2) {
          sn.dead = true;
          this.snagCooldown.set(sn.i, this.time + 0.15);
        }
      }
      this.snags = this.snags.filter((sn) => !sn.dead);
      let hit = [], pressing = /* @__PURE__ */ new Map();
      for (let it = 0; it < 7; it++) {
        for (const l of this.links) {
          const a = this.nodes[l.a], b = this.nodes[l.b], dx2 = b.x - a.x, dy2 = b.y - a.y, dz = b.z - a.z, d2 = Math.hypot(dx2, dy2, dz) || 1, w = a.w + b.w;
          if (!w) continue;
          let s = (d2 - l.d) / d2 * l.k / w;
          a.x += dx2 * s * a.w;
          a.y += dy2 * s * a.w;
          a.z += dz * s * a.w;
          b.x -= dx2 * s * b.w;
          b.y -= dy2 * s * b.w;
          b.z -= dz * s * b.w;
        }
        const fruit = this.fruit;
        for (let i = 0; i < this.nodes.length; i++) {
          let p = this.nodes[i], dx2 = p.x - fruit.x, dy2 = p.y - fruit.y, dz = p.z - fruit.z, d2 = Math.hypot(dx2, dy2, dz), r = fruit.r + 3;
          if (d2 < r && d2 > 1e-3) {
            if (!hit.includes(i)) hit.push(i);
            if (it === 0) {
              const rx = fruit.x - fruit.px - p.x + p.px, ry = fruit.y - fruit.py - p.y + p.py, rz = fruit.z - fruit.pz - p.z + p.pz, relative = Math.hypot(rx, ry, rz) / dt, approach = (rx * dx2 + ry * dy2 + rz * dz) / d2 / dt;
              if (this.circleStart !== null && this.time - this.circleStart < 0.48 && (p.x - p.px) / dt > 20 && approach > 25 && approach / Math.max(1, relative) > 0.08) pressing.set(i, { approach, fraction: approach / Math.max(1, relative) });
            }
            let s = (r - d2) / d2 / (p.w + fruit.w);
            p.x += dx2 * s * p.w;
            p.y += dy2 * s * p.w;
            p.z += dz * s * p.w;
            fruit.x -= dx2 * s * fruit.w;
            fruit.y -= dy2 * s * fruit.w;
            fruit.z -= dz * s * fruit.w;
            if (it === 0) {
              const nx = dx2 / d2, ny = dy2 / d2, nz = dz / d2, rx = p.x - p.px - (fruit.x - fruit.px), ry = p.y - p.py - (fruit.y - fruit.py), rz = p.z - p.pz - (fruit.z - fruit.pz), vn = rx * nx + ry * ny + rz * nz, tx = rx - vn * nx, ty = ry - vn * ny, tz = rz - vn * nz, ft = Math.min(0.18, (r - d2) * 0.45 / (Math.hypot(tx, ty, tz) || 1)), w = p.w + fruit.w;
              p.px += tx * ft * p.w / w;
              p.py += ty * ft * p.w / w;
              p.pz += tz * ft * p.w / w;
              fruit.px -= tx * ft * fruit.w / w;
              fruit.py -= ty * ft * fruit.w / w;
              fruit.pz -= tz * ft * fruit.w / w;
            }
          }
        }
        for (const sn of this.snags) {
          let p = this.nodes[sn.i], dx2 = p.x - fruit.x, dy2 = p.y - fruit.y, dz = p.z - fruit.z, d2 = Math.hypot(dx2, dy2, dz) || 1;
          const stretch = d2 - sn.d;
          this.maxStrain = Math.max(this.maxStrain, stretch);
          if (stretch > 32) {
            sn.dead = true;
            this.broken = true;
            continue;
          }
          let s = stretch / d2 * 0.33 / (p.w + fruit.w);
          p.x -= dx2 * s * p.w;
          p.y -= dy2 * s * p.w;
          p.z -= dz * s * p.w;
          fruit.x += dx2 * s * fruit.w;
          fruit.y += dy2 * s * fruit.w;
          fruit.z += dz * s * fruit.w;
        }
        pin();
        for (let p of this.nodes) if (p.y > 548) {
          p.y = 548;
          p.px = p.x - (p.x - p.px) * 0.75;
        }
        if (fruit.y > 533) {
          if (!this.grounded) this.impactSpeed = Math.hypot(fruit.x - fruit.px, fruit.y - fruit.py, fruit.z - fruit.pz) / dt;
          fruit.y = 533;
          fruit.py = 533;
          fruit.px = fruit.x - (fruit.x - fruit.px) * 0.8;
          this.grounded = true;
          this.snags = [];
          if (this.catchLocked) {
            this.beginBounce();
            return;
          }
        }
      }
      if (hit.length) {
        this.lastContactY = this.fruit.y;
        this.lastContactTime = this.time;
      }
      if (hit.length && this.contactTime === null) {
        this.contactTime = this.time;
        this.contactHand = __spreadValues({}, this.hand);
        this.arrivalSpeed = Math.hypot(this.fruit.x - this.fruit.px, this.fruit.y - this.fruit.py, this.fruit.z - this.fruit.pz) / dt;
      }
      const near = this.nodes.filter((p) => Math.hypot(p.x - this.fruit.x, p.y - this.fruit.y, p.z - this.fruit.z) < 26);
      const ext = (k) => [Math.min(...near.map((p) => p[k] - this.fruit[k])), Math.max(...near.map((p) => p[k] - this.fruit[k]))];
      const ex = ext("x"), ez = ext("z");
      const below = near.filter((p) => p.y - this.fruit.y > 7).length;
      const strictSupport = near.length >= 9 && below >= 3 && ex[0] < -7 && ex[1] > 7;
      if (this.contactTime !== null && this.time - this.contactTime >= 0.25) {
        this.strictSupportTime = strictSupport ? this.strictSupportTime + dt : 0;
        if (this.strictSupportTime >= 0.04) this.lastSupportEvidence = this.time;
      }
      this.supported = near.length >= 8 && below >= 3 && (ex[0] < -6 && ex[1] > 6 || ez[0] < -6 && ez[1] > 6);
      if (this.contactTime !== null && this.time - this.contactTime > 0.85 && !this.wrapEstablished && !this.broken) {
        if (this.time - this.lastSupportEvidence <= 0.12) this.wrapEstablished = true;
        else {
          this.snags = [];
          this.broken = true;
        }
      }
      if (this.wrapEstablished) {
        this.unsupportedTime = this.supported ? 0 : this.unsupportedTime + dt;
        if (this.unsupportedTime > 0.22) {
          this.snags = [];
          this.broken = true;
        }
      }
      if (!this.grounded && !this.broken && (!this.wrapEstablished || this.supported) && this.snags.length < 5) {
        for (let i of hit) {
          if (!pressing.has(i)) continue;
          if (this.snags.some((s) => s.i === i) || (this.snagCooldown.get(i) || 0) > this.time) continue;
          let p = this.nodes[i];
          this.snags.push({ i, approach: pressing.get(i).approach, normalFraction: pressing.get(i).fraction, created: this.time, localContact: true, expires: this.time + 0.22, d: Math.hypot(p.x - this.fruit.x, p.y - this.fruit.y, p.z - this.fruit.z) });
          if (this.snags.length === 5) break;
        }
      }
      for (const sn of this.snags) {
        if (sn.localContact && (!this.wrapEstablished || this.supported)) sn.expires = this.time + 0.22;
      }
      this.snags = this.snags.filter((s) => !s.dead && s.expires >= this.time);
      const localSnags = this.snags.filter((sn) => sn.localContact && Math.hypot(this.nodes[sn.i].x - this.fruit.x, this.nodes[sn.i].y - this.fruit.y, this.nodes[sn.i].z - this.fruit.z) <= 24);
      this.snagHoldTime = localSnags.length && !this.grounded ? this.snagHoldTime + dt : 0;
      if (!this.catchLocked && this.contactTime !== null && localSnags.length > 0 && !this.grounded) {
        this.catchLocked = true;
        this.catchProof = { at: this.time, contactTime: this.contactTime, persistentTime: this.snagHoldTime, tethers: localSnags.map((sn) => ({ node: sn.i, created: sn.created, approach: sn.approach, normalFraction: sn.normalFraction, distance: Math.hypot(this.nodes[sn.i].x - this.fruit.x, this.nodes[sn.i].y - this.fruit.y, this.nodes[sn.i].z - this.fruit.z) })), fruit: __spreadValues({}, this.fruit), hand: __spreadValues({}, this.hand) };
        this.collectReady = true;
        this.requestCollect();
        return;
      }
      if (!this.injured) {
        const hit2 = sweepBody(bodyFrom, this.fruit, studyBodyPose(this), this.fruit.r);
        if (hit2) this.hurt(hit2);
      }
      const yielded = this.contactHand && this.hand.y - this.contactHand.y > 65 && this.contactHand.x - this.hand.x > 65;
      if (yielded) this.yielded = true;
      const speed = Math.hypot(this.fruit.x - this.fruit.px, this.fruit.y - this.fruit.py, this.fruit.z - this.fruit.pz) / dt;
      this.heldTime = this.wrapEstablished && this.supported && this.yielded && speed < 140 && !this.grounded ? this.heldTime + dt : 0;
      this.peakFruitSpeed = Math.max(this.peakFruitSpeed, speed);
      this.collectReady = this.heldTime > 0.5 && this.supported && !this.grounded;
      this.success = false;
      if (this.grounded) {
        this.recordImpact();
        this.finish(this.impactTier === "shattered" ? "smashed" : "pulp");
        return;
      }
      if (this.demo && this.collectReady) this.requestCollect();
    }
    recordImpact() {
      var _a, _b;
      const release2 = (_b = (_a = this.supportReleaseY) != null ? _a : this.lastContactY) != null ? _b : this.dropOriginY;
      this.impactEvidence = { speed: this.impactSpeed, energy: 0.5 * this.impactSpeed * this.impactSpeed, dropDistance: Math.max(0, 533 - release2), lastContactHeight: this.lastContactY === null ? null : 533 - this.lastContactY, releaseHeight: 533 - release2, hadClothContact: this.contactTime !== null, caught: this.catchLocked && !!this.catchProof };
      this.impactTier = classifyImpact(this.impactEvidence);
    }
    beginBounce() {
      this.recordImpact();
      this.impactTier = "intact";
      const f = this.fruit;
      f.y = 533;
      const rebound = Math.min(180, Math.max(0, this.impactSpeed * 0.4));
      f.py = f.y + rebound * STEP;
      f.px = f.x - (f.x - f.px) * 0.5;
      this.collection = null;
      this.collectReady = false;
      this.stage = "ground-recovery";
      this.bounce = { time: 0, settle: 0, rebounded: true };
    }
    stepBounce(dt) {
      const f = this.fruit, b = this.bounce;
      b.time += dt;
      integrateParticle(f, dt, 0.995);
      if (f.y >= 533) {
        f.y = 533;
        f.py = 533;
        f.px = f.x - (f.x - f.px) * 0.75;
        b.settle += dt;
      } else b.settle = 0;
      if (b.settle > 0.15) {
        this.bounce = null;
        this.grounded = false;
        this.requestCollect();
        this.collection.recoveredFromGround = true;
      }
    }
    stepCollection(dt) {
      const c = this.collection, f = this.fruit;
      c.time += dt;
      const goal = curve(c.sweep.fruitPath, c.time), hand = curve(c.sweep.handPath, c.time);
      c.phase = c.time < 0.08 ? "brace" : c.time < 0.4 ? "yield" : this.grounded ? "ground" : "brake";
      this.stage = this.grounded ? "ground-settle" : "collecting";
      if (!this.groundDelivered) for (const k of ["x", "y", "z"]) {
        const pk = "p" + k, v = (f[k] - f[pk]) / dt, old = f[k], acc = clamp4(goal.acc[k] + 80 * (goal.p[k] - f[k]) + 18 * (goal.v[k] - v), -12e3, k === "y" ? 600 : 12e3);
        if (k === "y") {
          c.gravity = 600;
          c.tension = 600 - acc;
        }
        f[k] += v * dt + acc * dt * dt;
        f[pk] = old;
      }
      this.hand.x = hand.p.x;
      this.hand.y = hand.p.y;
      let speed = Math.hypot(f.x - f.px, f.y - f.py, f.z - f.pz) / dt;
      if (this.grounded || f.y >= GROUND_CENTER_Y) {
        if (this.groundContactAt === null) {
          this.groundContactAt = this.time;
          this.groundContactSpeed = speed;
        }
        f.y = GROUND_CENTER_Y;
        f.py = GROUND_CENTER_Y;
        this.grounded = true;
        speed = Math.hypot(f.x - f.px, f.z - f.pz) / dt;
      }
      const distance = Math.hypot(f.x - c.target.x, f.y - c.target.y, f.z - c.target.z);
      c.settle = this.grounded && distance < 2 && speed < 10 ? c.settle + dt : 0;
      if (c.settle >= 0.15 && c.releaseTime === void 0) {
        this.stanceGroundX = c.target.x;
        this.groundDelivered = true;
        this.groundSettled = true;
        this.settledAt = this.time;
        this.groundSettledAt = this.time;
        this.basketDelivered = true;
        this.collected = true;
        this.deliveredAt = this.time;
        this.controlledPlacement = true;
        c.deliveredAt = this.time;
        c.releaseTime = c.time;
        c.recoveryHand = __spreadValues({}, this.hand);
        c.recoveryAlignment = this.alignment;
        f.px = f.x;
        f.py = f.y;
        f.pz = f.z;
        this.impactSpeed = this.groundContactSpeed;
        this.recordImpact();
      }
      if (c.releaseTime !== void 0) {
        const u = Math.min(1, (c.time - c.releaseTime) / 0.65), e = u * u * (3 - 2 * u);
        this.alignment = c.recoveryAlignment;
        this.alignmentTarget = this.alignment;
        this.hand.x = c.recoveryHand.x + (READY_HAND.x + this.alignment - c.recoveryHand.x) * e;
        this.hand.y = c.recoveryHand.y + (READY_HAND.y - c.recoveryHand.y) * e;
        c.phase = "recover";
        this.stage = "returning";
      }
      loadedCloth(this, dt, c.releaseTime !== void 0);
      if (c.releaseTime !== void 0 && c.time - c.releaseTime >= 0.65) {
        this.success = true;
        this.finish("whole");
      }
    }
  };

  // source/camera.js
  var SCREEN = { width: 640, height: 600 };
  function cameraFor(sim2) {
    var _a, _b, _c;
    const width = ((_a = sim2.viewport) == null ? void 0 : _a.width) || SCREEN.width, height = ((_b = sim2.viewport) == null ? void 0 : _b.height) || SCREEN.height;
    const gravity = sim2.fruitGravity || 600, time = Math.max(0, sim2.time || 0);
    const fullTop = sim2.selectedFruitId || sim2.round === 0 ? CANOPY_TOP : -850;
    const origin = (_c = sim2.dropOriginY) != null ? _c : -850, u = Math.min(1, time / 0.8), ease2 = u * u * (3 - 2 * u);
    const followed = Math.min(500, fullTop + (origin - fullTop) * ease2 + 0.5 * gravity * time * time);
    const r = Math.max(0, Math.min(1, sim2.returnProgress || 0)), returnEase = r * r * (3 - 2 * r);
    const zoomFor = (fall) => Math.min(1.28, width / 500, (height - 140) / (550 - fall + 100));
    const followZoom = zoomFor(followed), fullZoom = zoomFor(fullTop);
    const zoom = r === 0 ? followZoom : r === 1 ? fullZoom : Math.exp(Math.log(followZoom) * (1 - returnEase) + Math.log(fullZoom) * returnEase);
    return { width, height, x: 330, y: 550 - (height / 2 - 70) / zoom, zoom };
  }
  function worldToScreen(p, c) {
    return { x: (c.width || 640) / 2 + (p.x - c.x) * c.zoom, y: (c.height || 600) / 2 + (p.y - c.y) * c.zoom };
  }

  // source/gesture.js
  var clamp5 = (v, a, b) => Math.max(a, Math.min(b, v));
  var HalfArcController = class {
    constructor(tuning = {}) {
      this.tuning = tuning;
      this.reset();
    }
    reset() {
      this.realTime = 0;
      this.realAccumulator = 0;
      this.autoCollect = true;
      this.releaseTime = null;
      this.upIntentAt = null;
      this.demo = false;
      this.active = false;
      this.completed = false;
      this.positioning = false;
      this.phase = "idle";
      this.aimWorld = 408;
      this.demoPointerX = 320;
      this.up = 0;
      this.maxUp = 0;
      this.down = 0;
      this.last = null;
      this.lastUp = -Infinity;
      this.lastDown = -Infinity;
      this.lastMove = 0;
      this.velocity = 0;
      this.castStart = null;
      this.castDue = null;
      this.intentSimTime = null;
      this.intentRejected = false;
      this.contactSeen = false;
      this.contactReal = null;
      this.firstDownReal = null;
      this.yieldProgress = 0;
      this.recovery = null;
      this.reversals = 0;
      this.load = 0;
      this.engaged = false;
      this.maxDown = 0;
      this.slowRemaining = 0;
      this.pending = [];
      this.anchor = null;
      this.history = [];
      this.filteredVelocity = 0;
    }
    begin(p, sim2) {
      const clock = this.realTime, acc = this.realAccumulator, demo = this.demo, pending = this.pending;
      this.reset();
      this.realTime = clock;
      this.realAccumulator = acc;
      this.demo = demo;
      this.pending = pending;
      this.active = true;
      this.positioning = true;
      this.phase = "ready";
      this.last = __spreadValues({}, p);
      this.lastMove = clock;
      this.aimWorld = 408 + sim2.alignmentTarget;
      sim2.setAlignment(this.aimWorld);
      sim2.demo = false;
    }
    observeContact(sim2) {
      if (!this.contactSeen && sim2.catchLocked) {
        this.contactSeen = true;
        this.contactReal = this.realTime;
        this.phase = "loaded";
        this.down = 0;
        this.maxDown = 0;
        this.velocity = 0;
        this.lastDown = -Infinity;
      }
    }
    move(p, sim2) {
      if (!this.active) return;
      this.observeContact(sim2);
      const dx = p.x - this.last.x;
      this.aimWorld = clamp5(this.aimWorld + dx / cameraFor(sim2).zoom, 338, 478);
      sim2.setAlignment(this.aimWorld);
      const dy = p.y - this.last.y, elapsed = Math.max(1 / 240, this.realTime - this.lastMove);
      this.last = __spreadValues({}, p);
      this.lastMove = this.realTime;
      if (sim2.collection || sim2.outcome) return;
      if (!this.contactSeen) {
        const priorUp = this.up;
        this.up = clamp5(this.up - dy, 0, 90);
        if (priorUp < 12 && this.up >= 12) {
          this.intentSimTime = sim2.time;
          this.intentRejected = false;
        }
        this.maxUp = Math.max(this.maxUp, this.up);
        if (dy < -0.01) this.lastUp = this.realTime;
      } else {
        this.down = clamp5(this.down + dy, 0, 160);
        this.maxDown = Math.max(this.maxDown, this.down);
        if (this.down >= 2 && this.firstDownReal === null) this.firstDownReal = this.realTime;
        this.velocity = dy / elapsed;
        if (dy > 0.01) this.lastDown = this.realTime;
        if (this.maxDown - this.down > 24 && this.velocity < -25) {
          this.reversals = 1;
          if (this.recovery) this.recovery = null;
        }
      }
    }
    queue(type, p, at = this.realTime) {
      this.pending.push({ type, p, at: Math.max(this.realTime, at) });
      this.pending.sort((a, b) => a.at - b.at);
    }
    processInput(sim2) {
      while (this.pending.length && this.pending[0].at <= this.realTime + 1e-9) {
        const e = this.pending.shift();
        if (e.type === "begin") {
          this.begin(e.p, sim2);
          this.anchor = e;
        } else if (e.type === "move") {
          this.move(e.p, sim2);
          this.anchor = e;
        } else if (e.type === "finish") {
          this.finish(sim2);
        } else {
          this.active = false;
          this.completed = false;
          this.positioning = false;
          this.phase = "released";
          this.releaseTime = this.realTime;
          sim2.cancel();
          this.anchor = null;
        }
      }
      const next = this.pending[0];
      if (this.active && this.anchor && (next == null ? void 0 : next.type) === "move" && next.at > this.anchor.at) {
        const u = clamp5((this.realTime - this.anchor.at) / (next.at - this.anchor.at), 0, 1);
        this.move({ x: this.anchor.p.x + (next.p.x - this.anchor.p.x) * u, y: this.anchor.p.y + (next.p.y - this.anchor.p.y) * u }, sim2);
      }
    }
    finish(sim2) {
      this.active = false;
      this.completed = this.castStart !== null || this.up >= 12 && this.realTime - this.lastUp < 0.5;
      this.positioning = true;
      this.phase = "released";
      this.releaseTime = this.realTime;
      this.anchor = null;
    }
    cancel(sim2) {
      this.releaseTime = this.realTime;
      this.pending = [];
      this.anchor = null;
      this.active = false;
      this.completed = false;
      this.positioning = false;
      this.demo = false;
      this.phase = "released";
      this.castDue = null;
      sim2.cancel();
    }
    timeScale(sim2) {
      this.observeContact(sim2);
      this.slowRemaining = 0;
      return 1;
    }
    update(sim2, dt) {
      var _a;
      if (!sim2.running || sim2.collection || sim2.outcome) return;
      if (this.positioning) sim2.target = castHand(sim2.time, this.castStart, sim2.alignment);
      if (!this.active && !this.completed) return;
      this.observeContact(sim2);
      if (this.castStart === null && this.castDue === null && this.realTime - this.lastUp > 0.5) this.up = 0;
      if (!sim2.inputOpen) {
        this.phase = "ready";
        return;
      }
      if (!this.contactSeen) {
        if (this.castStart === null) {
          const ready = castHand(sim2.time, null, sim2.alignment);
          sim2.target = ready;
        }
        if (this.castStart === null && this.up >= 12 && (this.castDue !== null || this.realTime - this.lastUp < 0.5)) {
          const profile = sim2.profile;
          if (profile && this.castDue === null && !this.intentRejected) {
            const floor = sim2.castTime(profile.timingAssistFloor), intent = (_a = this.intentSimTime) != null ? _a : sim2.time;
            if (intent < floor - profile.timingBuffer) this.intentRejected = true;
            else this.castDue = Math.max(intent, floor);
          }
          if (!profile || !this.intentRejected && this.castDue !== null && sim2.time >= this.castDue) {
            this.castStart = sim2.time;
            sim2.circleStart = sim2.time;
            sim2.circleCancelled = false;
            this.upIntentAt = this.realTime;
            this.phase = "casting";
          } else if (this.castDue !== null) this.phase = "armed";
        }
        if (this.castStart !== null) {
          const h = castHand(sim2.time, this.castStart, sim2.alignment);
          sim2.aim(h.x, h.y);
        }
      } else {
        this.engaged = !!(sim2.catchLocked || sim2.snags.length);
        this.load = this.engaged ? Math.min(1, Math.hypot(sim2.fruit.x - sim2.fruit.px, sim2.fruit.y - sim2.fruit.py, sim2.fruit.z - sim2.fruit.pz) / dt / 1200) : 0;
        this.phase = sim2.catchLocked ? "caught" : this.engaged ? "snagging" : "brushed";
      }
    }
    feedback(sim2) {
      if (sim2.outcome === "whole") return { kind: "whole", text: sim2.isDemoRound ? "\u793A\u8303\u5378\u529B \xB7 \u4E0D\u8BA1\u6536\u6210" : "\u5B8C\u6574\u843D\u5730 \xB7 +20" };
      if (sim2.catchLocked) return { kind: "caught", text: sim2.basketDelivered ? "\u677E\u5E03\u56DE\u4F4D" : "\u4E0A\u7529\u9ECF\u4F4F \xB7 \u987A\u52BF\u5378\u529B" };
      if (sim2.outcome) {
        if (!this.castStart) return { kind: "no-cast", text: this.maxUp >= 12 ? "\u7529\u5F97\u592A\u65E9\u4E86 \xB7 \u7B49\u63D0\u793A\u4EAE\u8D77\u518D\u5411\u4E0A\u7529" : "\u8FD8\u6CA1\u7529\u5F00\u5E03 \xB7 \u5411\u4E0A\u6ED1\u4E00\u5C0F\u6BB5" };
        if (sim2.contactTime !== null) return { kind: "brushed", text: "\u64E6\u8FC7\u5E03\u9762\u4F46\u6CA1\u9ECF\u4F4F \xB7 \u518D\u8BD5\u4E00\u9897" };
        return { kind: "missed", text: this.castStart > 1.68 ? "\u7529\u665A\u4E86\uFF0C\u679C\u5B50\u5DF2\u51B2\u8FC7 \xB7 \u7A0D\u65E9\u4E00\u70B9\u7529" : "\u5E03\u6CA1\u8FCE\u4E0A\u843D\u679C \xB7 \u770B\u51C6\u5F27\u7EBF\u518D\u7529" };
      }
      if (this.releaseTime !== null) return { kind: "released", text: this.completed ? "\u5DF2\u677E\u624B \xB7 \u524D\u515C\u7EE7\u7EED\uFF0C\u9ECF\u4F4F\u540E\u81EA\u52A8\u5378\u529B" : this.positioning ? "\u4F4D\u7F6E\u5DF2\u9009\u5B9A \xB7 \u8FD1\u8EAB\u65F6\u5411\u4E0A\u8F7B\u515C" : "\u64CD\u4F5C\u5DF2\u4E2D\u65AD \xB7 \u53EF\u91CD\u65B0\u5BF9\u4F4D\u524D\u515C" };
      return { kind: sim2.inputOpen ? "cast" : "prepare", text: sim2.inputOpen ? "\u5DE6\u53F3\u5224\u65AD\u843D\u70B9 \xB7 \u5230\u8DDF\u524D\u5411\u4E0A\u8F7B\u515C" : "\u5DE6\u53F3\u62D6\u52A8\u5BF9\u51C6\u843D\u70B9 \xB7 \u8FD1\u8EAB\u65F6\u5411\u4E0A\u8F7B\u515C" };
    }
    advance(sim2, realDt, baseScale = 1) {
      this.realAccumulator += Math.min(realDt, 0.1);
      while (this.realAccumulator + 1e-10 >= STEP) {
        const d = STEP;
        this.realAccumulator = Math.max(0, this.realAccumulator - STEP);
        this.realTime += d;
        this.processInput(sim2);
        if (this.demo && sim2.running && !sim2.collection) {
          if (!this.active && sim2.time >= 0.7) {
            this.demoPointerX = worldToScreen({ x: sim2.landingX, y: 0 }, cameraFor(sim2)).x;
            const x = this.demoPointerX;
            this.begin({ x, y: 400 }, sim2);
            this.demoPointerX = x + (sim2.landingX - this.aimWorld) * cameraFor(sim2).zoom;
          }
          if (this.active) {
            this.observeContact(sim2);
            const y = this.contactSeen ? 330 : 400 - 70 * clamp5((sim2.time - sim2.castTime(1.82)) / 0.12, 0, 1);
            this.move({ x: this.demoPointerX, y }, sim2);
          }
        }
        const reactionScale = this.timeScale(sim2), approachScale = baseScale;
        sim2.advance(d * approachScale * reactionScale);
        if (this.autoCollect && sim2.collectReady && !sim2.collection && !sim2.outcome) {
          const proof = { at: sim2.time, heldTime: sim2.heldTime, supported: sim2.supported, yielded: sim2.yielded, fruit: __spreadValues({}, sim2.fruit) };
          if (sim2.requestCollect()) {
            sim2.collection.proof = proof;
            sim2.collection.automatic = true;
          }
        }
      }
    }
  };

  // source/app.js
  var canvas = document.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var sim = new Study({ seed: freshSeed(), adaptive: true });
  var sound = new ClothAudio();
  window.clothSound = sound;
  window.artReady = Promise.resolve([]);
  window.study = sim;
  var controller = new HalfArcController();
  window.gesture = controller;
  var session = new SurvivalSession();
  window.survival = session;
  var runActive = false;
  var harvestLoop = new HarvestLoop();
  window.harvestLoop = harvestLoop;
  var focused = true;
  var paused = false;
  var coinSeen = 0;
  var coinFloats = [];
  var injuryAt = null;
  var coinSparkUntil = -1;
  var coinLossAt = null;
  var resultAt = null;
  var returnDuration = 1;
  var slow = false;
  var mesh = false;
  var drag = null;
  var last = 0;
  var visualTime = 0;
  var impactAt = null;
  var impactPoint = null;
  var lastOutcome = null;
  var heardRound = null;
  var groundHeardRound = null;
  var arcTrace = [];
  var $ = (s) => document.querySelector(s);
  var P = (p) => ({ x: p.x + (p.z || 0) * 0.48, y: p.y - (p.z || 0) * 0.24 });
  function line(points, color, width) {
    ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (width >= 8) {
      ctx.strokeStyle = "#173e3a";
      ctx.lineWidth = width + 3.5;
      ctx.stroke();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  function ellipse(x, y, rx, ry, c, angle = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), angle, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
    if (rx > 12 && ry > 9) {
      ctx.strokeStyle = "#173e3a";
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
  }
  function poly(points, c) {
    ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
  }
  function background() {
    drawOrchard(ctx, sim, "back");
  }
  function basket() {
    var _a;
    const x = 146, y = 532;
    ellipse(x + 42, y + 14, 58, 9, "rgba(143,157,115,0.27058823529411763)");
    poly([{ x: x - 3, y: y - 21 }, { x: x + 89, y: y - 21 }, { x: x + 82, y: y + 14 }, { x: x + 4, y: y + 14 }], "#96764b");
    for (let j = 0; j < 4; j++) line([{ x, y: y - 15 + j * 8 }, { x: x + 86, y: y - 15 + j * 8 }], "#b99b68", 3);
    for (let i = 0; i < 9; i++) line([{ x: x + i * 10, y: y - 20 }, { x: x + 5 + i * 8, y: y + 13 }], "#745b3b", 1);
    line([{ x: x - 4, y: y - 21 }, { x: x + 91, y: y - 21 }], "#c4ac77", 4);
    let n = Math.min(3, Math.max(0, Math.max(0, (((_a = sim.totals) == null ? void 0 : _a.whole) || 0) - (sim.groundDelivered && sim.credited && !sim.isDemoRound ? 1 : 0)) + (sim.basketDelivered && !sim.groundDelivered && (!sim.credited || sim.isDemoRound) ? 1 : 0)));
    for (let i = 0; i < n; i++) drawFruitAt({ x: x + 20 + i * 24, y: y - 18, z: 0 }, 0.55);
  }
  function trail() {
    if (sim.contactTime !== null || !sim.running || sim.outcome) return;
    let vy = (sim.fruit.y - sim.fruit.py) * 240;
    if (vy < 230) return;
    let f = P(sim.fruit), length = Math.min(95, vy * 0.065);
    for (let i = -1; i <= 1; i++) line([{ x: f.x + i * 26, y: f.y - 35 }, { x: f.x + i * 26, y: f.y - 35 - length * (i === 0 ? 1 : 0.7) }], "rgba(234,240,219,0.5803921568627451)", i === 0 ? 3 : 1.5);
  }
  function debris() {
    if (!impactPoint) return;
    const tier = sim.impactTier || (sim.outcome === "smashed" ? "shattered" : "partial"), t = Math.max(0, visualTime - impactAt), p = impactPoint;
    if (tier === "intact") {
      if (t > 1.1) return;
      ctx.save();
      ctx.globalAlpha = (1 - t / 1.1) * 0.45;
      for (let i = 0; i < 5; i++) {
        const x = p.x + (i - 2) * (6 + t * 10);
        ellipse(x, 550 - i % 2 * 2, 5 + t * 5, 2 + t * 2, "#9a6335");
      }
      ctx.restore();
      return;
    }
    const severe = tier === "shattered", speed = sim.impactSpeed || 0, spread = severe ? 120 + Math.min(60, Math.max(0, (speed - 650) * 0.1)) : 25 + Math.min(15, speed / 30), open = 1 - Math.exp(-t * 3.5), pulpVisible = !severe && !sim.eaten;
    if (severe) {
      ctx.save();
      ctx.globalAlpha = 0.24;
      for (let i = 0; i < 15; i++) {
        const u = (i - 7) * spread * 0.1 * open;
        line([{ x: p.x + u, y: 550 + i % 3 }, { x: p.x + u + 5 + i % 4 * 2, y: 549 + i % 2 }], "#d8a033", 1.6);
      }
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = Math.max(0.1, 0.48 - t * 0.2);
      for (let i = 0; i < 19; i++) {
        let k = i * 2.399, r = (0.3 + i % 8 / 10) * spread, x = p.x + Math.cos(k) * r * open, y = 548 - Math.max(0, Math.sin(Math.min(1, t * 1.5) * Math.PI)) * (10 + i % 5 * 9);
        ellipse(x, y, 2 + i % 3, 1.3 + i % 2, "#9a6335");
      }
      ctx.restore();
    }
    const count = severe ? 12 : 2 + Math.min(2, Math.floor(speed / 250));
    for (let i = 0; i < count; i++) {
      const k = severe && i < 2 ? i * Math.PI : i * 2.399, r = severe ? i < 2 ? spread : spread * (0.72 + 0.28 * (i % 4) / 3) : spread * (0.65 + 0.35 * (i % 3) / 2), x = p.x + Math.cos(k) * r * open, flight = Math.min(1, t / (severe ? 0.7 : 0.48)), jump = 4 * flight * (1 - flight) * (severe ? 40 + i * 17 % 55 : 13 + i * 7 % 14), y = 540 - Math.abs(Math.sin(k)) * 8 - jump;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(k * 0.7 + Math.min(t, severe ? 0.9 : 0.6) * (i % 2 ? 2 : -1.8));
      const z = severe ? 0.45 + i % 4 * 0.11 : 0.95;
      ctx.scale(z, z);
      ctx.beginPath();
      ctx.moveTo(-19, 3);
      ctx.quadraticCurveTo(-17, -12, -5, -18);
      ctx.lineTo(-2, -24);
      ctx.lineTo(2, -18);
      ctx.lineTo(9, -24);
      ctx.lineTo(10, -16);
      ctx.lineTo(18, -18);
      ctx.lineTo(15, -10);
      ctx.lineTo(23, -9);
      ctx.lineTo(17, -3);
      ctx.lineTo(21, 3);
      ctx.quadraticCurveTo(7, 16, -7, 12);
      ctx.quadraticCurveTo(-16, 9, -19, 3);
      ctx.fillStyle = i % 2 ? "#173e3a" : "#216356";
      ctx.fill();
      ctx.strokeStyle = "#173e3a";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.save();
      ctx.clip();
      for (let j = 0; j < 9; j++) {
        const hx = -19 + j * 5;
        line([{ x: hx - 7, y: 10 }, { x: hx + 4, y: -19 }], "#d8a033", 1.7);
        line([{ x: hx - 8, y: 12 }, { x: hx + 2, y: -17 }], "#76906c", 0.55);
      }
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(-15, 3);
      ctx.quadraticCurveTo(-9, -2, -1, -6);
      ctx.quadraticCurveTo(9, -8, 17, 1);
      ctx.quadraticCurveTo(8, 11, -5, 9);
      ctx.quadraticCurveTo(-11, 8, -15, 3);
      ctx.fillStyle = "#f1dfb5";
      ctx.fill();
      if (!severe) {
        ctx.beginPath();
        ctx.moveTo(-10, 3);
        ctx.quadraticCurveTo(1, -3, 11, 2);
        ctx.strokeStyle = "#eee0aa";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore();
    }
    if (pulpVisible) {
      ctx.save();
      ctx.translate(p.x, 548);
      ctx.beginPath();
      ctx.moveTo(-spread, 0);
      ctx.bezierCurveTo(-spread - 5, -5, -spread * 0.55, -10, -spread * 0.3, -7);
      ctx.bezierCurveTo(-spread * 0.1, -12, spread * 0.2, -8, spread * 0.4, -7);
      ctx.bezierCurveTo(spread * 0.7, -11, spread + 5, -4, spread, 1);
      ctx.bezierCurveTo(spread * 0.7, 7, spread * 0.3, 4, spread * 0.15, 7);
      ctx.bezierCurveTo(-spread * 0.2, 10, -spread * 0.6, 4, -spread, 0);
      ctx.fillStyle = "rgba(216,191,120,0.6588235294117647)";
      ctx.fill();
      ctx.restore();
      for (let i = 0; i < (sim.pulpCount || 1); i++) {
        let k = i * 2.399, x = p.x + (i - ((sim.pulpCount || 1) - 1) / 2) * 27 * open, jump = Math.max(0, Math.sin(Math.min(1, t * 2) * Math.PI)) * (12 + i * 5), y = 552 - jump + i % 2 * 3;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(k) * 0.4);
        let w = 11;
        ctx.beginPath();
        ctx.moveTo(-w, 1);
        ctx.bezierCurveTo(-w - 3, -9, -4, -14, 2, -10);
        ctx.bezierCurveTo(w * 0.6, -14, w + 5, -5, w, 2);
        ctx.bezierCurveTo(w - 3, 8, -w + 3, 9, -w, 1);
        ctx.fillStyle = i % 2 ? "#e8bb50" : "#f1dfb5";
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-w * 0.55, -3);
        ctx.bezierCurveTo(-1, -8, w * 0.45, -8, w * 0.63, -3);
        ctx.strokeStyle = "#fff0c7";
        ctx.lineWidth = 2;
        ctx.stroke();
        for (let j = 0; j < 4; j++) {
          const u = -w * 0.55 + j * w * 0.32;
          ctx.beginPath();
          ctx.moveTo(u, 4);
          ctx.quadraticCurveTo(u - 3, -1, u + 1, -6);
          ctx.strokeStyle = j % 2 ? "#9a6335" : "#fff0c7";
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }
  function person() {
    var _a, _b, _c, _d;
    const old = person.motion, dt = old ? sim.time - old.time : 0;
    let vx = 0, vy = 0;
    if (old && dt > 0 && dt < 0.2) {
      const a = 1 - Math.exp(-dt / 0.07);
      vx = old.vx + ((sim.hand.x - old.x) / dt - old.vx) * a;
      vy = old.vy + ((sim.hand.y - old.y) / dt - old.vy) * a;
    } else if (old && dt === 0) {
      vx = old.vx;
      vy = old.vy;
    }
    const av = old && dt > 0 && dt < 0.2 ? (sim.alignment - (old.alignment || 0)) / dt : 0;
    person.motion = { time: sim.time, x: sim.hand.x, y: sim.hand.y, vx, vy, alignment: sim.alignment };
    const pose = catcherPose(sim.hand, !!sim.collection, { time: sim.time, catchAge: sim.contactTime === null ? -1 : sim.time - sim.contactTime, handVelocity: { x: vx, y: vy }, collectionProgress: ((_a = sim.collection) == null ? void 0 : _a.time) || 0, recoveryProgress: ((_b = sim.collection) == null ? void 0 : _b.releaseTime) === void 0 ? 0 : Math.min(1, (sim.collection.time - sim.collection.releaseTime) / 0.65), catchLocked: !!sim.catchLocked, circle: true, alignment: sim.alignment, alignmentVelocity: av }), { hip, shoulder, head, arms, knees, feet } = pose;
    const hurt = injuryAt !== null ? Math.max(0, 1 - (visualTime - injuryAt) / 0.65) : 0;
    ctx.save();
    if (hurt) ctx.translate(Math.sin((1 - hurt) * 25) * hurt * 3, 0);
    pose.hurtCompression = hurt;
    pose.catchJoy = sim.catchLocked ? Math.min(1, Math.max(0, (sim.time - ((_d = (_c = sim.catchProof) == null ? void 0 : _c.at) != null ? _d : sim.time) - 0.12) / 0.18)) : 0;
    drawCharacter(ctx, pose);
    if (hurt) {
      ctx.globalAlpha = hurt;
      line([{ x: pose.head.x - 20, y: pose.head.y - 18 }, { x: pose.head.x - 27, y: pose.head.y - 25 }], "#cb472a", 3);
      line([{ x: pose.head.x + 20, y: pose.head.y - 18 }, { x: pose.head.x + 27, y: pose.head.y - 25 }], "#cb472a", 3);
    }
    ctx.restore();
  }
  function drawFruitAt(obj = sim.fruit, small = 1) {
    drawFruit(ctx, P(obj), small);
  }
  function cloth(front, layer) {
    clothMesh(front, layer);
  }
  function clothMesh(front, layer) {
    for (let j = 0; j < 11; j++) for (let i = 0; i < 8; i++) {
      let ns = [sim.nodes[j * 9 + i], sim.nodes[j * 9 + i + 1], sim.nodes[(j + 1) * 9 + i + 1], sim.nodes[(j + 1) * 9 + i]], z = ns.reduce((a, n) => a + n.z, 0) / 4;
      if (z >= sim.fruit.z !== front || layer === "behind" && z >= 0 || layer === "front" && z < 0) continue;
      let ps = ns.map(P);
      drawClothPanel(ctx, ps, ns, mesh);
    }
    for (let row of [0, 11]) {
      let ns = sim.nodes.slice(row * 9, row * 9 + 9);
      if (ns[4].z >= sim.fruit.z === front && !(layer === "behind" && ns[4].z >= 0 || layer === "front" && ns[4].z < 0)) {
        drawClothEdge(ctx, ns.map(P), row);
      }
    }
  }
  function actionInk() {
    if (runActive && !guided && !sim.catchLocked && sim.inputOpen) {
      ctx.save();
      ctx.strokeStyle = "rgba(203,71,42,.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(408 + sim.alignment, 350, 54, 72, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (arcTrace.length > 1) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      line(arcTrace.map((p) => ({ x: p.x, y: p.y })), "#cb472a", 2);
      ctx.restore();
    }
  }
  function paperGrain() {
    var _a;
    ctx.save();
    ctx.strokeStyle = "#173e3a";
    ctx.globalAlpha = 0.065;
    ctx.lineWidth = 0.55;
    for (let i = 0; i < 160; i++) {
      let x = i * 167.3 % 640, y = i * 71.9 % (((_a = sim.viewport) == null ? void 0 : _a.height) || 600);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 3 + i % 6, y - 0.6);
      ctx.stroke();
    }
    ctx.restore();
  }
  var guided = false;
  function ui() {
    $(".coins").setAttribute("data-reward", String(visualTime < coinSparkUntil));
    $("#coin-count").textContent = String(session.coins);
    const lossAge = coinLossAt === null ? 99 : visualTime - coinLossAt, lossActive = lossAge < 0.85;
    $("#coin-count").style.transform = lossActive ? "translateY(" + -Math.sin(Math.min(1, lossAge / 0.5) * Math.PI) * 5 + "px) scale(" + (1 + Math.sin(Math.min(1, lossAge / 0.5) * Math.PI) * 0.25) + ")" : "none";
    $("#coin-count").style.color = lossActive ? "#b73727" : "";
    const lost = $("#coin-loss");
    lost.hidden = !lossActive;
    lost.style.opacity = String(Math.max(0, 1 - lossAge / 0.85));
    lost.style.transform = "translate(" + (10 + lossAge * 22) + "px," + lossAge * 40 + "px) rotate(" + lossAge * 260 + "deg) scale(" + Math.max(0.2, 1 - lossAge * 0.7) + ")";
    $("#whole-count").textContent = String(session.totals.whole);
    $("#crop-count").textContent = String(session.settled) + "/20";
    const hp = session.health;
    $("#hearts").innerHTML = [0, 1, 2].map((i) => {
      const f = Math.max(0, Math.min(2, hp - i * 2)) / 2;
      return '<svg class="drop" viewBox="0 0 16 22" aria-hidden="true"><defs><clipPath id="blood-' + i + '"><rect x="0" y="' + (22 - 22 * f) + '" width="16" height="' + 22 * f + '"/></clipPath></defs><path d="M8 1C6 5 1 10 1 14a7 7 0 0014 0C15 10 10 5 8 1Z" fill="none" stroke="#87928b" stroke-width="1.5"/><path d="M8 1C6 5 1 10 1 14a7 7 0 0014 0C15 10 10 5 8 1Z" fill="#b73727" clip-path="url(#blood-' + i + ')"/></svg>';
    }).join("");
    $("#hearts").setAttribute("aria-label", "\u5269\u4F59\u751F\u547D " + hp / 2 + " \u6EF4");
    $("#best").textContent = session.best ? "\u6700\u4F73\u51C0\u8D5A " + session.best.coins + " \u91D1\u5E01" : "";
    $("#best").hidden = !session.gameOver;
    $("#share").hidden = !session.gameOver;
    $("#share-status").hidden = !session.gameOver;
    $("#result").hidden = !session.gameOver;
    $("#result").textContent = "\u63A5\u4F4F " + session.totals.whole + " \xB7 \u6454\u788E " + session.totals.smashed + " \xB7 \u88AB\u7838 " + session.injuryRounds.size + " \xB7 \u51C0\u8D5A " + session.coins + " \u91D1\u5E01";
    $("#guide").hidden = guided || session.gameOver;
    $("#guide").textContent = runActive ? sim.inputOpen ? "\u73B0\u5728\u5411\u4E0A\u7529\uFF0C\u5E03\u7C98\u4F4F\u69B4\u83B2" : "\u6A2A\u6ED1\u79FB\u52A8 \xB7 \u7B49\u69B4\u83B2\u8FDB\u5165\u63A5\u53D6\u533A" : "\u5DE6\u53F3\u6A2A\u6ED1\u79FB\u52A8\uFF1B\u69B4\u83B2\u8FDB\u5165\u63A5\u53D6\u533A\u65F6\uFF0C\u5411\u4E0A\u7529\u5E03";
    $("#start").hidden = runActive && !session.gameOver;
    $("#start").textContent = session.gameOver ? "\u518D\u6765\u4E00\u5C40" : "\u5F00\u59CB\u91C7\u6458";
    $("#pause").disabled = !runActive || session.gameOver;
    $("#pause").setAttribute("aria-label", paused ? "\u7EE7\u7EED" : "\u6682\u505C");
    $("#pause").textContent = paused ? "\u25B6" : "\u2161";
    $("#sound").textContent = sound.muted ? "\u266B\u0338" : "\u266B";
    $("#sound").setAttribute("aria-label", sound.muted ? "\u5F00\u542F\u58F0\u97F3" : "\u5173\u95ED\u58F0\u97F3");
    if (sim.catchLocked) guided = true;
  }
  function draw() {
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const viewport = syncViewport(), scale = w / viewport.width, offsetX = 0, offsetY = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#f1dfb5";
    ctx.fillRect(0, 0, w, h);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    const cam = cameraFor(sim);
    ctx.save();
    ctx.translate(cam.width / 2, cam.height / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
    background();
    basket();
    trail();
    cloth(false, "behind");
    if (sim.round > 0 && sim.fruit.z < 0 && ((!sim.basketDelivered || sim.groundDelivered) && (!sim.outcome || sim.outcome === "whole"))) drawFruitAt();
    cloth(true, "behind");
    person();
    cloth(false, "front");
    if (sim.round > 0 && sim.fruit.z >= 0 && ((!sim.basketDelivered || sim.groundDelivered) && (!sim.outcome || sim.outcome === "whole"))) drawFruitAt();
    cloth(true, "front");
    if (sim.impactTier === "intact" || sim.outcome === "pulp" || sim.outcome === "smashed") debris();
    actionInk();
    if (sim.running && !sim.collection && !sim.outcome) {
      const aim = 408 + sim.alignment;
      line([{ x: aim - 14, y: 548 }, { x: aim + 14, y: 548 }], controller.phase === "armed" ? "#216356" : "#cb472a", controller.phase === "armed" ? 4 : 2);
      line([{ x: aim, y: 543 }, { x: aim, y: 552 }], "#cb472a", 2);
    }
    drawOrchard(ctx, sim, "front");
    ctx.restore();
    paperGrain();
    coinFloats = coinFloats.filter((e) => visualTime - e.at < 1.2);
    for (let i = 0; i < coinFloats.length; i++) {
      const e = coinFloats[i], age = visualTime - e.at;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - age / 1.2);
      ctx.font = "bold " + (e.amount < 0 ? 34 : 26) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = e.amount < 0 ? "#b43727" : "#276348";
      ctx.fillText((e.amount > 0 ? "+" : "") + e.amount, 320 + (i - (coinFloats.length - 1) / 2) * 65, (session.gameOver ? 260 : 85) - age * 30);
      if (e.amount < 0) {
        ctx.save();
        ctx.translate(350 + age * 32, (session.gameOver ? 255 : 80) + age * 44);
        ctx.rotate(age * 4);
        ctx.scale(Math.max(0.2, 1 - age * 0.65), Math.max(0.2, 1 - age * 0.65));
        ctx.fillStyle = "#d8a033";
        ctx.strokeStyle = "#9a6335";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#f1dfb5";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("\u2212", 0, 4);
        ctx.restore();
      }
      ctx.restore();
    }
    if (session.gameOver) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#f1dfb5";
      ctx.fillRect(0, 0, w, 96 * dpr);
      ctx.fillStyle = "#173e3a";
      ctx.textAlign = "center";
      ctx.font = "bold " + 25 * dpr + "px sans-serif";
      ctx.fillText("\u69B4\u83B2\u523A\u5BA2", w / 2, 37 * dpr);
      ctx.font = Math.min(16, (w / dpr - 24) / 26) * dpr + "px sans-serif";
      ctx.fillText("\u63A5\u4F4F " + session.totals.whole + " \xB7 \u6454\u788E " + session.totals.smashed + " \xB7 \u88AB\u7838 " + session.injuryRounds.size + " \xB7 \u51C0\u8D5A " + session.coins + " \u91D1\u5E01", w / 2, 72 * dpr);
      ctx.restore();
    }
    ui();
  }
  var raf = 0;
  function frame(t) {
    var _a, _b, _c, _d, _e, _f, _g;
    raf = 0;
    if (document.hidden) return;
    syncViewport();
    const dt = last ? Math.min((t - last) / 1e3, 0.1) : 0;
    last = t;
    if (!document.hidden && focused && !paused) {
      const elapsed = dt * (slow ? 0.35 : 1);
      visualTime += elapsed;
      controller.advance(sim, dt, slow ? 0.35 : 1);
      if (sim.catchLocked && heardRound !== sim.round) {
        heardRound = sim.round;
        sound.snap(sim.round);
        (_a = sound.effort) == null ? void 0 : _a.call(sound, sim.round);
      }
      if (sim.groundContactAt != null && groundHeardRound !== sim.round) {
        groundHeardRound = sim.round;
        (_b = sound.impact) == null ? void 0 : _b.call(sound, sim.round, "intact", sim.groundContactSpeed || 0);
      }
      if (sim.running && !sim.collection && ["casting", "yielding"].includes(controller.phase)) arcTrace.push(__spreadProps(__spreadValues({}, P(__spreadProps(__spreadValues({}, sim.hand), { z: 0 }))), { t: visualTime }));
      arcTrace = arcTrace.filter((p) => visualTime - p.t < 0.34).slice(-25);
      if (impactAt === null && (sim.bounce || sim.outcome === "pulp" || sim.outcome === "smashed")) {
        impactAt = visualTime;
        impactPoint = P(sim.fruit);
        (_c = sound.impact) == null ? void 0 : _c.call(sound, sim.round, sim.impactTier || "shattered", sim.impactSpeed);
      }
      if (sim.outcome !== lastOutcome) {
        lastOutcome = sim.outcome;
        if (sim.outcome) {
          resultAt = visualTime;
          returnDuration = Math.max(0.2, harvestLoop.remaining - 0.12);
        }
      }
      if (sim.outcome && resultAt !== null && !session.gameOver) sim.returnProgress = Math.min(1, Math.max(0, (visualTime - resultAt - 0.1) / returnDuration));
      const state = session.observe(sim);
      sim.coins = session.coins;
      for (const e of sim.coinEvents || []) {
        if (e.id > coinSeen) {
          coinSeen = e.id;
          coinFloats.push({ amount: e.amount, at: visualTime });
          if (e.amount < 0) coinLossAt = visualTime;
          (_d = sound.coin) == null ? void 0 : _d.call(sound, e.id, e.amount);
          if (e.amount > 0) {
            coinSparkUntil = visualTime + 0.7;
            (_f = (_e = $(".coins")).animate) == null ? void 0 : _f.call(_e, [{ transform: "scale(1)" }, { transform: "scale(1.2)", color: "#bb7813" }, { transform: "scale(1)" }], { duration: 620, easing: "ease-out" });
          }
        }
      }
      if (sim.injury && injuryAt === null) {
        injuryAt = visualTime;
        (_g = sound.hurt) == null ? void 0 : _g.call(sound, sim.round);
      }
      if (session.gameOver) {
        if (runActive) release();
        harvestLoop.stop();
        sim.running = false;
        runActive = false;
      } else if (session.canStartFruit) harvestLoop.advance(sim, elapsed, start);
    }
    draw();
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  function start(demo) {
    if (!session.fruitStarted()) return;
    focused = true;
    paused = false;
    $("#pause").textContent = "\u2161";
    release();
    sound.reset();
    sim.start(demo);
    sim.demo = false;
    controller.reset();
    controller.demo = demo;
    sim.controller = controller;
    impactAt = null;
    impactPoint = null;
    lastOutcome = null;
    arcTrace = [];
    injuryAt = null;
    resultAt = null;
    sim.returnProgress = 0;
  }
  function startRun(demo = false) {
    release();
    sim.resetTotals();
    sim.round = 0;
    session.start({ demo });
    $("#share-status").textContent = "";
    runActive = true;
    coinFloats = [];
    coinLossAt = null;
    harvestLoop.begin();
    start(demo);
    harvestLoop.fruitStarted(sim);
  }
  function eventClock(e) {
    return controller.realTime + (last ? Math.max(0, Math.min(0.1, ((e.timeStamp || last) - last) / 1e3)) : 0);
  }
  function syncViewport() {
    const r = canvas.getBoundingClientRect();
    sim.viewport = { width: 640, height: 640 * Math.max(1, r.height) / Math.max(1, r.width) };
    return sim.viewport;
  }
  function screen(e) {
    const r = canvas.getBoundingClientRect();
    syncViewport();
    const k = 640 / Math.max(1, r.width);
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
  }
  canvas.addEventListener("pointerdown", (e) => {
    if (!runActive || session.gameOver || session.dying || paused || e.button !== 0 || !e.isPrimary || drag || sim.catchLocked) return;
    sound.unlock();
    if (!sim.running) return;
    drag = { id: e.pointerId };
    controller.demo = false;
    controller.queue("begin", screen(e), eventClock(e));
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const samples = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
    for (const sample of samples) controller.queue("move", screen(sample), eventClock(sample));
    if (!samples.length || samples[samples.length - 1].timeStamp !== e.timeStamp) controller.queue("move", screen(e), eventClock(e));
  });
  function release(e) {
    if (!drag && controller.demo && e && ["blur", "resize", "visibility"].includes(e.type)) return;
    const pointer = e && e.pointerId !== void 0;
    if (pointer && (!drag || e.pointerId !== drag.id)) return;
    if (drag) {
      const id = drag.id;
      drag = null;
      if (canvas.hasPointerCapture && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    }
    if (e && (e.type === "pointerup" || e.type === "pointercancel") && Number.isFinite(e.timeStamp)) controller.queue(e.type === "pointerup" ? "finish" : "cancel", null, eventClock(e));
    else controller.cancel(sim);
  }
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("lostpointercapture", release);
  window.addEventListener("blur", release);
  window.addEventListener("resize", release);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      release({ type: "visibility" });
      sound.pause();
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (!raf) {
      raf = requestAnimationFrame(frame);
    }
    last = 0;
  });
  $("#pause").onclick = () => {
    paused = !paused;
    $("#pause").textContent = paused ? "\u25B6" : "\u2161";
    last = 0;
    if (paused) {
      release();
      sound.pause();
    } else sound.unlock();
  };
  $("#start").onclick = () => {
    sound.unlock();
    if (!runActive || session.demo || session.gameOver) startRun(false);
  };
  $("#demo").onclick = () => {
    sound.unlock();
    startRun(true);
  };
  $("#eat").onclick = () => sim.eat();
  $("#reset-totals").onclick = () => {
    if (!runActive || session.gameOver) startRun(false);
  };
  $("#slow").onclick = (e) => {
    sound.unlock();
    slow = !slow;
    e.currentTarget.setAttribute("aria-pressed", String(slow));
    e.currentTarget.textContent = slow ? "\u901F\u5EA6 0.35\xD7" : "\u901F\u5EA6 1\xD7";
  };
  $("#sound").onclick = (e) => {
    sound.setMuted(!sound.muted);
    e.currentTarget.setAttribute("aria-pressed", String(sound.muted));
    e.currentTarget.textContent = sound.muted ? "\u266B\u0338" : "\u266B";
    e.currentTarget.setAttribute("aria-label", sound.muted ? "\u5F00\u542F\u58F0\u97F3" : "\u5173\u95ED\u58F0\u97F3");
    if (!sound.muted) sound.unlock();
  };
  window.addEventListener("blur", () => {
    focused = false;
    last = 0;
    sound.pause();
  });
  window.addEventListener("focus", () => {
    focused = true;
    last = 0;
  });
})();
