const {chromium}=require('./test-deps.cjs').load('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const checks=[],errors=[],network=[];
 async function pageFor(width,height){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
  await page.addInitScript(()=>{
   window.posts=[];window.nativeMode='success';window.nativePending=[];
   window.xhs={launchOptions:{miniToolEnv:{buildVersion:9533000}},miniTool:{
    getWindowInfo:async()=>({windowWidth:innerWidth,windowHeight:innerHeight,safeArea:{top:44,bottom:innerHeight-24},menuButtons:{back:{left:8,right:52,top:44,bottom:88},me:{left:innerWidth-100,right:innerWidth-56,top:44,bottom:88},share:{left:innerWidth-52,right:innerWidth-8,top:44,bottom:88}}}),
    getStorage:async()=>({data:null}),setStorage:async()=>{},
    postNote:options=>{posts.push(options);if(nativeMode==='cancel')return Promise.reject({errMsg:'postNote:fail cancel'});if(nativeMode==='pending')return new Promise((resolve,reject)=>nativePending.push({resolve,reject}));return Promise.resolve({errMsg:'postNote:ok'});},
    writeTempFile:()=>{throw Error('Unexpected temporary-file dependency');},saveImageToPhotosAlbum:()=>{throw Error('Unexpected album permission dependency');}
   }};
  });
  await page.goto('file://'+path.join(root,'dist/index.html'));await page.waitForFunction(()=>!!window.survival);return page;
 }
 async function result(page){
  if(await page.locator('#start').isVisible())await page.locator('#start').click();
  await page.evaluate(()=>{survival.gameOver=true;survival.ended=true;survival.active=false;survival.health=0;survival.settled=20;survival.coins=-200;survival.totals.whole=0;survival.totals.smashed=20;survival.injuryRounds=new Set([1,2,3,4,5,6]);});
  await page.waitForFunction(()=>!document.querySelector('#share').hidden&&!document.querySelector('#start').hidden);
 }
 for(const [width,height] of [[320,568],[390,844],[430,932]]){
  const page=await pageFor(width,height);await result(page);await page.locator('#share').click();await page.waitForFunction(()=>posts.length===1&&!document.querySelector('#share').disabled);
  const out=await page.evaluate(()=>({title:posts[0].title,content:posts[0].content,url:posts[0].mediaInfo.image_resources[0].url}));
  assert(out.content.includes('净收入 -200 金币')&&out.content.includes('被砸 6 次'));assert(out.content.includes('#榴莲刺客[话题]#'));assert(out.url.startsWith('data:image/jpeg;base64,'));assert(out.title.length<=20&&out.content.length<=1000);
  if(width===390)fs.writeFileSync(path.join(root,'reports/share-card-browser.jpg'),Buffer.from(out.url.split(',')[1],'base64'));
  await page.screenshot({path:path.join(root,'reports/share-finished-'+width+'.png')});
  await page.locator('#start').click();await page.waitForFunction(()=>!survival.gameOver&&document.querySelector('#share').hidden&&document.querySelector('#share-cancel').hidden);assert.equal(await page.evaluate(()=>survival.injuryRounds.size),0);
  checks.push({check:'Real Canvas render, bridge payload, and restart',viewport:{width,height},passed:true});await page.close();
 }
 {
  const page=await pageFor(320,568);await result(page);
  await page.evaluate(()=>{window.renderPending=[];window.realRender=DurianShare.render;DurianShare.render=score=>new Promise(resolve=>renderPending.push({score,resolve}));});
  await page.locator('#share').click();await page.waitForFunction(()=>renderPending.length===1);assert(await page.locator('#share-cancel').isVisible());assert(await page.locator('#start').isEnabled());
  const geometry=await page.evaluate(()=>{const ids=['share','share-cancel','start'];return ids.map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect(),at=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{id,x:r.x,y:r.y,width:r.width,height:r.height,reachable:at===e||e.contains(at),inView:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight};});});
  assert(geometry.every(r=>r.reachable&&r.inView));await page.screenshot({path:path.join(root,'reports/share-generating-320.png')});
  await page.locator('#share-cancel').click();assert(await page.locator('#share').isEnabled());await page.locator('#share').click();await page.waitForFunction(()=>renderPending.length===2);
  await page.evaluate(()=>renderPending[0].resolve('data:image/jpeg;base64,dGVzdA=='));await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>posts.length),0);assert(await page.locator('#share').isDisabled());
  await page.locator('#start').click();await page.waitForFunction(()=>!survival.gameOver);await page.evaluate(()=>renderPending[1].resolve('data:image/jpeg;base64,dGVzdA=='));await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>posts.length),0);assert(await page.locator('#share-cancel').isHidden());assert.equal(await page.locator('#share-status').textContent(),'');
  checks.push({check:'Actual Back and Restart clicks during generation; old results ignored',viewport:{width:320,height:568},geometry,passed:true});await page.close();
 }
 {
  const page=await pageFor(390,844);await result(page);await page.evaluate(()=>nativeMode='pending');await page.locator('#share').click();await page.waitForFunction(()=>nativePending.length===1);
  assert(await page.locator('#share-cancel').isVisible());assert(await page.locator('#start').isEnabled());await page.screenshot({path:path.join(root,'reports/share-native-pending.png')});
  await page.evaluate(()=>{dispatchEvent(new Event('blur'));dispatchEvent(new Event('focus'));});await page.waitForFunction(()=>!document.querySelector('#share').disabled);assert((await page.locator('#share-status').textContent()).includes('笔记状态'));
  await page.evaluate(()=>nativePending[0].resolve({errMsg:'postNote:ok'}));await page.waitForTimeout(50);assert((await page.locator('#share-status').textContent()).includes('笔记状态'));
  await page.evaluate(()=>nativeMode='cancel');await page.locator('#share').click();await page.waitForFunction(()=>!document.querySelector('#share').disabled);assert((await page.locator('#share-status').textContent()).includes('已取消'));
  await page.evaluate(()=>nativeMode='pending');await page.locator('#share').click();await page.waitForFunction(()=>nativePending.length===2);await page.locator('#start').click();await page.waitForFunction(()=>!survival.gameOver);await page.evaluate(()=>nativePending[1].reject({errMsg:'postNote:fail stale'}));await page.waitForTimeout(50);assert.equal(await page.locator('#share-status').textContent(),'');assert(await page.locator('#share-cancel').isHidden());
  checks.push({check:'Native pending, blur/focus return, native cancellation, and restart without stale UI',passed:true});await page.close();
 }
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(network.length,0,'Unexpected external network request');
 fs.writeFileSync(path.join(root,'reports/share-browser-tests.json'),JSON.stringify({passed:checks.length,checks,errors,externalRequests:network,scope:'Cloud desktop Chromium, local offline files, mocked native bridge only. No real note was opened or published; native mobile behavior remains unverified.'},null,2));
 await browser.close();console.log(checks.length+' browser share suites passed with no page errors or external requests.');
})().catch(error=>{console.error(error);process.exitCode=1;});
