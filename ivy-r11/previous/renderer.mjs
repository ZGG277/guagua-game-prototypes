/* Original procedural art. Every leaf silhouette is backed by a game collider. */
import { CHARGE_TIME, G, launchVelocity } from './physics.mjs';
const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const noise = n => { const a = Math.sin(n * 127.13 + 17.61) * 43758.5453; return a - Math.floor(a); };
const mix = (a, b, t) => a + (b - a) * t;
function ellipse(c, x, y, rx, ry, fill, rotation = 0) {
  c.beginPath(); c.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), rotation, 0, TAU); c.fillStyle = fill; c.fill();
}
function stroke(c, color, width, points) {
  c.beginPath(); for (const [method, ...v] of points) c[method](...v); c.strokeStyle = color; c.lineWidth = width; c.stroke();
}
function leafPath(c, w, direction = 1, rustle = 0) {
  const p = w / 2, tip = direction * w * .19;
  c.beginPath(); c.moveTo(-p, 0); c.lineTo(p, 0);
  c.bezierCurveTo(p * .98, 11, p * .83, 19, p * .64, 20);
  c.lineTo(p * .72, 36 + rustle * .4); c.quadraticCurveTo(p * .34, 37, p * .23, 30);
  c.quadraticCurveTo(tip + 7, 48, tip, 59 + rustle);
  c.quadraticCurveTo(tip - 13, 46, -p * .25, 29);
  c.quadraticCurveTo(-p * .48, 36, -p * .79, 29 - rustle * .3);
  c.lineTo(-p * .65, 19); c.quadraticCurveTo(-p * .98, 13, -p, 0); c.closePath();
}
function wall(c, view, t) {
  const { width, height } = view;
  let g = c.createLinearGradient(0, 0, width * .25, height);
  g.addColorStop(0, '#bdc8a0'); g.addColorStop(.42, '#859679'); g.addColorStop(1, '#4b6558');
  c.fillStyle = g; c.fillRect(0, 0, width, height);
  g = c.createRadialGradient(width * .87, -height * .05, 0, width * .73, height * .12, width * 1.15);
  g.addColorStop(0, '#fff2c493'); g.addColorStop(.35, '#eee9bf35'); g.addColorStop(1, '#142e2800');
  c.fillStyle = g; c.fillRect(0, 0, width, height);
  c.save(); c.translate(view.offsetX, -view.cameraY * view.scale); c.scale(view.scale, view.scale);
  const top = view.cameraY - 180, bottom = view.cameraY + height / view.scale + 180;
  // Low-contrast masonry is flush against the wall, never a false landing ledge.
  for (let row = Math.floor(top / 151); row <= Math.ceil(bottom / 151); row++) {
    const y = row * 151, shift = row % 2 ? -90 : 0;
    for (let col = -1; col < 5; col++) {
      const x = col * 169 + shift, seed = row * 37 + col * 97;
      c.fillStyle = noise(seed) > .5 ? '#d7d9b308' : '#293f3510';
      c.fillRect(x + 2, y + 2, 166, 148);
      stroke(c, '#203c2e13', 1.7, [['moveTo', x, y], ['lineTo', x + 169, y], ['moveTo', x, y], ['lineTo', x, y + 151]]);
      stroke(c, '#e6e6bf12', 1, [['moveTo', x + 1, y + 2], ['lineTo', x + 168, y + 2]]);
      for (let k = 0; k < 6; k++) {
        const nx = x + noise(seed + k * 8) * 165, ny = y + noise(seed + k * 13) * 149;
        ellipse(c, nx, ny, 15 + noise(seed + k) * 26, 8 + noise(seed + k * 3) * 17, k % 2 ? '#e7e4b508' : '#1b493615', noise(k) * 3);
      }
    }
  }
  // A web of climbing tendrils, rather than a single prescribed route.
  for (let n = -1; n < 12; n++) {
    const x = 19 + n * 47;
    c.beginPath(); c.moveTo(x + Math.sin(top / 230 + n) * 15, top);
    for (let y = top; y < bottom + 90; y += 55) c.lineTo(x + Math.sin(y / 230 + n * .79) * 19 + Math.sin(y / 81 + n) * 5, y);
    c.strokeStyle = n % 3 ? '#2749364d' : '#34513978'; c.lineWidth = n % 3 ? 2 : 4; c.stroke();
    c.strokeStyle = '#d0d5a42b'; c.lineWidth = .7; c.stroke();
    for (let j = Math.floor(top / 120); j < bottom / 120; j++) {
      const y = j * 120 + noise(n * 23 + j) * 42, side = j % 2 ? 1 : -1, xx = x + Math.sin(y / 230 + n * .79) * 19;
      stroke(c, '#36563960', 1.3, [['moveTo', xx, y], ['bezierCurveTo', xx + side * 30, y - 8, xx + side * 42, y - 33, xx + side * 21, y - 39], ['bezierCurveTo', xx + side * 6, y - 39, xx + side * 11, y - 24, xx + side * 20, y - 28]]);
    }
  }
  // Moss is granular, flat wall texture, not decorative platform foliage.
  for (let k = Math.floor(top / 38); k <= bottom / 38; k++) {
    for (let j = 0; j < 6; j++) {
      const seed = k * 91 + j * 21, x = noise(seed) * 570 - 45, y = k * 38 + noise(seed + 7) * 30;
      ellipse(c, x, y, 3 + noise(seed + 2) * 8, 2 + noise(seed + 9) * 5, j % 2 ? '#aebd7930' : '#274a3540');
    }
  }
  c.restore();
  // Broad, transparent shafts create scale without hiding the route.
  c.save(); c.globalCompositeOperation = 'screen';
  c.fillStyle = '#f7e9ad0a'; c.beginPath(); c.moveTo(width * .92, 0); c.lineTo(width * .3, height); c.lineTo(width * .57, height); c.lineTo(width, 0); c.fill();
  c.fillStyle = '#fff9c90b'; c.beginPath(); c.moveTo(width * .7, 0); c.lineTo(-width * .18, height); c.lineTo(width * .05, height); c.lineTo(width * .77, 0); c.fill(); c.restore();
  const drift = view.reducedMotion ? 0 : t;
  for (let i = 0; i < 22; i++) {
    const x = noise(i * 11) * width + Math.sin(drift * .13 + i) * 7;
    const y = ((noise(i * 41) * height - drift * (2 + i % 3)) % (height + 20) + height + 20) % (height + 20) - 10;
    ellipse(c, x, y, i % 4 === 0 ? 1.25 : .7, i % 4 === 0 ? 1.8 : .7, i % 3 ? '#fff5c858' : '#dde7bf37');
  }
}
function windowGoal(c, game) {
  const x = game.goal?.x ?? 240, y = game.goal?.y ?? 135;
  c.save(); c.translate(x, y);
  const light = c.createRadialGradient(0, 15, 5, 0, 15, 180);
  light.addColorStop(0, '#fff1be60'); light.addColorStop(1, '#fff1be00'); c.fillStyle = light; c.fillRect(-180, -165, 360, 360);
  c.shadowColor = '#18332970'; c.shadowBlur = 10; c.shadowOffsetY = 8;
  c.fillStyle = '#d7d8b3'; c.beginPath(); c.moveTo(-50, 68); c.lineTo(-50, -12); c.bezierCurveTo(-50, -71, 50, -71, 50, -12); c.lineTo(50, 68); c.closePath(); c.fill();
  c.shadowBlur = 0; c.shadowOffsetY = 0;
  const inner = c.createLinearGradient(0, -53, 0, 64); inner.addColorStop(0, '#fff4c7'); inner.addColorStop(.55, '#e5deb0'); inner.addColorStop(1, '#aebc86');
  c.fillStyle = inner; c.beginPath(); c.moveTo(-39, 60); c.lineTo(-39, -12); c.bezierCurveTo(-39, -58, 39, -58, 39, -12); c.lineTo(39, 60); c.closePath(); c.fill();
  stroke(c, '#64866e', 5, [['moveTo', 0, -45], ['lineTo', 0, 60], ['moveTo', -39, 6], ['lineTo', 39, 6]]);
  stroke(c, '#e7e8c6', 1.1, [['moveTo', -1.5, -45], ['lineTo', -1.5, 60], ['moveTo', -39, 3.5], ['lineTo', 39, 3.5]]);
  // The window is a destination marker, not an extra platform.
  c.fillStyle = '#304e36'; c.textAlign = 'center'; c.font = '500 9px system-ui, sans-serif'; c.letterSpacing = '2px'; c.fillText('窗边的光', 0, -78); c.letterSpacing = '0px';
  c.restore();
}
function leafStem(c, l) {
  const rootX = Math.round(l.x / 47) * 47 + 10;
  stroke(c, '#233e2c60', 4, [['moveTo', rootX + 3, l.y + 60], ['bezierCurveTo', rootX + 8, l.y + 37, l.x - l.dir * 17 + 4, l.y + 6, l.x + 4, l.y + 9]]);
  stroke(c, '#657e46', 3, [['moveTo', rootX, l.y + 55], ['bezierCurveTo', rootX + 4, l.y + 32, l.x - l.dir * 17, l.y + 2, l.x, l.y + 3]]);
  stroke(c, '#bbc68b75', .8, [['moveTo', rootX - .7, l.y + 55], ['bezierCurveTo', rootX + 3, l.y + 32, l.x - l.dir * 17, l.y + 2, l.x, l.y + 3]]);
}
function platform(c, l, game, view) {
  const load = clamp(l.load || 0, 0, 1), slope = l.dir * load * .36, w = l.w;
  const rustle = !view.reducedMotion && game.butterfly?.phase === 'passing' ? Math.sin(game.time * 19 + l.id * .7) * game.butterfly.strength * 3 : 0;
  const active = l.id === game.standId && ['grounded', 'sliding', 'climbing'].includes(game.status);
  // Shear preserves the exact world-space top-surface x bounds used by collisions.
  c.save(); c.translate(l.x + 8 + load * l.dir * 4, l.y + load * 12 + 19); c.transform(1, slope, 0, .9, 0, 0);
  c.globalAlpha = .22; c.fillStyle = '#15372a'; leafPath(c, w, l.dir, rustle); c.fill(); c.restore();
  c.save(); c.translate(l.x, l.y + load * 12); c.transform(1, slope, 0, 1, 0, 0);
  const green = (Number(l.id) || 0) % 4;
  let g = c.createLinearGradient(-w * .4, -6, w * .2, 58);
  g.addColorStop(0, green === 1 ? '#a0bd60' : '#91b65c'); g.addColorStop(.28, green === 2 ? '#88ad53' : '#789f49'); g.addColorStop(.74, '#466e39'); g.addColorStop(1, '#33582f');
  leafPath(c, w, l.dir, rustle); c.fillStyle = g; c.fill();
  c.strokeStyle = '#254e3675'; c.lineWidth = 1; c.stroke();
  c.save(); leafPath(c, w, l.dir, rustle); c.clip();
  let sheen = c.createLinearGradient(-w * .5, 1, w * .4, 44); sheen.addColorStop(0, '#eff9b557'); sheen.addColorStop(.35, '#e8f49d0c'); sheen.addColorStop(.55, '#ffffff03'); sheen.addColorStop(1, '#193c2c1a');
  c.fillStyle = sheen; c.fillRect(-w, -3, w * 2, 67);
  c.beginPath(); c.moveTo(-w * .48, 3); c.quadraticCurveTo(-w * .12, 9, w * .43, 5); c.strokeStyle = '#e6f1a94a'; c.lineWidth = 5; c.stroke();
  const tip = l.dir * w * .19;
  stroke(c, '#c4d88b6b', 1, [['moveTo', -l.dir * w * .08, 2], ['quadraticCurveTo', l.dir * w * .05, 29, tip, 57], ['moveTo', 0, 16], ['quadraticCurveTo', -w * .17, 15, -w * .41, 9], ['moveTo', l.dir * w * .07, 25], ['quadraticCurveTo', -w * .12, 29, -w * .29, 29], ['moveTo', 0, 14], ['quadraticCurveTo', w * .18, 16, w * .4, 8], ['moveTo', l.dir * w * .08, 29], ['lineTo', w * .27, 32]]);
  for (let k = 0; k < 5; k++) {
    const xx = (noise((Number(l.id) || 0) * 13 + k) - .5) * w * .7, yy = 9 + noise(k * 3 + (Number(l.id) || 0)) * 21;
    ellipse(c, xx, yy, 1, .65, '#eef6bc38');
  }
  c.restore();
  // This lit ridge is the actual collision surface, even as the leaf bends.
  stroke(c, '#d9e6a9cc', 1.6, [['moveTo', -w / 2 + 1, .2], ['lineTo', w / 2 - 1, .2]]);
  stroke(c, '#416b36aa', .8, [['moveTo', -w / 2 + 1, 2.2], ['lineTo', w / 2 - 1, 2.2]]);
  if (active) {
    const localX = clamp(game.body.x - l.x, -w / 2 + 4, w / 2 - 4);
    ellipse(c, localX, 3.6, 11, 3.8, '#143a2b52');
    // Leaf vein warms as urgency rises; it remains readable without a color cue.
    if (load > .45) {
      const a = (load - .45) / .55;
      stroke(c, `rgba(241,217,137,${a * .58})`, 1.8, [['moveTo', -w * .4, 1], ['lineTo', w * .4, 1]]);
      if (game.status === 'sliding') {
        const xx = l.dir * w * .36;
        stroke(c, '#f0e5b9b8', 1.2, [['moveTo', xx - l.dir * 6, 10], ['lineTo', xx, 13], ['lineTo', xx - l.dir * 5, 15]]);
      }
    }
  }
  c.restore();
}
function butterflyShape(c, flap, color = true) {
  const sideScale = .38 + .62 * Math.abs(Math.cos(flap));
  c.save(); c.scale(sideScale, 1);
  for (const side of [-1, 1]) {
    c.save(); c.scale(side, 1);
    c.beginPath(); c.moveTo(0, -5); c.bezierCurveTo(34, -99, 121, -138, 137, -93); c.bezierCurveTo(155, -35, 100, -2, 17, 14); c.bezierCurveTo(73, 18, 110, 60, 77, 91); c.bezierCurveTo(61, 109, 38, 84, 25, 64); c.lineTo(18, 106); c.quadraticCurveTo(10, 91, 10, 51); c.quadraticCurveTo(-3, 30, 0, -5); c.closePath();
    if (color) {
      const g = c.createLinearGradient(0, -94, 122, 80); g.addColorStop(0, '#f6efbf'); g.addColorStop(.4, '#eee3ac'); g.addColorStop(.75, '#d9c88e'); g.addColorStop(1, '#97a787'); c.fillStyle = g;
    } else c.fillStyle = '#193d31';
    c.fill();
    if (color) {
      c.strokeStyle = '#687b6770'; c.lineWidth = 2; c.stroke();
      stroke(c, '#7787728c', 2.2, [['moveTo', 4, 3], ['bezierCurveTo', 50, -22, 94, -61, 125, -91], ['moveTo', 25, -11], ['quadraticCurveTo', 48, -70, 81, -104], ['moveTo', 18, 13], ['quadraticCurveTo', 39, 49, 68, 83], ['moveTo', 36, -16], ['quadraticCurveTo', 77, -13, 117, -42]]);
      for (let i = 0; i < 5; i++) ellipse(c, 75 + i * 9, -75 + i * 10, 4.7, 7, '#5a7063a0', -.8);
      ellipse(c, 64, 55, 13, 15, '#698c87c0', -.3); ellipse(c, 64, 55, 7, 8, '#d1dfb9cc', -.3);
    }
    c.restore();
  }
  c.restore();
  if (color) {
    ellipse(c, 0, 5, 5, 34, '#6c7861'); ellipse(c, 0, -25, 6, 8, '#62715d');
    stroke(c, '#4e6656', 1.3, [['moveTo', -3, -30], ['quadraticCurveTo', -12, -50, -18, -47], ['moveTo', 3, -30], ['quadraticCurveTo', 12, -50, 18, -47]]);
  }
}
function butterflyShadow(c, game, view) {
  const b = game.butterfly; if (!b || !['warning', 'passing'].includes(b.phase)) return;
  const warning = b.phase === 'warning';
  const p = warning ? clamp(b.t / 1.25, 0, 1) : clamp(b.progress || 0, 0, 1);
  const x = warning ? -210 + p * 800 : -180 + p * 900;
  const y = game.body.y + (warning ? -130 + p * 70 : 35);
  c.save(); c.translate(x + 24, y + 32); c.rotate(.65); c.scale(1.25, 1.1); c.globalAlpha = warning ? Math.sin(p * Math.PI) * .15 : Math.sin(p * Math.PI) * .12;
  butterflyShape(c, view.reducedMotion ? 0 : (b.t || 0) * 8, false); c.restore();
}
function butterfly(c, game, view) {
  const b = game.butterfly; if (!b || b.phase !== 'passing') return;
  const p = clamp(b.progress || 0, 0, 1), x = -210 + p * 900;
  // The large flyby occupies the lower scene; the girl is drawn above it for clarity.
  const y = game.body.y + 116 - Math.sin(p * Math.PI) * 18;
  c.save(); c.translate(x, y); c.rotate(.65 + Math.sin(p * Math.PI) * .12); c.scale(1.12, 1.12); c.globalAlpha = .92;
  butterflyShape(c, view.reducedMotion ? .7 : (b.t || 0) * 9, true); c.restore();
}
function girl(c, game, t, reduced) {
  const b = game.body, status = game.status;
  const flying = status === 'flying', climbing = status === 'climbing', sliding = status === 'sliding';
  const charge = game.input ? clamp(game.input.held / CHARGE_TIME, 0, 1) : 0;
  const gust = game.butterfly?.gust || 0;
  const motion = reduced ? 0 : Math.sin(t * 5.6) * .5;
  const crouch = charge * 5;
  const lean = clamp((b.vx || 0) * .0008 + (sliding ? .12 * (game.leaves.find(l => l.id === game.standId)?.dir || 1) : 0) + gust * .05, -.28, .28);
  c.save(); c.translate(b.x, b.y); c.rotate(lean);
  // Feet and legs are an unambiguous contact cue on the real leaf edge.
  const legSpread = flying ? 5 : 0, kick = climbing ? Math.sin((game.climb?.progress || 0) * Math.PI) * 5 : 0;
  c.lineCap = 'round';
  stroke(c, '#d2ae82', 3.3, [['moveTo', -4, -13 + crouch], ['quadraticCurveTo', -4 - legSpread, -6 + crouch, -5 - legSpread, -2 + kick], ['moveTo', 4, -13 + crouch], ['quadraticCurveTo', 5 + legSpread, -7 + crouch, 6 + legSpread, -2 - kick]]);
  ellipse(c, -5 - legSpread, -1 + kick, 3.8, 1.8, '#6d4938'); ellipse(c, 6 + legSpread, -1 - kick, 3.8, 1.8, '#6d4938');
  const dressFlare = (flying ? 4 : 0) + Math.abs(gust) * 3, hem = -10 + crouch, shoulder = -29 + crouch;
  // Arms point up during the catch, then bend down during the pull-up.
  const progress = game.climb?.progress || 0, handY = climbing ? -33 + progress * 10 : flying ? -31 : sliding ? -21 : -17 + crouch;
  const handX = climbing ? 13 : flying ? 15 : sliding ? 17 : 11;
  stroke(c, '#d3b08a', 3, [['moveTo', -6, shoulder + 3], ['quadraticCurveTo', -12, shoulder + (climbing ? -1 : 7), -handX, handY], ['moveTo', 6, shoulder + 3], ['quadraticCurveTo', 12, shoulder + (climbing ? -1 : 7), handX, handY]]);
  ellipse(c, -handX, handY, 2, 2.4, '#e2bf96'); ellipse(c, handX, handY, 2, 2.4, '#e2bf96');
  const dress = c.createLinearGradient(-10, -27, 13, -8); dress.addColorStop(0, '#d46853'); dress.addColorStop(.45, '#bd463b'); dress.addColorStop(1, '#8c302f');
  c.fillStyle = dress; c.beginPath(); c.moveTo(-6, shoulder); c.quadraticCurveTo(0, shoulder - 2, 6, shoulder); c.quadraticCurveTo(8, -22 + crouch, 12 + dressFlare + gust * 3, hem); c.quadraticCurveTo(2, hem + 5, -12 - dressFlare + gust * 3, hem); c.quadraticCurveTo(-8, -22 + crouch, -6, shoulder); c.closePath(); c.fill();
  stroke(c, '#ef9a704f', 1.1, [['moveTo', -4, shoulder + 5], ['quadraticCurveTo', -5, -18 + crouch, -7 + gust * 3, hem + 1], ['moveTo', 2, shoulder + 7], ['lineTo', 4 + gust * 2, hem + 2]]);
  stroke(c, '#742d2e45', 1, [['moveTo', 5, shoulder + 7], ['lineTo', 8 + gust * 3, hem]]);
  // Small white collar and visible back seam make the rear view unmistakable.
  c.fillStyle = '#efe4c1'; c.beginPath(); c.moveTo(-6, shoulder + .5); c.lineTo(-1, shoulder + 4); c.lineTo(0, shoulder + 1); c.lineTo(1, shoulder + 4); c.lineTo(6, shoulder + .5); c.closePath(); c.fill();
  ellipse(c, 0, -31 + crouch, 3, 4.2, '#ddb58b');
  ellipse(c, -7.4, -36 + crouch, 2, 2.6, '#e0b58b'); ellipse(c, 7.4, -36 + crouch, 2, 2.6, '#d3a781');
  const hair = c.createLinearGradient(-8, -45, 8, -30); hair.addColorStop(0, '#755136'); hair.addColorStop(.45, '#503c2e'); hair.addColorStop(1, '#382c26');
  ellipse(c, 0, -38 + crouch, 8.1, 9.3, hair, -.03);
  stroke(c, '#b58a5352', .85, [['moveTo', -4.8, -43 + crouch], ['quadraticCurveTo', -6.3, -38 + crouch, -3, -33 + crouch]]);
  const tail = (flying ? -clamp((b.vx || 0) * .035, -7, 7) : motion) + gust * 10;
  c.fillStyle = '#493529'; c.beginPath(); c.moveTo(3, -39 + crouch); c.bezierCurveTo(12 + tail, -40 + crouch, 14 + tail, -29 + crouch, 10 + tail, -23 + crouch); c.quadraticCurveTo(7 + tail, -27 + crouch, 7 + tail * .5, -32 + crouch); c.quadraticCurveTo(7, -36 + crouch, 3, -39 + crouch); c.fill();
  stroke(c, '#b58a5355', .9, [['moveTo', 7, -37 + crouch], ['quadraticCurveTo', 12 + tail, -32 + crouch, 10 + tail, -26 + crouch]]);
  ellipse(c, 6, -37 + crouch, 2.7, 1.9, '#dc9371', -.5);
  c.restore();
}
function aim(c, game) {
  if (!game.input || !['grounded', 'sliding'].includes(game.status)) return;
  const { vx, vy } = launchVelocity(game.input.held, game.input.aim || 0), g = G;
  c.save(); c.strokeStyle = '#fff4c49f'; c.lineWidth = 1.4; c.setLineDash([2, 6]); c.beginPath(); c.moveTo(game.body.x, game.body.y - 16);
  for (let i = 1; i <= 9; i++) { const s = i * .023; c.lineTo(game.body.x + vx * s, game.body.y - 16 + vy * s + .5 * g * s * s); }
  c.stroke(); c.setLineDash([]);
  const s = .207; ellipse(c, game.body.x + vx * s, game.body.y - 16 + vy * s + .5 * g * s * s, 2.4, 2.4, '#fff1bd'); c.restore();
}
export function renderScene(ctx, game, view) {
  const { width, height, scale, offsetX, cameraY } = view;
  if (!(width > 0 && height > 0 && scale > 0)) return;
  const t = view.reducedMotion ? 0 : game.time || 0;
  ctx.save(); wall(ctx, view, t);
  ctx.save(); ctx.translate(offsetX, -cameraY * scale); ctx.scale(scale, scale);
  const minY = cameraY - 150, maxY = cameraY + height / scale + 160;
  if (minY < 410) windowGoal(ctx, game);
  const visible = game.leaves.filter(l => l.y > minY && l.y < maxY);
  for (const l of visible) leafStem(ctx, l);
  butterflyShadow(ctx, game, view);
  for (const l of visible) platform(ctx, l, game, view);
  const trail = game.launchTrail || game.trail || [];
  if (game.status === 'flying') for (let i = 0; i < trail.length; i++) ellipse(ctx, trail[i].x, trail[i].y, .8 + i / trail.length, .8 + i / trail.length, `rgba(244,235,181,${i / trail.length * .27})`);
  aim(ctx, game); butterfly(ctx, game, view); girl(ctx, game, t, view.reducedMotion);
  ctx.restore();
  // A restrained peripheral vignette keeps focus on the readable leaf wall.
  const vignette = ctx.createRadialGradient(width * .52, height * .42, width * .24, width * .5, height * .48, Math.max(width, height) * .77);
  vignette.addColorStop(0, '#102b2300'); vignette.addColorStop(.7, '#102b2309'); vignette.addColorStop(1, '#102b234c'); ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
