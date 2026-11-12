const DATA_TIMEOUT = 2500;
const PERMISSION_TIMEOUT = 8000;
const TILT_RANGE = 18;
const FLAT_ANGLE = 10;
const RAD = Math.PI / 180;
const clamp = value => Math.max(-1, Math.min(1, value));
const normalized = radians => {
  const value = clamp(radians / (TILT_RANGE * RAD));
  return Math.abs(value) < 1e-10 ? 0 : value;
};

// Both APIs use the device's natural axes. Positive Z points out of the screen.
// https://www.w3.org/TR/orientation-event/#device-orientation-model
function upwardVector(event) {
  if (Number.isFinite(event?.beta) && Number.isFinite(event?.gamma)) {
    if (Math.abs(event.beta) > 180 || Math.abs(event.gamma) > 90) return null;
    const beta = event.beta * RAD, gamma = event.gamma * RAD;
    return {x: -Math.cos(beta) * Math.sin(gamma), y: Math.sin(beta), z: Math.cos(beta) * Math.cos(gamma)};
  }
  const a = event?.accelerationIncludingGravity;
  if (!a || ![a.x, a.y, a.z].every(Number.isFinite)) return null;
  let {x, y, z} = a;
  // When provided, remove actual movement before estimating the vertical.
  const movement = event.acceleration;
  if (movement && [movement.x, movement.y, movement.z].every(Number.isFinite)) {
    x -= movement.x; y -= movement.y; z -= movement.z;
  }
  const length = Math.hypot(x, y, z);
  // Ignore missing gravity, free fall, and large acceleration spikes.
  if (length < 7 || length > 12.5) return null;
  return {x: x / length, y: y / length, z: z / length};
}

function browserEnvironment() {
  const win = globalThis.window, doc = win?.document;
  // Prefer the gravity-referenced orientation API. Motion is a fallback on
  // devices exposing only an accelerometer, not a second permission prompt.
  const kind = win?.DeviceOrientationEvent ? 'deviceorientation' : 'devicemotion';
  const api = kind === 'deviceorientation' ? win?.DeviceOrientationEvent : win?.DeviceMotionEvent;
  return {
    supported: () => !!(win?.isSecureContext && api && win.addEventListener),
    requestPermission: () => typeof api?.requestPermission === 'function' ? api.requestPermission() : 'granted',
    now: () => globalThis.performance?.now() ?? Date.now(),
    add: listener => win.addEventListener(kind, listener),
    remove: listener => win.removeEventListener(kind, listener),
    screenAngle: () => win?.screen?.orientation?.angle ?? win?.orientation ?? 0,
    hidden: () => !!doc?.hidden,
    subscribeVisibility(listener) {
      const visibility = () => listener(!!doc.hidden);
      const pagehide = () => listener(true);
      doc?.addEventListener('visibilitychange', visibility);
      win?.addEventListener('pagehide', pagehide);
      return () => {
        doc?.removeEventListener('visibilitychange', visibility);
        win?.removeEventListener('pagehide', pagehide);
      };
    },
    setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
    clearTimeout: timer => globalThis.clearTimeout(timer)
  };
}

/**
 * Default browser use: createMotionControl(). Call enable() only in a user gesture.
 * Tests/hosts can inject supported, requestPermission, now, add, remove, and
 * optionally screenAngle, hidden, subscribeVisibility, setTimeout, clearTimeout.
 * add/remove accept one callback receiving DeviceOrientation or DeviceMotion events.
 * subscribeVisibility(callback) reports hidden=true and returns an unsubscribe.
 * All times are monotonic milliseconds; screenAngle is screen.orientation.angle.
 *
 * read(): mode ('touch'|'sensor'), value (legacy alias of tiltX), tiltX, tiltY,
 * status, flat. Tilt values are screen-relative, clamped to [-1,1], 18° full scale.
 * flat is true only with a fresh, screen-up sample within 10° of true horizontal.
 * enable() resolves true when listening, not when a valid sample has arrived.
 * No arbitrary starting angle is ever used as a horizontal calibration.
 */
