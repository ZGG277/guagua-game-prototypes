const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),checks=[];
const app=read('source/app.js'),html=read('source/index.html'),platform=read('scripts/platform.js'),survival=read('source/survival.js');
function test(name,fn){fn();checks.push(name);}
test('stable production personal-best key restored consistently',()=>{assert(survival.includes("durian-assassin-v101-best"));assert(platform.includes("durian-assassin-v101-best"));});
test('first-play guidance remains until first cloth latch',()=>{assert(app.includes('let guided=false'));assert(app.includes('if(sim.catchLocked)guided=true'));assert(app.includes("$('#guide').hidden=guided||session.gameOver"));});
test('twenty fruit and three blood drops with six injury units retained',()=>{assert(survival.includes('MAX_HEALTH=6, MAX_FRUIT=20'));assert(app.includes('[0,1,2].map'));assert(app.includes('hp-i*2'));assert(survival.includes('whole?20:-10'));});
test('gold coin gradient and reward sparkle retained',()=>{assert(html.includes('linearGradient id="gold"'));assert(html.includes('class="coin-shine"'));assert(app.includes('coinSparkUntil=visualTime+.7'));});
test('background music absent while effect audio retained',()=>{const files=fs.readdirSync(path.join(root,'source')).filter(p=>p.endsWith('.js'));const text=files.map(p=>read('source/'+p)).join('\n');assert(!/\.loop\s*=\s*true|backgroundMusic|bgm|music\.play/i.test(text));assert(app.includes('sound.hurt'));assert(app.includes('sound.coin'));});
test('share can return or restart independently of native callback',()=>{assert(html.includes('id="share-cancel"'));assert(app.includes("window.DurianPlatform.cancelShare('restart')"));assert(platform.includes("cancelShare('back')"));assert(app.includes('sound.clearRun();heardRound=null;groundHeardRound=null;')); });
test('physics, collision, difficulty and circular swing match R1 base',()=>{for(const name of ['physics.js','body-collision.js','difficulty.js','circle-motion.js'])assert.equal(read('source/'+name),read('baseline/source/'+name),name);});
fs.writeFileSync(path.join(root,'reports/release-feature-tests.json'),JSON.stringify({passed:checks.length,checks,scope:'Static feature-preservation checks; runtime rules also covered by mechanics, VM and response suites.'},null,2));
console.log(JSON.stringify({passed:checks.length,checks},null,2));
