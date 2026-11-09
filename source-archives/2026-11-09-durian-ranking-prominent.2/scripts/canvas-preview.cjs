const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const {createCanvas,GlobalFonts,Image}=require('./test-deps.cjs').load('@napi-rs/canvas');
if(fs.existsSync('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'))GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc','sans-serif');
const root=path.resolve(__dirname,'..');
function make(dist){
let queue=[],calls=[],checks=[],els={},docEvents={},winEvents={};const drawing=createCanvas(390,740);
function el(id){if(!els[id])els[id]={hidden:false,textContent:'',innerHTML:'',style:{setProperty(){}},events:{},setAttribute(){},addEventListener(n,f){this.events[n]=f},getBoundingClientRect(){return{left:0,top:52,width:390,height:740}},animate(){}};return els[id]}
let scene=el('scene');scene.getContext=()=>drawing.getContext('2d');scene.toDataURL=()=>drawing.toDataURL('image/png');scene.setPointerCapture=()=>{};scene.hasPointerCapture=()=>false;Object.defineProperties(scene,{width:{get:()=>drawing.width,set:v=>drawing.width=v},height:{get:()=>drawing.height,set:v=>drawing.height=v}});
const fixedMath=Object.create(Math);fixedMath.random=()=>.42;let context={console,Math:fixedMath,Object,Number,Set,Map,Array,Uint8Array,Uint32Array,Promise,Date,JSON,Error,atob:s=>Buffer.from(s,'base64').toString('binary'),Image:function(){var image=new Image();Object.defineProperty(image,'src',{set(value){Object.getOwnPropertyDescriptor(Image.prototype,'src').set.call(image,fs.readFileSync(dist+'/'+value));}});return image;},document:{createElement:()=>createCanvas(1,1),hidden:false,querySelector:s=>s==='canvas'?scene:el(s.slice(1)),getElementById:el,documentElement:{style:{setProperty(){}}},addEventListener(n,f){docEvents[n]=f}},requestAnimationFrame:f=>{queue.push(f);return queue.length},cancelAnimationFrame:()=>{queue=[]},addEventListener:(n,f)=>{winEvents[n]=f},devicePixelRatio:1,localStorage:{getItem:()=>null,setItem(){}},xhs:{launchOptions:{miniToolEnv:{buildVersion:9510000}},miniTool:{getWindowInfo:async()=>({windowWidth:390,windowHeight:844,safeArea:{top:24,bottom:820}}),getStorage:async()=>({data:null}),setStorage:async o=>calls.push(['storage',o]),writeTempFile:async o=>{calls.push(['temp',o.data]);return{filePath:'tmp/snapshot.png'}},postNote:async o=>calls.push(['post',o])}}};context.crypto={getRandomValues:a=>{a[0]=173;return a;}};context.window=context;vm.createContext(context);for(const f of ['share-card.js','platform.js','app.js'])vm.runInContext(fs.readFileSync(dist+'/'+f,'utf8'),context,{filename:f});
function frame(t){const f=queue.shift();assert(f);f(t)}

return{frame,context,els,scene,drawing};}
(async()=>{
const old=make(path.join(root,'baseline/dist')),candidate=make(path.join(root,'dist'));
const out=createCanvas(820,848),ctx=out.getContext('2d');
fs.mkdirSync(path.join(root,'reports/motion-frames'),{recursive:true});
let comparisons=[];
for(const app of [old,candidate]){app.frame(16);app.els.start.onclick();const s=app.context.study;s.start(false,{landingX:408});app.context.gesture.reset();s.controller=app.context.gesture;s.setAlignment(408);const floor=s.castTime(s.profile.timingAssistFloor);app.intent=floor-.3;}
for(let i=0;i<150;i++){
 const now=32+i*1000/30;
 for(const app of[old,candidate]){
  const c=app.context.gesture,s=app.context.study;
  if(!app.began&&s.time>=app.intent-.08){app.began=true;c.queue('begin',{x:320,y:400},c.realTime);}
  if(!app.swiped&&s.time>=app.intent){app.swiped=true;app.actualIntent=s.time;c.queue('move',{x:320,y:355},c.realTime);}
  if(app.swiped&&!app.finished&&s.time>=app.actualIntent+.06){app.finished=true;c.queue('finish',null,c.realTime);}
  app.frame(now);
 }
 if(i<26||i>100)continue;
 ctx.fillStyle='#f1dfb5';ctx.fillRect(0,0,820,848);ctx.fillStyle='#173e3a';ctx.textAlign='center';ctx.font='bold 21px sans-serif';ctx.fillText('原重建基线',205,31);ctx.fillText('跟手候选 R1',615,31);
 ctx.drawImage(old.drawing,10,52,390,740);ctx.drawImage(candidate.drawing,420,52,390,740);
 ctx.font='16px sans-serif';for(const [j,app]of[old,candidate].entries()){
  const t=app.context.study.time-(app.actualIntent||999);ctx.fillStyle=t>=0?'#cb472a':'#216356';ctx.fillText(t>=0?'上甩后 '+Math.round(t*1000)+' ms':'等待上甩',205+j*410,817);
 }
 ctx.fillStyle='#173e3a';ctx.font='12px sans-serif';ctx.fillText('相同输入的云端 Canvas 模拟，非手机录像；基于 1.0.2 重建候选，非线上 1.0.3 原包',410,840);
 fs.writeFileSync(path.join(root,'reports/motion-frames',String(i-26).padStart(4,'0')+'.png'),out.toBuffer('image/png'));
 const age=candidate.context.study.time-(candidate.actualIntent||999);if(age>=.045&&age<.08){fs.writeFileSync(path.join(root,'reports/response-comparison.png'),out.toBuffer('image/png'));comparisons.push({age,oldHand:old.context.study.hand,candidateHand:candidate.context.study.hand});}
}
fs.writeFileSync(path.join(root,'reports/canvas-motion.json'),JSON.stringify({comparisons,scope:'VM Canvas rendering only, not a browser or real device recording.'},null,2));
console.log('Canvas motion frames rendered');
})();
