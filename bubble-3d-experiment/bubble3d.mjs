/**
 * Dependency-free WebGL 1 soap-film shell, rendered as an actual triangulated 3D
 * surface. Coordinates are in the game's 390 × 780, y-down logical viewport.
 *
 * const bubble = new Bubble3D(canvas, { onStatus: ({ status, message }) => ... });
 * bubble.render({ x, y, r, forceX, forceY, impulse, visible: true }, dtSeconds);
 *
 * forceX/Y are the SAME px/s² accelerations used by gameplay. `wind` and `time`
 * are accepted but never invent motion. A numeric impulse is an upward px/s
 * velocity kick, passed for ONE render only. Alternatively use {x,y,id}, with
 * y down; an optional unique id makes a held event safe from repeated kicks.
 * Constructor throws when startup fails (set throwOnError:false to opt out).
 * render returns false when unavailable. supported, status, message and the
 * bubble3dstatus CustomEvent allow the host to show an honest fallback message.
 */

export const LOGICAL_WIDTH = 390;
export const LOGICAL_HEIGHT = 780;
export const FIXED_STEP = 1 / 120;
const MODE_COUNT = 8;
const OMEGA = [13, 13, 16, 16, 18, 23, 23, 26];
const DAMPING = [0.23, 0.23, 0.27, 0.27, 0.29, 0.27, 0.27, 0.30];
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Eight damped capillary modes. No clock-driven or random animation. */
export class BubbleShapeSolver {
  constructor() { this.reset(); }

  reset() {
    this.q = new Float64Array(MODE_COUNT);
    this.velocity = new Float64Array(MODE_COUNT);
    this.target = new Float64Array(MODE_COUNT);
    this.accumulator = 0;
    this.elapsed = 0;
    this.lastImpulseId = undefined;
    return this;
  }

  applyImpulse(impulse) {
    let ix = 0, iy = 0;
    if (typeof impulse === 'number') {
      iy = clamp(finite(impulse) / 90, -3, 3);
    } else if (impulse && typeof impulse === 'object') {
      if (impulse.id !== undefined && impulse.id === this.lastImpulseId) return;
      if (impulse.id !== undefined) this.lastImpulseId = impulse.id;
      ix = clamp(finite(impulse.x) / 90, -3, 3);
      iy = clamp(-finite(impulse.y) / 90, -3, 3);
    }
    // Translation is owned by gameplay. Only shape velocities receive this
    // kick, exciting quadrupole stretch and higher-order travelling ripples.
    this.velocity[0] += 0.95 * (Math.abs(ix) - Math.abs(iy));
    this.velocity[1] += 0.38 * ix;
    this.velocity[2] += 0.30 * ix;
    this.velocity[3] += 0.30 * iy;
    this.velocity[4] -= 0.22 * Math.hypot(ix, iy);
    this.velocity[5] += 0.72 * ix;
    this.velocity[6] += 0.72 * iy;
    this.velocity[7] += 0.11 * Math.hypot(ix, iy);
    for (let i = 0; i < MODE_COUNT; i++) this.velocity[i] = clamp(this.velocity[i], -6, 6);
  }