export function createMotionControl(overrides = {}) {
  const env = {...browserEnvironment(), ...overrides};
  let mode = 'touch', status = '触控平衡', generation = 0;
  let vector = null, tiltX = 0, tiltY = 0, flat = false;
  let last = null, started = 0, timer = null, listener = null, unwatch = null, pending = null;

  function clearTimer() {
    if (timer !== null) env.clearTimeout(timer);
    timer = null;
  }

  function stop(message = '触控平衡') {
    generation++;
    clearTimer();
    const oldListener = listener, oldUnwatch = unwatch, oldPending = pending;
    listener = unwatch = pending = null;
    mode = 'touch'; status = message;
    vector = null; tiltX = tiltY = 0; flat = false; last = null; started = 0;
    // Generation checks still protect queued callbacks if a host cannot remove one.
    try { if (oldListener) env.remove(oldListener); } catch {}
    try { oldUnwatch?.(); } catch {}
    oldPending?.(false);
  }

  function project() {
    if (!vector) return;
    const rawAngle = env.screenAngle();
    const angle = (Number.isFinite(rawAngle) ? rawAngle : 0) * RAD;
    const x = vector.x * Math.cos(angle) - vector.y * Math.sin(angle);
    const y = vector.x * Math.sin(angle) + vector.y * Math.cos(angle);
    tiltX = normalized(Math.atan2(-x, vector.z));
    tiltY = normalized(Math.atan2(y, vector.z));
    flat = vector.z >= Math.cos(FLAT_ANGLE * RAD);
    status = flat ? '手机已放平，轻轻放下' : vector.z <= 0 ? '请让屏幕朝上，慢慢放平手机' : '屏幕朝上，前后左右慢慢放平';
  }

  function check() {
    if (mode !== 'sensor' && !pending) return;
    if (env.hidden()) return stop('已暂停感应，使用触控');
    if (pending && env.now() - started >= PERMISSION_TIMEOUT) return stop('权限请求超时，使用触控');
    if (mode === 'sensor' && env.now() - (last ?? started) >= DATA_TIMEOUT) {
      stop(last === null ? '未收到感应数据，使用触控' : '感应数据已过期，使用触控');
    }
  }

  function armWatchdog(attempt) {
    clearTimer();
    const delay = pending ? PERMISSION_TIMEOUT - (env.now() - started) : DATA_TIMEOUT - (env.now() - (last ?? started));
    timer = env.setTimeout(() => {
      if (attempt !== generation) return;
      timer = null;
      check();
      if (attempt === generation && (pending || mode === 'sensor')) armWatchdog(attempt);
    }, Math.max(1, delay));
  }

  function enable() {
    stop();
    const attempt = generation;
    try {
      if (env.hidden()) { status = '已暂停感应，使用触控'; return Promise.resolve(false); }
      if (!env.supported()) { status = '此设备不支持，使用触控'; return Promise.resolve(false); }
    } catch { status = '无法读取感应，使用触控'; return Promise.resolve(false); }

    started = env.now(); status = '正在请求感应权限';
    return new Promise(resolve => {
      pending = resolve;
      try {
        unwatch = env.subscribeVisibility(hidden => {
          if (hidden && attempt === generation) stop('已暂停感应，使用触控');
        });
        if (attempt !== generation) { unwatch?.(); unwatch = null; return; }
        armWatchdog(attempt);
        // Invoke synchronously, while the original click's user activation exists.
        const permission = env.requestPermission();
        Promise.resolve(permission).then(result => {
          if (attempt !== generation) return;
          check();
          if (attempt !== generation) return;
          if (result !== 'granted') { stop('未获权限，使用触控'); return; }
          clearTimer();
          mode = 'sensor'; status = '屏幕朝上，等待感应数据'; started = env.now();
          listener = event => {
            if (attempt !== generation || mode !== 'sensor') return;
            check();
            if (attempt !== generation) return;
            const sample = upwardVector(event);
            if (!sample) return;
            vector = sample; last = env.now(); project();
          };
          env.add(listener);
          const finish = pending; pending = null;
          if (attempt !== generation) return;
          armWatchdog(attempt);
          finish?.(true);
        }).catch(() => {
          if (attempt === generation) stop('无法读取感应，使用触控');
        });
      } catch {
        if (attempt === generation) stop('无法读取感应，使用触控');
      }
    });
  }

  return {
    enable, stop,
    recenter() {
      check();
      // This button only refreshes the screen axes. It never redefines gravity.
      if (mode === 'sensor') project();
    },
    read() {
      check();
      if (mode === 'sensor') project();
      return {mode, value: tiltX, tiltX, tiltY, status, flat};
    }
  };
}
