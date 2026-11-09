(function () {
  'use strict';
  // Official miniTool APIs only. Nicknames and rank responses stay in memory.
  var PERIODS = ['day', 'week', 'month', 'all'];
  var LABELS = { day: '日榜', week: '周榜', month: '月榜', all: '总榜' };
  var CACHE_MS = 45000, API_TIMEOUT = 8000, MIN_VERSION = 9510;
  var available = false, playing = false, opened = false, period = 'all';
  var viewSequence = 0, openSequence = 0, roundSequence = 0, cacheGeneration = 0, settlementSequence = 0;
  var settlement = null, suspended = false, initialized = false;
  var cache = Object.create(null), inflight = Object.create(null), overlayFitStarted = false;
  var seen = new WeakSet(), previousFocus = null, shownRows = [], visibleCount = 0;

  function el(name) { return (name.indexOf('rank-') === 0 && document.getElementById(name)) || document.getElementById('leaderboard-' + name); }
  function put(name, value) { var node = el(name); if (node) { node.textContent = value; if (name === 'submit-status') node.hidden = !value; } }
  function attr(node, name, value) { if (node && node.setAttribute) node.setAttribute(name, value); }
  function api() { return window.xhs && window.xhs.miniTool; }
  function methodsExist() {
    var m = api();
    return !!m && ['submitScore', 'getRankList', 'getMyRank'].every(function (name) { return typeof m[name] === 'function'; });
  }
  function error(kind) { return { leaderboardError: kind }; }
  function codeOf(err) { return err && Number.isInteger(err.errCode) ? err.errCode : null; }
  function denied(err) { var code = codeOf(err); return code === 1005 || code === 1006 || code === 10003; }
  function hasFailed(result) {
    return result && ((result.errCode !== undefined && result.errCode !== 0) ||
      (typeof result.errMsg === 'string' && /:fail\b|cancel|取消/i.test(result.errMsg)));
  }
  function timed(operation, milliseconds) {
    return new Promise(function (resolve, reject) {
      var settled = false, timer = setTimeout(function () { finish(error('timeout')); }, milliseconds);
      function finish(err, value) {
        if (settled) return;
        settled = true; clearTimeout(timer);
        if (err) reject(err); else resolve(value);
      }
      Promise.resolve(operation).then(function (value) {
        if (hasFailed(value)) finish(value); else finish(null, value);
      }, function (err) { finish(err || error('unknown')); });
    });
  }
  function invoke(name, params) {
    var m = api();
    if (!m || typeof m[name] !== 'function') return Promise.reject(error('unavailable'));
    try { return timed(m[name](params), API_TIMEOUT); }
    catch (err) { return Promise.reject(err || error('unknown')); }
  }
  function buildVersion(options) {
    var value = options && options.miniToolEnv && options.miniToolEnv.buildVersion;
    var n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n / 1000) : 0;
  }
  async function init() {
    var x = window.xhs, version = buildVersion(x && x.launchOptions), m = api();
    if (!version && m && typeof m.getLaunchOptions === 'function') {
      try { version = buildVersion(await timed(m.getLaunchOptions(), 3000)); } catch (ignore) {}
    }
    available = version >= MIN_VERSION && methodsExist();
    initialized = true;
    controls(); localRecord();
    if (available) fitOverlay();
    if (!available) put('status', '当前环境暂不可用排行榜，可继续游戏并查看本机记录。');
    return available;
  }
  function overlayInset(value) {
    var panel = el('panel');
    if (panel && panel.style && typeof panel.style.setProperty === 'function') panel.style.setProperty('--leaderboard-top-inset', value);
  }
  async function fitOverlay() {
    if (overlayFitStarted) return;
    overlayFitStarted = true;
    var m = api();
    if (!available || !m || typeof m.getWindowInfo !== 'function') return;
    try {
      // Optional one-shot geometry lookup. A slow bridge never delays ready,
      // opening, closing, gameplay, or rank requests.
      var info = await timed(m.getWindowInfo(), 2000);
      if (!info || !info.safeArea || !Number.isFinite(info.safeArea.top) || !info.menuButtons || typeof info.menuButtons !== 'object') return;
      var top = Math.max(0, info.safeArea.top) + 52, platform = window.DurianPlatform;
      if (platform && typeof platform.layout === 'function') {
        var layout = platform.layout(info);
        if (layout && Number.isFinite(layout.top)) top = Math.max(0, layout.top, info.safeArea.top + 8);
      }
      // The game HUD is narrow; its horizontal collision test is insufficient
      // for this full-width overlay. Clear every visible native menu button.
      Object.keys(info.menuButtons).forEach(function (key) {
        var box = info.menuButtons[key];
        if (box && Number.isFinite(box.bottom)) top = Math.max(top, box.bottom + 8);
      });
      overlayInset(top + 'px');
    } catch (ignore) { /* Keep the conservative CSS fallback; no retries. */ }
  }
  function localRecordText() {
    var best = window.survival && window.survival.best;
    return best && Number.isInteger(best.coins) && best.coins >= -200 && best.coins <= 400 ?
      '本机最高：' + best.coins + ' 金币（当前可读记录）' : '本机暂无可读最高记录';
  }
  function localRecord() { put('local', localRecordText()); }
  function controls() {
    var entry = el('open'), more = el('more'), closeButton = el('close');
    if (entry) { entry.hidden = !available || playing; entry.disabled = !available || playing; }
    PERIODS.forEach(function (p) {
      var button = el('rank-' + p);
      if (button) button.disabled = !available || playing;
      attr(button, 'aria-pressed', p === period ? 'true' : 'false');
    });
    var refresh = el('refresh'); if (refresh) refresh.disabled = !available || playing;
    if (more) { more.hidden = !available || playing || visibleCount >= shownRows.length; more.disabled = !available || playing; }
    // A failed authorization or a pending bridge call must never trap the dialog.
    if (closeButton) closeButton.disabled = false;
    var unavailableEntry = el('entry-unavailable');
    if (unavailableEntry) {
      unavailableEntry.hidden = available || playing || !!settlement;
      unavailableEntry.textContent = '当前环境暂不可用排行榜，仍可游戏并查看本机记录。';
    }
    settlementControls();
  }
  function stopReads(scope) {
    Object.keys(inflight).forEach(function (key) {
      var request = inflight[key];
      if (scope === 'panel') request.panel = false;
      else if (scope === 'settlement') request.round = 0;
      else { request.panel = false; request.round = 0; }
      // Dismissing the dialog must not cancel its independently visible summary.
      if (!canContinue(request)) {
        request.cancelled = true;
        if (request.cancelWait) request.cancelWait();
      }
    });
  }
  function hideUnavailable() {
    available = false; cache = Object.create(null); cacheGeneration += 1;
    viewSequence += 1; stopReads(); shownRows = []; visibleCount = 0;
    clearList(); controls(); localRecord();
    put('status', '排行榜暂不可用，可继续游戏并查看本机记录。');
    put('mine', '本人排名暂不可用');
    unavailableSettlement('排行榜暂不可用，可继续游戏并查看本机记录。');
  }
  function resetKey(p) {
    // Shift to Beijing civil time, then use UTC accessors independent of device TZ.
    var shifted = Date.now() + 8 * 60 * 60 * 1000, day = Math.floor(shifted / 86400000);
    if (p === 'day') return String(day);
    if (p === 'week') return String(Math.floor((day + 3) / 7));
    if (p === 'month') { var date = new Date(shifted); return date.getUTCFullYear() + '-' + date.getUTCMonth(); }
    return 'all';
  }
  function keyFor(name, p) { return cacheGeneration + ':' + name + ':' + p + ':' + resetKey(p); }
  function finiteScore(value) { return typeof value === 'number' && Number.isFinite(value) && value >= -1000000 && value <= 1000000; }
  function normalize(name, result) {
    if (name === 'getRankList') {
      if (!result || !Array.isArray(result.data)) throw error('malformed');
      return result.data.slice(0, 100).map(function (row) {
        if (!row || !Number.isInteger(row.rank) || row.rank < 1 || row.rank > 100 || !finiteScore(row.score)) throw error('malformed');
        var nickname = typeof row.nickname === 'string' ? row.nickname.trim().slice(0, 80) : '';
        return { rank: row.rank, score: row.score, nickname: nickname || '小红薯' };
      });
    }
    if (!result || typeof result.status !== 'string') throw error('malformed');
    if (result.status === 'EXACT') {
      if (!Number.isInteger(result.rank) || result.rank < 1 || result.rank > 500 || !finiteScore(result.score)) throw error('malformed');
      return { status: 'EXACT', rank: result.rank, score: result.score };
    }
    if (['OVER_LIMIT', 'NO_SCORE', 'NOT_PARTICIPATING'].indexOf(result.status) === -1 || result.rank !== null || result.score !== null) throw error('malformed');
    return { status: result.status, rank: null, score: null };
  }
  function currentSettlement(round) { return !!settlement && settlement.round === round && round === roundSequence && !playing; }
  function canContinue(request) {
    return available && !playing && !document.hidden && !suspended && !request.cancelled &&
      ((request.panel && opened) || (request.round && currentSettlement(request.round)));
  }
  function pause(request, milliseconds) {
    return new Promise(function (resolve, reject) {
      if (!canContinue(request)) { reject(error('paused')); return; }
      var timer, done = false;
      function finish(cancelled) {
        if (done) return; done = true; clearTimeout(timer); request.cancelWait = null;
        if (cancelled || !canContinue(request)) reject(error('paused')); else resolve();
      }
      request.cancelWait = function () { finish(true); };
      timer = setTimeout(function () { finish(false); }, milliseconds);
    });
  }
  async function readWithRetry(request, name, p) {
    var attempts = 0, notReadyRetries = 0, serviceRetries = 0;
    while (attempts < 5) {
      if (!canContinue(request)) throw error('paused');
      attempts += 1;
      try {
        var result = await invoke(name, { board: 1, period: p });
        if (!canContinue(request)) throw error('paused');
        return normalize(name, result);
      } catch (err) {
        if (denied(err)) { hideUnavailable(); throw err; }
        var code = codeOf(err), delay = 0;
        if (code === 2002 && notReadyRetries < 4) delay = [500, 1000, 2000, 4000][notReadyRetries++];
        else if ((code === 2008 || code === 2999) && serviceRetries < 1) { serviceRetries += 1; delay = 1000; }
        if (!delay || attempts >= 5) throw err;
        await pause(request, delay);
      }
    }
    throw error('unavailable');
  }
  function read(name, p, force, round) {
    var key = keyFor(name, p), now = Date.now(), saved = cache[key];
    // Drop expired / obsolete entries, so nicknames do not accumulate in memory.
    Object.keys(cache).forEach(function (k) { if (now - cache[k].at >= CACHE_MS || k.split(':')[0] !== String(cacheGeneration)) delete cache[k]; });
    if (!force && saved && now - saved.at < CACHE_MS) return Promise.resolve(saved.value);
    if (inflight[key] && !inflight[key].cancelled) {
      if (round) inflight[key].round = round; else inflight[key].panel = true;
      return inflight[key].promise;
    }
    var request = { cancelled: false, cancelWait: null, promise: null, panel: !round, round: round || 0 };
    inflight[key] = request;
    request.promise = readWithRetry(request, name, p).then(function (value) {
      if (key === keyFor(name, p) && !request.cancelled) cache[key] = { at: Date.now(), value: value };
      return value;
    }).then(function (value) { if (inflight[key] === request) delete inflight[key]; return value; }, function (err) {
      if (inflight[key] === request) delete inflight[key]; throw err;
    });
    return request.promise;
  }
  function clearList() {
    var list = el('list');
    if (list) list.textContent = '';
    var more = el('more'); if (more) more.hidden = true;
  }
  function renderRows() {
    var list = el('list');
    if (list && document.createElement && list.appendChild) {
      list.textContent = '';
      shownRows.slice(0, visibleCount).forEach(function (row) {
        var item = document.createElement('li'); item.className = 'leaderboard-row';
        [['rank', String(row.rank)], ['name', row.nickname], ['score', row.score + ' 金币']].forEach(function (part) {
          var span = document.createElement('span'); span.className = 'leaderboard-' + part[0]; span.textContent = part[1]; item.appendChild(span);
        });
        list.appendChild(item);
      });
    }
    controls();
  }
  function mineText(value) {
    if (value.status === 'EXACT') return '我的排名：第 ' + value.rank + ' 名 · ' + value.score + ' 金币';
    if (value.status === 'OVER_LIMIT') return '我的排名：500+（已有成绩）';
    if (value.status === 'NO_SCORE') return '本期暂无成绩，完成一局后可参与本期排名。';
    return '尚未参与排行榜，完成一局后可参与排名。';
  }
  function readError(err) {
    var code = codeOf(err), kind = err && err.leaderboardError;
    if (code === 2002) return '榜单仍在准备，请稍后刷新。';
    if (code === 2009) return '查询较频繁，请稍后再刷新。';
    if (kind === 'paused') return '查询已暂停，可重新刷新。';
    if (kind === 'malformed') return '榜单返回数据暂不可用，请稍后刷新。';
    return '暂时无法读取榜单，请稍后刷新。';
  }
  function settle(promise) { return promise.then(function (value) { return { ok: true, value: value }; }, function (err) { return { ok: false, error: err }; }); }
  async function load(force) {
    if (!available || playing || !opened || document.hidden || suspended) return false;
    var sequence = ++viewSequence, selected = period, listKey = keyFor('getRankList', selected), ownKey = keyFor('getMyRank', selected);
    shownRows = []; visibleCount = 0; clearList(); controls(); localRecord();
    put('title', '净赚榜 · ' + LABELS[selected]);
    put('status', '正在加载榜单…'); put('mine', '正在查询本人排名…');
    var values = await Promise.all([settle(read('getRankList', selected, force)), settle(read('getMyRank', selected, force))]);
    if (sequence !== viewSequence || !opened || playing || !available || document.hidden || suspended || period !== selected) return false;
    if (listKey !== keyFor('getRankList', selected) || ownKey !== keyFor('getMyRank', selected)) {
      put('status', '榜单周期或成绩已更新，请刷新。'); put('mine', '本人排名待刷新'); return false;
    }
    if (values[0].ok) {
      shownRows = values[0].value; visibleCount = Math.min(20, shownRows.length); renderRows();
      put('status', shownRows.length ? '展示前 ' + shownRows.length + ' 名，分数越高排名越靠前。' : '本期还没有上榜成绩。');
    } else put('status', readError(values[0].error));
    put('mine', values[1].ok ? mineText(values[1].value) : '本人排名暂不可用。' + readError(values[1].error));
    return values[0].ok && values[1].ok;
  }
  function validSnapshot(s) {
    if (!s || typeof s !== 'object' || s.demo === true) return false;
    if (!['coins', 'whole', 'smashed', 'settled', 'hits'].every(function (key) { return Number.isInteger(s[key]); })) return false;
    return s.whole >= 0 && s.smashed >= 0 && s.settled > 0 && s.settled <= 20 &&
      s.whole + s.smashed === s.settled && s.hits >= 0 && s.hits <= 6 &&
      s.coins === s.whole * 20 - s.smashed * 10 && s.coins >= -200 && s.coins <= 400;
  }
  function settlementEl(name) { return document.getElementById('settlement-rank' + (name ? '-' + name : '')); }
  function settlementPut(name, value) { var node = settlementEl(name); if (node) node.textContent = value; }
  function settlementControls() {
    var current = settlement && currentSettlement(settlement.round), panel = settlementEl('');
    if (panel) panel.hidden = !current;
    var entry = settlementEl('open'), refresh = settlementEl('refresh');
    if (entry) { entry.hidden = !available || !current; entry.disabled = !available || !current; }
    if (refresh) { refresh.hidden = !available || !current; refresh.disabled = !available || !current || settlement.submission === 'pending'; }
  }
  function clearSettlement() {
    settlementSequence += 1; settlement = null; stopReads('settlement');
    settlementPut('list', ''); settlementPut('status', ''); settlementPut('mine', ''); settlementControls();
  }
  function submissionNote() {
    if (!settlement) return '';
    if (settlement.submission === 'unknown') return ' 本局提交待确认，不会重复提交；总榜名次不代表本局已写入。';
    if (settlement.submission === 'failed') return ' 本局提交未成功，展示平台现有总榜，不代表本局已写入。';
    return '';
  }
  function unavailableSettlement(message) {
    if (!settlement || !currentSettlement(settlement.round)) return;
    settlementSequence += 1;
    settlement.status = 'UNAVAILABLE'; settlement.rank = null; settlement.score = null; settlement.observedAt = null;
    if (!document.hidden && !suspended) {
      settlementPut('list', '');
      settlementPut('status', message + submissionNote());
      settlementPut('mine', '我的总榜排名暂不可用。' + localRecordText());
    }
    settlementControls();
  }
  function settlementMine(value) {
    if (value.status === 'EXACT') return '我的总榜排名：第 ' + value.rank + ' 名 · 历史最高 ' + value.score + ' 金币';
    if (value.status === 'OVER_LIMIT') return '我的总榜排名：500+（已有成绩）';
    if (value.status === 'NO_SCORE') return '总榜暂无我的成绩，以平台查询结果为准。';
    return '尚未参与总榜，以平台查询结果为准。';
  }
  function settlementRows(rows) {
    var list = settlementEl('list');
    if (!list || !document.createElement || !list.appendChild) return;
    list.textContent = '';
    rows.slice(0, 3).forEach(function (row) {
      var item = document.createElement('li'); item.className = 'settlement-rank-row';
      [['rank', String(row.rank)], ['name', row.nickname], ['score', row.score + ' 金币']].forEach(function (part) {
        var span = document.createElement('span'); span.className = 'settlement-rank-' + part[0]; span.textContent = part[1]; item.appendChild(span);
      });
      list.appendChild(item);
    });
  }
  async function loadSettlement(force) {
    if (!settlement || !currentSettlement(settlement.round) || document.hidden || suspended || settlement.submission === 'pending') return false;
    if (!available || !methodsExist()) { unavailableSettlement('当前环境暂不可用排行榜，可查看本机记录。'); return false; }
    var round = settlement.round, sequence = ++settlementSequence, ownObservedAt = null;
    var listKey = keyFor('getRankList', 'all'), ownKey = keyFor('getMyRank', 'all');
    settlement.status = 'LOADING'; settlement.rank = null; settlement.score = null; settlement.observedAt = null;
    settlementPut('list', ''); settlementPut('status', '正在加载总榜前 3 名…' + submissionNote());
    settlementPut('mine', '正在查询我的总榜排名…'); settlementControls();
    var values = await Promise.all([settle(read('getRankList', 'all', force, round)),
      settle(read('getMyRank', 'all', force, round).then(function (value) {
        // A slower list request must not make an earlier own-rank response look
        // freshly observed, even if another read prunes its cache entry.
        ownObservedAt = cache[ownKey] ? cache[ownKey].at : null; return value;
      }))]);
    if (sequence !== settlementSequence || !currentSettlement(round) || !available || document.hidden || suspended) return false;
    if (listKey !== keyFor('getRankList', 'all') || ownKey !== keyFor('getMyRank', 'all')) {
      unavailableSettlement('总榜成绩已更新，请刷新查看。'); return false;
    }
    if (values[0].ok) {
      settlementRows(values[0].value);
      settlementPut('status', (values[0].value.length ? '总榜前 3 名' : '总榜还没有上榜成绩。') + submissionNote());
    } else settlementPut('status', '总榜前 3 暂不可用。' + readError(values[0].error) + submissionNote() + ' ' + localRecordText());
    var ownUsable = values[1].ok && ownObservedAt !== null && Date.now() >= ownObservedAt && Date.now() - ownObservedAt < CACHE_MS;
    if (ownUsable) {
      var own = values[1].value;
      settlement.status = own.status; settlement.rank = own.rank; settlement.score = own.score;
      settlement.observedAt = ownObservedAt;
      settlementPut('mine', settlementMine(own));
    } else {
      settlement.status = 'UNAVAILABLE'; settlement.rank = null; settlement.score = null; settlement.observedAt = null;
      settlementPut('mine', (values[1].ok ? '我的总榜排名已过期，请刷新。' : '我的总榜排名暂不可用。' + readError(values[1].error)) + ' ' + localRecordText());
    }
    return values[0].ok && ownUsable;
  }
  function settlementMatchesSession(session) {
    if (!session) return !settlement.session;
    return session === settlement.session && session.demo !== true && session.gameOver !== false &&
      (session.coins === undefined || session.coins === settlement.runCoins) &&
      session.totals === settlement.totalsToken && session.resultRounds === settlement.roundsToken;
  }
  function getShareSnapshot(session) {
    // Read-only, synchronous, and detached: sharing never submits or queries.
    var current = settlement && currentSettlement(settlement.round) &&
      settlementMatchesSession(session === undefined ? window.survival : session);
    var state = current ? settlement : null;
    var usable = state && (available || !initialized) && !document.hidden && !suspended;
    if (usable && state.observedAt !== null && (Date.now() - state.observedAt >= CACHE_MS || Date.now() < state.observedAt)) usable = false;
    var status = usable ? state.status : 'UNAVAILABLE';
    return Object.freeze({ period: 'all', label: '总榜', status: status,
      rank: status === 'EXACT' ? state.rank : null, score: status === 'EXACT' ? state.score : null,
      observedAt: usable ? state.observedAt : null, runCoins: state ? state.runCoins : null,
      submission: state ? state.submission : 'unavailable' });
  }
  function invalidateCache(round) {
    // A late former write still evicts stored ranks, but cannot invalidate or
    // repaint the independently running query for a newer settlement.
    if (round === roundSequence) cacheGeneration += 1;
    cache = Object.create(null);
  }
  function finishSettlement(round, submission, message) {
    if (!currentSettlement(round)) return;
    settlement.submission = submission; settlement.submissionText = message;
    controls();
    if (document.hidden || suspended) return;
    put('submit-status', message);
    if (available) {
      // The summary owns this read even if the full dialog has never opened.
      loadSettlement(true);
      if (opened) load(false);
    } else unavailableSettlement('排行榜暂不可用，可继续游戏并查看本机记录。');
  }
  async function record(snapshot) {
    if (!validSnapshot(snapshot) || seen.has(snapshot) || (window.survival && window.survival.demo)) return false;
    seen.add(snapshot);
    // Copy the original score before awaiting capability detection. Never scale,
    // round, clamp, or compare with a previous best before submitting this run.
    var score = snapshot.coins, round = ++roundSequence;
    clearSettlement();
    settlement = { round: round, status: 'LOADING', rank: null, score: null, observedAt: null,
      runCoins: score, submission: 'pending', submissionText: '正在确认排行榜能力…', session: window.survival,
      totalsToken: window.survival && window.survival.totals, roundsToken: window.survival && window.survival.resultRounds };
    settlementPut('list', '');
    if (!document.hidden && !suspended) {
      settlementPut('status', '正在加载总榜…'); settlementPut('mine', '正在提交本局成绩，随后查询我的总榜排名…');
      put('submit-status', settlement.submissionText);
    }
    localRecord(); controls();
    await ready;
    if (!available || !methodsExist()) {
      if (available) hideUnavailable();
      finishSettlement(round, 'unavailable', '排行榜暂不可用；本局可继续查看本机记录。');
      return false;
    }
    if (currentSettlement(round)) {
      settlement.submissionText = '正在提交本局 ' + score + ' 金币…';
      if (!document.hidden && !suspended) put('submit-status', settlement.submissionText);
    }
    try {
      // One write per genuine onResult snapshot. No retry, including timeouts.
      var result = await invoke('submitScore', { board: 1, score: score });
      if (!result || !finiteScore(result.score)) throw error('unknown');
      invalidateCache(round);
      finishSettlement(round, 'success', '本局成绩已提交；总榜历史最高：' + result.score + ' 金币。');
      return true;
    } catch (err) {
      if (denied(err)) hideUnavailable();
      var code = codeOf(err), unknown = code === 2004 || code === null;
      // An unknown write may already have committed. Query the platform after a
      // finished attempt, without ever resending a write.
      if (!denied(err)) invalidateCache(round);
      if (unknown) {
        finishSettlement(round, 'unknown', '本局提交结果待确认，不会重复提交；正在查询总榜，以平台排名为准。');
      } else if (denied(err)) {
        finishSettlement(round, 'unavailable', '排行榜暂不可用；本局不会重复提交，可查看本机记录。');
      } else {
        finishSettlement(round, 'failed', '本局提交未成功（错误 ' + code + '），不会重复提交；可稍后查询排行榜。');
      }
      return false;
    }
  }
  function close() {
    var wasOpen = opened; opened = false; openSequence += 1; viewSequence += 1; stopReads('panel');
    var panel = el('panel'); if (panel) panel.hidden = true;
    attr(el('open'), 'aria-expanded', 'false');
    if (wasOpen && previousFocus && typeof previousFocus.focus === 'function') {
      try { previousFocus.focus(); } catch (ignore) {}
    }
    previousFocus = null;
    return wasOpen;
  }
  async function open() {
    var intent = ++openSequence;
    await ready;
    if (intent !== openSequence) return false;
    if (!available || playing || document.hidden || suspended) return false;
    if (!methodsExist()) { hideUnavailable(); return false; }
    fitOverlay();
    if (!opened) previousFocus = document.activeElement || el('open');
    opened = true;
    var panel = el('panel'); if (panel) panel.hidden = false;
    attr(el('open'), 'aria-expanded', 'true');
    var closeButton = el('close'); if (closeButton && closeButton.focus) closeButton.focus();
    return load(false);
  }
  function setPlaying(value) {
    var next = !!value;
    if (next && !playing) { roundSequence += 1; clearSettlement(); put('submit-status', ''); close(); }
    playing = next; controls(); localRecord();
  }
  function on(name, handler) { var node = el(name); if (node && node.addEventListener) node.addEventListener('click', handler); }
  on('open', open); on('close', close); on('refresh', function () { load(true); });
  var settlementOpen = settlementEl('open'), settlementRefresh = settlementEl('refresh');
  if (settlementOpen && settlementOpen.addEventListener) settlementOpen.addEventListener('click', function () {
    if (!settlement || !available || !currentSettlement(settlement.round)) return;
    period = 'all'; open();
  });
  if (settlementRefresh && settlementRefresh.addEventListener) settlementRefresh.addEventListener('click', function () { loadSettlement(true); });
  on('more', function () {
    if (!available || playing || !opened) return;
    visibleCount = Math.min(shownRows.length, visibleCount + 20); renderRows();
  });
  PERIODS.forEach(function (p) { on('rank-' + p, function () { if (!available || playing || !opened) return; period = p; load(false); }); });
  if (document.addEventListener) {
    document.addEventListener('keydown', function (event) {
      if (opened && (event.key === 'Escape' || event.keyCode === 27)) { if (event.preventDefault) event.preventDefault(); close(); }
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) suspendReads(); else resumeView();
    });
  }
  function suspendReads() {
    // Foregrounding does not resume retries or revive a previous rank snapshot.
    stopReads(); viewSequence += 1; settlementSequence += 1;
    if (settlement) {
      settlement.status = 'UNAVAILABLE'; settlement.rank = null; settlement.score = null; settlement.observedAt = null;
      settlementPut('list', ''); settlementPut('status', '总榜查询已暂停，返回后可刷新。');
      settlementPut('mine', '我的总榜排名待刷新。' + localRecordText());
    }
    suspended = true;
  }
  function resumeView() {
    suspended = false;
    if (settlement && currentSettlement(settlement.round)) {
      put('submit-status', settlement.submissionText);
      if (!available) unavailableSettlement('排行榜暂不可用，可继续游戏并查看本机记录。');
    }
  }
  if (window.addEventListener) { window.addEventListener('pagehide', suspendReads); window.addEventListener('pageshow', resumeView); }
  var panel = el('panel'); if (panel) panel.hidden = true;
  overlayInset('calc(var(--hud-offset, 96px) + 44px)');
  attr(panel, 'role', 'dialog'); attr(panel, 'aria-modal', 'true');
  attr(panel, 'aria-labelledby', 'leaderboard-title');
  controls();
  var ready = init();
  window.DurianLeaderboard = { ready: ready, record: record, setPlaying: setPlaying, open: open, close: close, getShareSnapshot: getShareSnapshot };
}());