  step(dt, input = {}) {
    const fx = clamp(finite(input.forceX) / 100, -3, 3);
    const fy = clamp(-finite(input.forceY) / 100, -3, 3);
    const magnitude = Math.min(3, Math.hypot(fx, fy));
    const denominator = Math.hypot(fx, fy) + 0.4;
    // Aerodynamic normal stress compresses the shell along the force axis;
    // directional odd modes distinguish left/right and up/down loading.
    this.target[0] = -0.065 * (fx * fx - fy * fy) / denominator;
    this.target[1] = -0.13 * fx * fy / denominator;
    this.target[2] = 0.016 * fx;
    this.target[3] = 0.016 * fy;
    this.target[4] = 0.024 * magnitude;
    this.target[5] = 0.025 * fx;
    this.target[6] = 0.025 * fy;
    this.target[7] = 0;
    if (input.impulse) this.applyImpulse(input.impulse);
    // A background-tab stall must not create a giant physics step. Normal
    // frame rates share the same 120 Hz integration and fractional remainder.
    this.accumulator += clamp(finite(dt), 0, 0.25);
    while (this.accumulator + 1e-12 >= FIXED_STEP) {
      for (let i = 0; i < MODE_COUNT; i++) {
        const omega = OMEGA[i];
        const acceleration = omega * omega * (this.target[i] - this.q[i])
          - 2 * DAMPING[i] * omega * this.velocity[i];
        this.velocity[i] += acceleration * FIXED_STEP;
        this.q[i] += this.velocity[i] * FIXED_STEP;
      }
      // A conservative radial displacement budget prevents inversion, even
      // for malicious input or rapidly repeated taps. This is a safety bound,
      // not the source of the visible oscillation.
      let budget = 0;
      for (let i = 0; i < MODE_COUNT; i++) budget += Math.abs(this.q[i]) * (i === 5 || i === 6 ? 1.38 : 1);
      if (budget > 0.30) {
        const scale = 0.30 / budget;
        for (let i = 0; i < MODE_COUNT; i++) { this.q[i] *= scale; this.velocity[i] *= 0.9; }
      }
      this.accumulator = Math.max(0, this.accumulator - FIXED_STEP);
      this.elapsed += FIXED_STEP;
    }
    return this;
  }

  snapshot() {
    return {
      q: Array.from(this.q), velocity: Array.from(this.velocity),
      target: Array.from(this.target), elapsed: this.elapsed,
      energy: this.q.reduce((sum, q, i) => sum + q * q + this.velocity[i] ** 2 / OMEGA[i] ** 2, 0),
    };
  }
}

/** Evaluate a radial spherical-harmonic shell and its analytic surface normal. */
export function sampleBubbleSurface(direction, q, out = new Float64Array(6)) {
  const length = Math.hypot(direction[0], direction[1], direction[2]) || 1;
  const x = direction[0] / length, y = direction[1] / length, z = direction[2] / length;
  const a = q[0], b = q[1], c = q[2], d = q[3], e = q[4], f = q[5], g = q[6], h = q[7];
  const displacement = a * (x * x - y * y) + b * 2 * x * y
    + c * 2 * x * z + d * 2 * y * z + e * (3 * z * z - 1) * 0.5
    + f * x * (5 * z * z - 1) + g * y * (5 * z * z - 1)
    + h * z * (5 * z * z - 3) * 0.5;
  const radius = 1 + displacement;
  const gx = 2 * a * x + 2 * b * y + 2 * c * z + f * (5 * z * z - 1);
  const gy = -2 * a * y + 2 * b * x + 2 * d * z + g * (5 * z * z - 1);
  const gz = 2 * c * x + 2 * d * y + 3 * e * z + 10 * f * x * z
    + 10 * g * y * z + h * (15 * z * z - 3) * 0.5;
  const radialGradient = gx * x + gy * y + gz * z;
  let nx = (radius + radialGradient) * x - gx;
  let ny = (radius + radialGradient) * y - gy;
  let nz = (radius + radialGradient) * z - gz;
  const normalLength = Math.hypot(nx, ny, nz) || 1;
  nx /= normalLength; ny /= normalLength; nz /= normalLength;
  out[0] = x * radius; out[1] = y * radius; out[2] = z * radius;
  out[3] = nx; out[4] = ny; out[5] = nz;
  return out;
}

/** Indexed sphere with outward CCW winding and no zero-area pole triangles. */
export function createSphereMesh(segments = 64, rings = 40) {
  segments = clamp(Math.floor(finite(segments, 64)), 8, 128);
  rings = clamp(Math.floor(finite(rings, 40)), 6, 96);
  const directions = new Float32Array((segments + 1) * (rings + 1) * 3);
  let cursor = 0;
  for (let row = 0; row <= rings; row++) {
    const theta = Math.PI * row / rings;
    for (let column = 0; column <= segments; column++) {
      const phi = 2 * Math.PI * column / segments;
      directions[cursor++] = Math.sin(theta) * Math.cos(phi);
      directions[cursor++] = Math.cos(theta);
      directions[cursor++] = Math.sin(theta) * Math.sin(phi);
    }
  }
  const indices = [];
  for (let row = 0; row < rings; row++) {
    for (let column = 0; column < segments; column++) {
      const a = row * (segments + 1) + column, b = a + segments + 1;
      if (row > 0) indices.push(a, a + 1, b);
      if (row < rings - 1) indices.push(a + 1, b + 1, b);
    }
  }
  return { directions, indices: new Uint16Array(indices), vertices: new Float32Array(directions.length * 2) };
}

