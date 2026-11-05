(function () {
  'use strict';
  // New implementation reconstructed from confirmed requirements, not recovered 1.0.3 bytes.
  var artPromise = null;
  var topics = '#小红书小工具 #WebCoding #小游戏 #榴莲 #榴莲刺客';
  function snapshot(session) {
    return Object.freeze({
      whole: session.totals.whole,
      smashed: session.totals.smashed,
      hits: session.injuryRounds ? session.injuryRounds.size : 0,
      coins: session.coins
    });
  }
  function caption(score) {
    return '接住 ' + score.whole + ' 颗，摔碎 ' + score.smashed + ' 颗，被砸 ' + score.hits + ' 次，净赚 ' + score.coins + ' 金币。横滑移动，向上甩布！\n' + topics;
  }
  function loadArt() {
    if (!artPromise) {
      artPromise = new Promise(function (resolve, reject) {
        var image = new Image();
        image.onload = function () { resolve(image); };
        image.onerror = function () { artPromise = null; reject(new Error('分享图片未加载，请再试一次')); };
        image.src = './assets/share-hero-reconstructed.jpg';
      });
    }
    return artPromise;
  }
  function drawCard(image, score) {
    var c = document.createElement('canvas');
    c.width = 1080; c.height = 1080;
    var ctx = c.getContext('2d');
    if (!ctx) throw new Error('无法生成分享图片');
    ctx.fillStyle = '#f1dfb5'; ctx.fillRect(0, 0, 1080, 1080);
    // Fit the entire generated image, never crop the figure or catching cloth.
    var scale = Math.min(960 / image.width, 960 / image.height);
    var w = image.width * scale, h = image.height * scale;
    ctx.drawImage(image, (1080 - w) / 2, (960 - h) / 2, w, h);
    ctx.fillStyle = '#173e3a'; ctx.textAlign = 'center';
    ctx.font = 'bold 68px sans-serif'; ctx.fillText('榴莲刺客', 540, 105);
    ctx.font = '26px sans-serif'; ctx.fillText('对准落点 · 向上甩布', 540, 151);
    ctx.fillStyle = '#173e3a'; ctx.fillRect(66, 800, 948, 184);
    var stats = [['接住', score.whole, '颗'], ['摔碎', score.smashed, '颗'], ['被砸', score.hits, '次'], ['净赚', score.coins, '金币']];
    stats.forEach(function (stat, i) {
      var x = 184.5 + i * 237;
      ctx.fillStyle = '#f1dfb5'; ctx.font = '26px sans-serif'; ctx.fillText(stat[0], x, 843);
      ctx.fillStyle = '#ffdc67'; ctx.font = 'bold 54px sans-serif'; ctx.fillText(String(stat[1]), x, 910);
      ctx.fillStyle = '#f1dfb5'; ctx.font = '22px sans-serif'; ctx.fillText(stat[2], x, 950);
    });
    ctx.fillStyle = '#49634e'; ctx.font = '22px sans-serif';
    ctx.fillText('#小红书小工具  #WebCoding  #小游戏  #榴莲', 540, 1025);
    return c;
  }
  async function render(score) { return drawCard(await loadArt(), score).toDataURL('image/jpeg', .9); }
  window.DurianShare = {snapshot: snapshot, caption: caption, render: render, drawCard: drawCard, topics: topics};
})();
