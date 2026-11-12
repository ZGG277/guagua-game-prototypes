/* Optional real-browser regression. Not part of npm test (requires Playwright + Chromium).
 * Run: node tests/browser-check.cjs
 * Only file:// game resources are allowed. No remote sites, platform calls, or publication.
 * Ordinary Chromium results do NOT establish mini-tool host / Android / iOS compatibility.
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const entry = pathToFileURL(path.resolve(__dirname, '../artifact/index.html')).href;
const viewports = [{width:320,height:568},{width:390,height:844},{width:430,height:932},{width:768,height:1024}];
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_BIN || '/usr/bin/chromium', headless:true});
  const results=[];
  try {
    for (const viewport of viewports) {
      const context=await browser.newContext({viewport,hasTouch:true,isMobile:true,deviceScaleFactor:2});
      await context.route('**/*', route => /^(file:|data:|about:)/.test(route.request().url()) ? route.continue() : route.abort());
      const page=await context.newPage(),errors=[];
      page.on('pageerror', error=>errors.push(error.message));
      await page.goto(entry); await page.locator('#start').waitFor({state:'visible'});
      assert.equal(await page.locator('#start').isDisabled(),false,'boot enables start');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal page overflow');
      await page.locator('#start').tap();
      assert.equal(await page.locator('#scene').getAttribute('data-phase'),'rock');
      await page.locator('#rhythm-pad').tap();
      await page.locator('#help').tap();
      assert.equal(await page.locator('#scene').getAttribute('data-paused'),'true');
      await page.locator('#resume').tap();
      assert.equal(await page.locator('#scene').getAttribute('data-paused'),'false');
      await page.locator('#ranking').tap();
      await page.locator('#close-ranking').tap();
      assert.equal(await page.locator('#ranking-overlay').isVisible(),false);
      assert.equal(await page.locator('#scene').getAttribute('data-paused'),'false');
      await page.locator('#help').tap();
      await page.locator('[data-practice="leg"]').tap();
      assert.equal(await page.locator('#scene').getAttribute('data-phase'),'leg');
      assert.equal(await page.locator('#scene').getAttribute('data-practice'),'true');
      const cdp=await context.newCDPSession(page);
      await page.locator('#gesture-pad').scrollIntoViewIfNeeded();
      const r=await page.locator('#gesture-pad').boundingBox();
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});
      await page.waitForTimeout(100);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
      await page.locator('#help').tap(); await page.locator('#resume').tap();
      assert.equal(await page.locator('#gesture-pad').isDisabled(),false,'cancel does not deadlock controls');
      await page.locator('#restart').tap();
      assert.equal(await page.locator('#scene').getAttribute('data-phase'),'rock');
      assert.equal(await page.locator('#scene').getAttribute('data-practice'),'false');
      if(process.env.SLEEP_SCREENSHOTS_DIR){fs.mkdirSync(process.env.SLEEP_SCREENSHOTS_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SLEEP_SCREENSHOTS_DIR,`sleep-${viewport.width}.png`),fullPage:true});}
      assert.deepEqual(errors,[],'no browser errors');
      results.push({viewport,status:'passed',checks:['boot','horizontal layout','touch start','rock tap','help pause/resume','ranking close/resume','hand practice','touch cancel/recovery','restart']});
      await context.close();
    }
    console.log(JSON.stringify({results,notCovered:['full normal run','settlement and replay','audio listening','Chrome 61','platform simulator','Android host','iOS host','real share/ranking/follow']},null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