const VERTEX_SHADER = `
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform vec2 uCenter;
uniform float uRadius;
uniform vec2 uViewport;
varying vec3 vPosition;
varying vec3 vNormal;
void main() {
  // Orthographic camera: actual xyz geometry, independent of the 2D game.
  vec2 screen = uCenter + vec2(aPosition.x, -aPosition.y) * uRadius;
  gl_Position = vec4(screen.x / uViewport.x * 2.0 - 1.0,
    1.0 - screen.y / uViewport.y * 2.0, -aPosition.z * 0.25, 1.0);
  vPosition = aPosition;
  vNormal = aNormal;
}`;

const FRAGMENT_SHADER = `
precision mediump float;
varying vec3 vPosition;
varying vec3 vNormal;
uniform float uBackFace;
uniform float uStress;
const float PI = 3.14159265;
void main() {
  vec3 outward = normalize(vNormal);
  vec3 N = uBackFace > 0.5 ? -outward : outward;
  vec3 V = vec3(0.0, 0.0, 1.0);
  float facing = clamp(abs(dot(N, V)), 0.0, 1.0);
  float grazing = 1.0 - facing;
  float fresnel = 0.0204 + 0.9796 * pow(grazing, 5.0);

  // Optical path difference in a thin water film, evaluated separately at
  // red, green and blue wavelengths (nanometres). Film thickness varies with
  // shell position and actual elastic stress, never a synthetic time wave.
  float thickness = 335.0 + 110.0 * (1.0 - vPosition.y)
    + 48.0 * vPosition.x + 70.0 * uStress * vPosition.z;
  float transmittedCos = sqrt(max(0.0, 1.0 - (1.0 - facing * facing) / (1.333 * 1.333)));
  vec3 phase = 4.0 * PI * 1.333 * thickness * transmittedCos / vec3(650.0, 510.0, 445.0);
  vec3 interference = 0.5 + 0.5 * cos(phase + PI);
  vec3 film = mix(vec3(0.86, 0.94, 1.0), interference, 0.75);

  vec3 L = normalize(vec3(-0.52, 0.78, 1.24));
  vec3 H = normalize(L + V);
  float highlight = pow(max(dot(N, H), 0.0), 100.0);
  float broadHighlight = pow(max(dot(N, H), 0.0), 16.0);
  // A second softbox and a grazing environment reflection make changes of
  // surface normal legible, including the actual out-of-screen z deformation.
  vec3 reflected = reflect(-V, N);
  float sideLight = pow(max(dot(reflected, normalize(vec3(0.8, -0.30, 0.6))), 0.0), 24.0);
  float sky = smoothstep(-0.25, 0.90, reflected.y);
  vec3 environment = mix(vec3(0.35, 0.53, 0.89), vec3(0.94, 0.98, 1.0), sky);
  float chord = 2.0 * abs(vPosition.z);
  vec3 transmission = exp(-vec3(0.025, 0.015, 0.006) * chord);
  vec3 color = mix(environment * transmission, film, 0.58 + 0.32 * grazing);
  color += vec3(0.50, 0.58, 0.66) * broadHighlight;
  color = mix(color, vec3(1.0), min(0.96, highlight + sideLight * 0.60));
  float alpha = 0.025 + 0.62 * fresnel + 0.10 * pow(grazing, 1.5)
    + 0.16 * broadHighlight + 0.58 * highlight + 0.14 * sideLight;
  if (uBackFace > 0.5) {
    alpha *= 0.26;
    color = mix(color, vec3(0.59, 0.72, 1.0), 0.25);
  }
  alpha = clamp(alpha, 0.0, 0.88);
  // Premultiplied alpha keeps the full-screen overlay genuinely transparent.
  gl_FragColor = vec4(color * alpha, alpha);
}`;

