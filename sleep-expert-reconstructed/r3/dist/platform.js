// ES2017; official miniTool APIs only. No remote requests or SDK imports.
export const FASTEST_KEY = 'sleep-expert-fastest-ms-v2';
export const BOARD = 2;
let nextRunId = 0;
const finite = n => typeof n === 'number' && Number.isFinite(n);

export function createRunTimer(options) {
  const o = options || {};
  const wallNow = o.wallNow || (() => Date.now());
  const monoNow = o.monoNow || (() => typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now());
  const maxGap = finite(o.maxFrameGapMs) ? o.maxFrameGapMs : 5000;
  const tolerance = finite(o.clockToleranceMs) ? o.clockToleranceMs : 2000;
  let run = null;
  let sealed = null;
  function snapshot() { return sealed || (run ? Object.freeze(Object.assign({}, run)) : null); }
  function invalidate(reason) { if (run && !sealed && !run.invalidReason) run.invalidReason = reason || 'invalid'; return snapshot(); }
  function sample() {
    if (!run || sealed) return snapshot();
    const wall = wallNow(); const mono = monoNow();
    const dw = wall - run.lastWall; const dm = mono - run.lastMono;
    if (!finite(wall) || !finite(mono) || !finite(dw) || !finite(dm) || dw < 0 || dm < 0) invalidate('clock_invalid');
    else {
      if (Math.abs(dw - dm) > tolerance) invalidate('clock_discontinuity');
      if (!run.paused && !run.hidden && dm > maxGap) invalidate('frame_gap');
      run.elapsedMs = Math.max(run.elapsedMs, wall - run.startedAt);
    }
    run.lastWall = wall; run.lastMono = mono;
    return snapshot();
  }
  return {
    start: function (practice) {
      const wall = wallNow(); const mono = monoNow();
      sealed = null;
      run = { runId: ++nextRunId, startedAt: wall, lastWall: wall, lastMono: mono, elapsedMs: 0, practice: !!practice, paused: false, hidden: false, finished: false, invalidReason: finite(wall) && finite(mono) ? null : 'clock_invalid' };
      return snapshot();
    },
    sample: sample,
    setPaused: function (value) { sample(); if (run && !sealed) run.paused = !!value; return snapshot(); },
    setHidden: function (value) { sample(); if (run && !sealed) run.hidden = !!value; return snapshot(); },
    invalidate: invalidate,
    finishSleeping: function () {
      if (!run || sealed) return snapshot();
      sample(); run.finished = true;
      if (!(run.elapsedMs > 0) || run.elapsedMs > 1000000000) invalidate('duration_out_of_range');
      run.eligible = !run.practice && !run.invalidReason;
      sealed = Object.freeze(Object.assign({}, run));
      return sealed;
    },
    getState: snapshot
  };
}

function errorState(error) {
  const e = error || {};
  const code = typeof e.errCode === 'number' ? e.errCode : null;
  const labels = { 1005: '排行榜未授权：需在创服平台勾选用户头像昵称授权。', 10003: '排行榜内测白名单未开通，请联系平台。', 2002: '排行榜尚未就绪，请稍后再查看。', 2004: '提交结果待确认，不会重复提交。', 2008: '授权服务暂不可用。', 2009: '排行榜请求过于频繁，请稍后再试。' };
  return { status: code === 2004 ? 'uncertain' : code === 2002 ? 'not_ready' : 'error', code: code, message: labels[code] || String(e.errMsg || e.message || '平台调用失败，请稍后再试。'), detail: String(e.errMsg || e.message || ''), hideEntry: code === 1005 };
}
function defaultXhs() { return typeof window !== 'undefined' ? window.xhs : null; }
export function createPlatform(options) {
  const o = options || {};
  const getXhs = o.getXhs || defaultXhs;
  async function capability(names, minVersion) {
    const xhs = getXhs(); const api = xhs && xhs.miniTool;
    if (!api) return { status: 'unavailable', message: '请在小红书小工具中使用此功能。' };
    let launch = xhs.launchOptions;
    if (!(launch && launch.miniToolEnv && launch.miniToolEnv.buildVersion) && typeof api.getLaunchOptions === 'function') {
      try { launch = await api.getLaunchOptions(); } catch (e) { return errorState(e); }
    }
    const version = Math.floor(Number(launch && launch.miniToolEnv && launch.miniToolEnv.buildVersion) / 1000);
    if (minVersion && (!Number.isFinite(version) || version < minVersion)) return { status: 'unavailable', message: Number.isFinite(version) ? '此功能需要小红书 9.51 或更新版本。' : '无法确认客户端版本，暂不能使用此功能。' };
    if (names.some(name => typeof api[name] !== 'function')) return { status: 'unavailable', message: '当前容器未提供此能力，请更新小红书；排行榜还需内测白名单。' };
    return { status: 'available', api: api, version: version };
  }
  return { capability: capability, getXhs: getXhs };
}

