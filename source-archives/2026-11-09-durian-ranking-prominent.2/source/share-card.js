(function () {
  'use strict';
  // Rebuilt sharing artwork and flow. This is not recovered 1.0.3 source.
  var artPromise = null;
  var topics = '#小红书小工具[话题]# #Web coding小游戏[话题]# #小游戏[话题]# #榴莲[话题]# #榴莲刺客[话题]#';
  var title = '榴莲刺客｜本局战绩';
  function integer(value, nonnegative) {
    var n = Number(value);
    if (!Number.isFinite(n)) return 0;
    n = Math.max(-9007199254740991, Math.min(9007199254740991, Math.trunc(n)));
    return nonnegative ? Math.max(0, n) : n;
  }
  function rankingSnapshot(session) {
    var unavailable = Object.freeze({period: 'all', label: '总榜', status: 'UNAVAILABLE', rank: null, score: null,
      observedAt: null, runCoins: null, submission: 'unavailable'});
    try {
      var leaderboard = window.DurianLeaderboard;
      if (!leaderboard || typeof leaderboard.getShareSnapshot !== 'function') return unavailable;
      // Read only once, at the user's click. Never await a rank request here or
      // let a later response change either the JPEG or its matching caption.
      var value = leaderboard.getShareSnapshot(session);
      if (!value || value.period !== 'all' ||
          ['EXACT', 'OVER_LIMIT', 'NO_SCORE', 'NOT_PARTICIPATING', 'LOADING', 'UNAVAILABLE'].indexOf(value.status) === -1 ||
          ['pending', 'success', 'unknown', 'failed', 'unavailable'].indexOf(value.submission) === -1) return unavailable;
      // Matching run scores are an extra guard. The leaderboard getter also
      // checks the finished-session identity, including consecutive equal runs.
      if (!Number.isInteger(session.coins) || value.runCoins !== session.coins) return unavailable;
      if (value.observedAt !== null && !(typeof value.observedAt === 'number' && Number.isFinite(value.observedAt) && value.observedAt >= 0)) return unavailable;
      if (value.status === 'EXACT') {
        if (!Number.isInteger(value.rank) || value.rank < 1 || value.rank > 500 ||
            typeof value.score !== 'number' || !Number.isFinite(value.score) || Math.abs(value.score) > 1000000 ||
            value.observedAt === null) return unavailable;
      } else if (value.rank !== null || value.score !== null || (value.status === 'OVER_LIMIT' && value.observedAt === null)) return unavailable;
      return Object.freeze({period: 'all', label: '总榜', status: value.status, rank: value.rank, score: value.score,
        observedAt: value.observedAt, runCoins: value.runCoins, submission: value.submission});
    } catch (ignore) { return unavailable; }
  }
  function rankingCopy(ranking) {
    var rank = ranking || {status: 'UNAVAILABLE', submission: 'unavailable'}, value, detail;
    if (rank.status === 'EXACT') { value = '第 ' + rank.rank + ' 名'; detail = '历史最高：' + rank.score + ' 金币'; }
    else if (rank.status === 'OVER_LIMIT') { value = '500+'; detail = '已参与总榜 · 500 名以外'; }
    else if (rank.status === 'LOADING') { value = '排名更新中'; detail = '查询尚未完成，也可先分享本局'; }
    else if (rank.status === 'NO_SCORE') { value = '本期无成绩'; detail = '平台暂未返回本人的总榜成绩'; }
    else if (rank.status === 'NOT_PARTICIPATING') { value = '排名暂不可得'; detail = '尚未参与排行榜'; }
    else { value = '排名暂不可得'; detail = '可继续分享本局战绩'; }
    var note = '以平台查询结果为准';
    if (rank.submission === 'unknown') note = '本局提交待确认 · 以平台排名为准';
    else if (rank.submission === 'pending') note = '本局提交中 · 排名可能尚未更新';
    else if (rank.submission === 'failed') note = '本局提交未成功 · 以平台排名为准';
    else if (rank.submission === 'success') note = '本局已提交 · 排名以查询时为准';
    return {value: value, detail: detail, note: note};
  }
  function snapshot(session) {
    session = session || {};
    var totals = session.totals || {};
    return Object.freeze({
      whole: integer(totals.whole, true),
      smashed: integer(totals.smashed, true),
      hits: integer(session.injuryRounds ? session.injuryRounds.size : 0, true),
      coins: integer(session.coins, false),
      ranking: rankingSnapshot(session)
    });
  }
  function caption(score) {
    var rank = rankingCopy(score.ranking);
    return '本局接住 ' + score.whole + ' 颗，摔碎 ' + score.smashed + ' 颗，被砸 ' + score.hits + ' 次，净收入 ' + score.coins + ' 金币。\n总榜排名：' + rank.value + '。' + rank.detail + '。' + rank.note + '。\n左右横滑对准落点，向上甩布接住榴莲！\n' + topics;
  }
  function loadArt() {
    if (artPromise) return artPromise;
    var pending = new Promise(function (resolve, reject) {
      var image = new Image(), done = false;
      var timer = setTimeout(function () { finish(new Error('分享图片加载超时，请再试一次')); }, 6000);
      function finish(error) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        image.onload = null;
        image.onerror = null;
        if (error) reject(error);
        else resolve(image);
      }
      image.onload = function () {
        if (!(image.naturalWidth || image.width) || !(image.naturalHeight || image.height)) {
          finish(new Error('分享图片未加载，请再试一次'));
        } else finish();
      };
      image.onerror = function () { finish(new Error('分享图片未加载，请再试一次')); };
      try { image.src = './assets/share-hero-reconstructed.jpg'; }
      catch (error) { finish(new Error('分享图片未加载，请再试一次')); }
    });
    artPromise = pending;
    pending.catch(function () { if (artPromise === pending) artPromise = null; });
    return pending;
  }
  function fontsReady() {
    if (!document.fonts || !document.fonts.ready) return Promise.resolve();
    // System fonts remain a usable fallback if a WebView never resolves fonts.ready.
    return new Promise(function (resolve) {
      var timer = setTimeout(finish, 1200), done = false;
      function finish() { if (done) return; done = true; clearTimeout(timer); resolve(); }
      Promise.resolve(document.fonts.ready).then(finish, finish);
    });
  }
  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function text(ctx, value, x, y, size, maxWidth, bold) {
    var label = String(value), px = size;
    do { ctx.font = (bold ? 'bold ' : '') + px + 'px sans-serif'; px -= 1; }
    while (ctx.measureText(label).width > maxWidth && px >= 18);
    ctx.fillText(label, x, y, maxWidth);
  }
  function coin(ctx, x, y, radius) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#8a5510'; ctx.beginPath(); ctx.arc(0, 5, radius, 0, Math.PI * 2); ctx.fill();
    var gold = ctx.createLinearGradient(-radius, -radius, radius, radius);
    gold.addColorStop(0, '#fff7ac'); gold.addColorStop(.32, '#ffdc50'); gold.addColorStop(.62, '#d99b1f'); gold.addColorStop(1, '#fff095');
    ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff09a'; ctx.beginPath(); ctx.arc(0, 0, radius - 7, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#a66b13'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -radius * .55); ctx.lineTo(0, radius * .55);
    [-.3, 0, .3].forEach(function (v) { ctx.moveTo(-radius * .3, radius * v); ctx.lineTo(radius * .3, radius * v); }); ctx.stroke();
    ctx.fillStyle = '#fff7bf'; ctx.beginPath();
    var sx = radius * .8, sy = -radius * .8;
    ctx.moveTo(sx, sy - 13); ctx.lineTo(sx + 4, sy - 4); ctx.lineTo(sx + 13, sy);
    ctx.lineTo(sx + 4, sy + 4); ctx.lineTo(sx, sy + 13); ctx.lineTo(sx - 4, sy + 4);
    ctx.lineTo(sx - 13, sy); ctx.lineTo(sx - 4, sy - 4); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function drawCard(image, score) {
    var c = document.createElement('canvas');
    c.width = 1080; c.height = 1440;
    var ctx = c.getContext('2d');
    if (!ctx) throw new Error('无法生成分享图片，请再试一次');
    ctx.fillStyle = '#f3dfb6'; ctx.fillRect(0, 0, c.width, c.height);
    // Preserve the entire promotional image. All statistics sit below the artwork.
    var iw = image.naturalWidth || image.width, ih = image.naturalHeight || image.height;
    var scale = Math.min(1080 / iw, 780 / ih), w = iw * scale, h = ih * scale;
    ctx.drawImage(image, (1080 - w) / 2, 18 + (780 - h) / 2, w, h);
    ctx.textAlign = 'center'; ctx.fillStyle = '#173e3a';
    text(ctx, '榴莲刺客', 540, 120, 78, 900, true);
    text(ctx, '对准落点 · 向上甩布', 540, 164, 30, 900, false);
    // The genuine personal rank is distinct from this run's four statistics.
    // Never invent competitor rows or substitute local best for a platform rank.
    var rank = rankingCopy(score.ranking);
    ctx.fillStyle = '#faecc8'; roundedRect(ctx, 54, 802, 972, 202, 30); ctx.fill();
    ctx.strokeStyle = '#8e9a64'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#49634e'; text(ctx, '总榜排名', 540, 844, 27, 880, true);
    ctx.fillStyle = '#173e3a'; text(ctx, rank.value, 540, 908, 54, 880, true);
    ctx.fillStyle = '#49634e'; text(ctx, rank.detail, 540, 949, 27, 880, false);
    text(ctx, rank.note, 540, 983, 22, 880, false);
    ctx.fillStyle = '#173e3a'; roundedRect(ctx, 54, 1022, 972, 318, 34); ctx.fill();
    var stats = [['接住', score.whole, '颗'], ['摔碎', score.smashed, '颗'], ['被砸', score.hits, '次']];
    stats.forEach(function (stat, i) {
      var x = 216 + i * 324;
      ctx.fillStyle = '#f7e8c4'; text(ctx, stat[0], x, 1070, 28, 280, false);
      ctx.fillStyle = '#ffe38a'; text(ctx, stat[1], x, 1130, 52, 270, true);
      ctx.fillStyle = '#f7e8c4'; text(ctx, stat[2], x, 1164, 22, 280, false);
    });
    ctx.strokeStyle = '#6b8563'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(100, 1186); ctx.lineTo(980, 1186); ctx.stroke();
    ctx.fillStyle = '#f7e8c4'; text(ctx, '本局净收入', 540, 1229, 27, 720, false);
    coin(ctx, 164, 1284, 34);
    ctx.fillStyle = '#ffe38a'; text(ctx, String(score.coins), 546, 1304, 62, 650, true);
    ctx.fillStyle = '#f7e8c4'; text(ctx, '金币', 938, 1297, 25, 92, false);
    ctx.fillStyle = '#173e3a'; text(ctx, '你的这一局，能接住多少颗？', 540, 1386, 29, 940, true);
    ctx.fillStyle = '#49634e'; text(ctx, '小红书小工具 · 榴莲刺客', 540, 1422, 22, 940, false);
    return c;
  }
  async function render(score) {
    var results = await Promise.all([loadArt(), fontsReady()]);
    var data = drawCard(results[0], score).toDataURL('image/jpeg', .88);
    if (!/^data:image\/jpeg;base64,/.test(data)) throw new Error('无法导出分享图片，请再试一次');
    return data;
  }
  window.DurianShare = {snapshot: snapshot, caption: caption, render: render, drawCard: drawCard, topics: topics, title: title};
})();