export class Bubble3D {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = options;
    this.shape = new BubbleShapeSolver();
    this.supported = false;
    this.status = 'initializing';
    this.message = '';
    this.gl = null;
    this.resources = null;
    this.disposed = false;
    this.mesh = createSphereMesh();
    this.sample = new Float64Array(6);
    this.direction = new Float64Array(3);
    this._onLost = (event) => {
      event.preventDefault();
      this.supported = false;
      this._status('context-lost', '3D graphics paused. Waiting for the graphics context to recover.');
    };
    this._onRestored = () => {
      if (!this.disposed) this._initialize();
    };
    if (!canvas || typeof canvas.getContext !== 'function') {
      this._status('unsupported', 'This device does not provide a WebGL canvas for the 3D bubble.');
      if (options.throwOnError !== false) throw new Error(this.message);
      return;
    }
    canvas.addEventListener?.('webglcontextlost', this._onLost, false);
    canvas.addEventListener?.('webglcontextrestored', this._onRestored, false);
    if (canvas.style) canvas.style.pointerEvents = 'none';
    this._initialize();
    if (!this.supported && options.throwOnError !== false) {
      canvas.removeEventListener?.('webglcontextlost', this._onLost);
      canvas.removeEventListener?.('webglcontextrestored', this._onRestored);
      throw this.error || new Error(this.message);
    }
  }

  _status(status, message = '') {
    this.status = status;
    this.message = message;
    if (this.canvas?.dataset) this.canvas.dataset.bubble3dStatus = status;
    const detail = { status, message, supported: this.supported };
    this.options.onStatus?.(detail);
    this.onStatusChange?.(detail);
    if (typeof CustomEvent !== 'undefined') this.canvas?.dispatchEvent?.(new CustomEvent('bubble3dstatus', { detail }));
  }

  _initialize() {
    try {
      const attributes = { alpha: true, antialias: true, premultipliedAlpha: true, depth: true, stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power' };
      this.gl = this.canvas.getContext('webgl', attributes) || this.canvas.getContext('experimental-webgl', attributes);
      const gl = this.gl;
      if (!gl) {
        this.supported = false;
        this._status('unsupported', 'WebGL is unavailable. Enable hardware graphics to view the real 3D bubble.');
        return;
      }
      const compile = (type, source) => {
        const shader = gl.createShader(type);
        if (!shader) throw new Error('Could not allocate a WebGL shader.');
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          const info = gl.getShaderInfoLog(shader);
          gl.deleteShader(shader);
          throw new Error(info || '3D bubble shader compilation failed.');
        }
        return shader;
      };
      const vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
      let fragment;
      try { fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER); }
      catch (error) { gl.deleteShader(vertex); throw error; }
      const program = gl.createProgram();
      if (!program) { gl.deleteShader(vertex); gl.deleteShader(fragment); throw new Error('Could not allocate a WebGL program.'); }
      gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
      gl.deleteShader(vertex); gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program); gl.deleteProgram(program);
        throw new Error(info || '3D bubble program linking failed.');
      }
      const vertexBuffer = gl.createBuffer(), indexBuffer = gl.createBuffer();
      if (!vertexBuffer || !indexBuffer) {
        if (vertexBuffer) gl.deleteBuffer(vertexBuffer);
        if (indexBuffer) gl.deleteBuffer(indexBuffer);
        gl.deleteProgram(program);
        throw new Error('Could not allocate the 3D shell mesh.');
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.mesh.vertices.byteLength, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.mesh.indices, gl.STATIC_DRAW);
      this.resources = {
        program, vertexBuffer, indexBuffer,
        position: gl.getAttribLocation(program, 'aPosition'),
        normal: gl.getAttribLocation(program, 'aNormal'),
        center: gl.getUniformLocation(program, 'uCenter'), radius: gl.getUniformLocation(program, 'uRadius'),
        viewport: gl.getUniformLocation(program, 'uViewport'), backFace: gl.getUniformLocation(program, 'uBackFace'),
        stress: gl.getUniformLocation(program, 'uStress'),
      };
      gl.clearColor(0, 0, 0, 0);
      gl.clearDepth(1);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.CULL_FACE); gl.frontFace(gl.CCW);
      this.supported = true;
      this._status('ready');
    } catch (error) {
      this.supported = false;
      this.error = error;
      this._status('error', 'The 3D bubble could not start on this graphics device.');
    }
  }

  _resize() {
    const canvas = this.canvas;
    const rect = canvas.getBoundingClientRect?.();
    const cssWidth = finite(rect?.width, canvas.clientWidth || LOGICAL_WIDTH) || LOGICAL_WIDTH;
    const cssHeight = finite(rect?.height, canvas.clientHeight || LOGICAL_HEIGHT) || LOGICAL_HEIGHT;
    const dpr = clamp(finite(globalThis.devicePixelRatio, 1), 1, 2);
    const gl = this.gl;
    // Cap both DPR and the long edge: a desktop-sized overlay must not consume
    // an unbounded phone GPU render target. The logical viewport stays fixed.
    const scale = Math.min(dpr, 2048 / Math.max(cssWidth, cssHeight));
    const width = Math.max(1, Math.round(cssWidth * scale));
    const height = Math.max(1, Math.round(cssHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width; canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
  }

  render(state = {}, dt = 0) {
    if (this.disposed) return false;
    this.shape.step(dt, state);
    if (!this.supported || !this.gl || this.gl.isContextLost()) return false;
    const gl = this.gl, resource = this.resources;
    this._resize();
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (state.visible === false || finite(state.r) <= 0) return true;
    const { directions, vertices } = this.mesh;
    let volume = 0, weight = 0;
    for (let i = 0, j = 0; i < directions.length; i += 3, j += 6) {
      this.direction[0] = directions[i]; this.direction[1] = directions[i + 1]; this.direction[2] = directions[i + 2];
      sampleBubbleSurface(this.direction, this.shape.q, this.sample);
      vertices.set(this.sample, j);
      const radius = Math.hypot(this.sample[0], this.sample[1], this.sample[2]);
      const areaWeight = Math.sqrt(Math.max(0, 1 - directions[i + 1] ** 2));
      volume += radius ** 3 * areaWeight;
      weight += areaWeight;
    }
    // Uniform rescaling preserves the enclosed volume during deformation;
    // normals do not change under this scale.
    const volumeScale = Math.cbrt(weight / Math.max(volume, 0.01));
    for (let i = 0; i < vertices.length; i += 6) {
      vertices[i] *= volumeScale; vertices[i + 1] *= volumeScale; vertices[i + 2] *= volumeScale;
    }
    gl.useProgram(resource.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, resource.vertexBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
    gl.enableVertexAttribArray(resource.position); gl.vertexAttribPointer(resource.position, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(resource.normal); gl.vertexAttribPointer(resource.normal, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, resource.indexBuffer);
    gl.uniform2f(resource.center, finite(state.x, LOGICAL_WIDTH / 2), finite(state.y, LOGICAL_HEIGHT / 2));
    gl.uniform1f(resource.radius, clamp(finite(state.r, 30), 0, 500));
    gl.uniform2f(resource.viewport, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    let stress = 0;
    for (let i = 0; i < MODE_COUNT; i++) stress += Math.abs(this.shape.q[i]);
    gl.uniform1f(resource.stress, stress);
    // The far shell is composited first; the near shell then passes the real
    // depth test. This is a closed 3D mesh, not a disc or a billboard texture.
    gl.cullFace(gl.FRONT); gl.uniform1f(resource.backFace, 1);
    gl.drawElements(gl.TRIANGLES, this.mesh.indices.length, gl.UNSIGNED_SHORT, 0);
    gl.cullFace(gl.BACK); gl.uniform1f(resource.backFace, 0);
    gl.drawElements(gl.TRIANGLES, this.mesh.indices.length, gl.UNSIGNED_SHORT, 0);
    return true;
  }

  reset() { this.shape.reset(); }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.canvas?.removeEventListener?.('webglcontextlost', this._onLost);
    this.canvas?.removeEventListener?.('webglcontextrestored', this._onRestored);
    if (this.gl && this.resources && !this.gl.isContextLost()) {
      this.gl.deleteBuffer(this.resources.vertexBuffer);
      this.gl.deleteBuffer(this.resources.indexBuffer);
      this.gl.deleteProgram(this.resources.program);
    }
    this.resources = null;
    this.supported = false;
    this._status('disposed');
  }
}

export default Bubble3D;