export function createLeaderboard(options) {
  const o = options || {};
  const platform = o.platform || createPlatform(o);
  const now = o.now || (() => Date.now());
  const delay = o.delay || (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const submitted = new Map(); const cache = new Map(); const pending = new Map();
  let blocked = null;
  function failure(e) { const result = errorState(e); if (result.code === 1005 || result.code === 10003) blocked = result; return result; }
  async function read(api, method, args) {
    const backoffs = [500, 1000, 2000, 4000];
    for (let i = 0; ; i++) {
      if (blocked) throw { errCode: blocked.code, errMsg: blocked.detail || blocked.message };
      try { return await api[method](args); }
      catch (e) {
        if (e && (e.errCode === 1005 || e.errCode === 10003)) { failure(e); throw e; }
        if (e && e.errCode === 2002 && i < backoffs.length) { await delay(backoffs[i]); continue; }
        throw e;
      }
    }
  }
  async function load(period) {
    const p = period || 'all';
    if (blocked) return blocked;
    if (['all', 'month', 'week', 'day'].indexOf(p) < 0) return { status: 'error', message: '无效榜单周期。' };
    const cached = cache.get(p);
    if (cached && now() - cached.time >= 0 && now() - cached.time < 30000) return cached.value;
    if (pending.has(p)) return pending.get(p);
    const job = (async function () {
      const available = await platform.capability(['getRankList', 'getMyRank'], 9510);
      if (available.status !== 'available') return available;
      try {
        const list = await read(available.api, 'getRankList', { board: BOARD, period: p });
        const mine = await read(available.api, 'getMyRank', { board: BOARD, period: p });
        if (!list || !Array.isArray(list.data) || !mine || ['EXACT', 'OVER_LIMIT', 'NO_SCORE', 'NOT_PARTICIPATING'].indexOf(mine.status) < 0) throw new Error('排行榜响应格式异常。');
        const rows = list.data.map(row => {
          if (!row || !finite(row.score) || row.score >= 0 || row.score < -1000000 || !Number.isInteger(row.rank) || row.rank < 1) throw new Error('榜单成绩单位异常，不能显示为有效哄睡成绩。');
          return { rank: row.rank, elapsedMs: -row.score * 1000, nickname: typeof row.nickname === 'string' && row.nickname ? row.nickname : '小红薯' };
        });
        let me = { status: mine.status, rank: null, elapsedMs: null };
        if (mine.status === 'EXACT') {
          if (!Number.isInteger(mine.rank) || mine.rank < 1 || mine.rank > 500 || !finite(mine.score) || mine.score >= 0 || mine.score < -1000000) throw new Error('本人排名响应异常。');
          me = { status: mine.status, rank: mine.rank, elapsedMs: -mine.score * 1000 };
        }
        const value = { status: 'ready', rows: rows, mine: me, period: p, empty: rows.length === 0, message: '排行榜为内测能力，需 9.51+ 与平台授权。' };
        cache.set(p, { time: now(), value: value }); return value;
      } catch (e) { return failure(e); }
    })();
    pending.set(p, job);
    try { return await job; } finally { pending.delete(p); }
  }
  function submitRun(run) {
    if (!run || !run.finished || !run.eligible || run.practice || run.invalidReason || !finite(run.elapsedMs) || run.elapsedMs <= 0 || run.elapsedMs > 1000000000 || !Number.isInteger(run.runId)) return Promise.resolve({ status: 'skipped', message: '练习或无效计时不参与排名。' });
    if (submitted.has(run.runId)) return submitted.get(run.runId);
    const job = (async function () {
      if (blocked) return blocked;
      const available = await platform.capability(['submitScore'], 9510);
      if (available.status !== 'available') return available;
      try {
        const result = await available.api.submitScore({ board: BOARD, score: -run.elapsedMs / 1000 });
        cache.clear();
        if (!result || !finite(result.score) || result.score >= 0 || result.score < -1000000) return { status: 'uncertain', message: '平台返回成绩异常，不会重复提交。' };
        return { status: 'submitted', bestElapsedMs: -result.score * 1000, message: '成绩已提交，排名以平台结果为准。' };
      } catch (e) { return failure(e); }
    })();
    submitted.set(run.runId, job); return job;
  }
  return { load: load, submitRun: submitRun, getRestriction: () => blocked };
}

export async function shareGoodnight(dataURI, options) {
  const o = options || {};
  if (typeof dataURI !== 'string' || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(dataURI)) return { status: 'error', message: '晚安卡尚未生成，请重试。' };
  const available = await (o.platform || createPlatform(o)).capability(['postNote'], 0);
  if (available.status !== 'available') return available;
  try {
    await available.api.postNote({ title: '分享这份晚安', content: '玩了一局守卫睡眠小游戏，突然感觉好困呀。晚安。\n\n#小红书小工具[话题]# #哄睡[话题]# #妈妈的多重宇宙[话题]# #对全世界说晚安[话题]#', pageType: 'photo_publish', mediaInfo: { image_resources: [{ url: dataURI }] } });
    return { status: 'publish_flow_completed', message: '已完成发布页操作；笔记是否发布成功及审核结果请以小红书为准。' };
  } catch (e) { return errorState(e); }
}
export async function followAuthor(options) { return followCall('followAuthor', options); }
export async function getFollowStatus(options) { return followCall('getFollowStatus', options); }
async function followCall(method, options) {
  const o = options || {};
  const available = await (o.platform || createPlatform(o)).capability([method], 9510);
  if (available.status !== 'available') return available;
  try {
    const result = await available.api[method]();
    const state = result && result.follow_status;
    const messages = { '-1': '关注状态获取或操作失败，请稍后重试。', '0': '尚未关注作者。', '1': '已关注作者。', '2': '你是这个小工具的作者。' };
    if ([-1, 0, 1, 2].indexOf(state) < 0) throw new Error('关注状态响应异常。');
    return { status: state === -1 ? 'error' : 'ready', followStatus: state, message: messages[String(state)] };
  } catch (e) {
    if (e && e.errCode === 20002) return { status: 'cancelled', code: 20002, message: '已取消关注操作。' };
    if (e && e.errCode === 15404) return { status: 'limited', code: 15404, message: '今日关注引导次数已达上限。' };
    if (method === 'followAuthor' && e && e.errCode === 10003) return { status: 'pending', code: 10003, message: '关注确认流程尚未结束，请先完成或关闭当前确认框。' };
    return errorState(e);
  }
}

// Saves only a duration, never profile information. Caller must surface failure.
export function createFastestStore(options) {
  const o = options || {}; const platform = o.platform || createPlatform(o);
  let best = null; let chain = Promise.resolve();
  async function storage() {
    const available = await platform.capability(['getStorage', 'setStorage'], 9460);
    if (available.status === 'available') return {
      read: async () => (await available.api.getStorage({ key: FASTEST_KEY })).data,
      write: data => available.api.setStorage({ key: FASTEST_KEY, data: data })
    };
    const local = o.localStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!local) throw new Error('本机存储不可用。');
    return { read: () => local.getItem(FASTEST_KEY), write: data => local.setItem(FASTEST_KEY, data) };
  }
  async function load() {
    try {
      const raw = await (await storage()).read();
      const value = raw === null || raw === undefined ? null : JSON.parse(raw);
      best = finite(value) && value > 0 && value <= 1000000000 ? value : null;
      return { status: 'ready', bestElapsedMs: best };
    } catch (e) { return { status: 'error', bestElapsedMs: best, message: '本机纪录读取失败。' }; }
  }
  function record(run) {
    chain = chain.then(async function () {
      if (!run || !run.finished || !run.eligible || run.practice || run.invalidReason || !finite(run.elapsedMs) || run.elapsedMs <= 0 || run.elapsedMs > 1000000000) return { status: 'skipped', bestElapsedMs: best };
      const loaded = await load();
      if (loaded.status !== 'ready') return loaded;
      if (best !== null && best <= run.elapsedMs) return loaded;
      try { await (await storage()).write(JSON.stringify(run.elapsedMs)); best = run.elapsedMs; return { status: 'saved', bestElapsedMs: best }; }
      catch (e) { return { status: 'error', bestElapsedMs: best, message: '本机纪录保存失败。' }; }
    }); return chain;
  }
  return { load: load, record: record };
}
