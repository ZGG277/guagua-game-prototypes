const fs = require('fs'), path = require('path'), vm = require('vm');
const canvas = require('./test-deps.cjs').load('@napi-rs/canvas');
const root = path.resolve(__dirname, '..');
if (fs.existsSync('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')) canvas.GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'sans-serif');
const art = fs.readFileSync(path.join(root, 'assets/share-hero-reconstructed.jpg'));
const minimalData = 'data:image/jpeg;base64,dGVzdA==';
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return {promise, resolve, reject}; }
async function flush() { for (let i = 0; i < 8; i++) await Promise.resolve(); await new Promise(setImmediate); }
function runtime(options = {}) {
  let now = 0, nextTimer = 0, timers = new Map(), elements = {}, listeners = {}, docs = {}, posts = [], writes = [], reads = [], imageLoads = 0;
  let imageMode = options.imageMode || 'success', post = options.post || (async () => ({errMsg:'postNote:ok'}));
  function target(id) {
    if (!elements[id]) elements[id] = {disabled:false, hidden:id==='share-cancel', textContent:'', events:{}, addEventListener(type, callback) {(this.events[type] || (this.events[type] = [])).push(callback);}, click() {if (!this.disabled) (this.events.click || []).forEach(f => f({}));}};
    return elements[id];
  }
  function add(map, name, handler) {(map[name] || (map[name] = [])).push(handler);}
  let c = {console, Promise, Object, Number, Math, Set,
    setTimeout(fn, ms) {const id=++nextTimer;timers.set(id,{fn,when:now+ms});return id;}, clearTimeout(id) {timers.delete(id);},
    Image:function() {
      const image = new canvas.Image();
      Object.defineProperty(image, 'src', {set(value) {
        imageLoads++;
        if(imageMode==='hang') return;
        if(imageMode==='failure') {queueMicrotask(() => {if(image.onerror) image.onerror(new Error('offline'));});return;}
        if(imageMode==='throw') throw new Error('decode');
        Object.getOwnPropertyDescriptor(canvas.Image.prototype, 'src').set.call(image,art);
      }});
      return image;
    },
    document:{hidden:false,createElement:() => canvas.createCanvas(1,1),getElementById:target,documentElement:{style:{setProperty(){}}},addEventListener(name,fn){add(docs,name,fn);}},
    addEventListener(name,fn){add(listeners,name,fn);},
    localStorage:{getItem:key=>{reads.push(key);return options.saved || null;},setItem:(key,value)=>writes.push({key,value})},
    survival:{gameOver:true,totals:{whole:0,smashed:20},coins:-200,injuryRounds:new Set([1,2,3,4,5,6])},
    xhs:{miniTool:{postNote:p=>{posts.push(p);return post(p);},writeTempFile:()=>{throw new Error('Sharing must use documented data URI without temporary-file or album prerequisites');}}}
  };
  c.window=c;vm.createContext(c);
  for(const file of ['source/share-card.js','scripts/platform.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c,{filename:file});
  async function advance(ms) {const end=now+ms;while(true){let first=[...timers.entries()].filter(([,t])=>t.when<=end).sort((a,b)=>a[1].when-b[1].when)[0];if(!first)break;now=first[1].when;timers.delete(first[0]);first[1].fn();await flush();}now=end;await flush();}
  return {c,el:target,posts,writes,reads,timers,advance,flush,setImageMode(value){imageMode=value;},setPost(fn){post=fn;},get imageLoads(){return imageLoads;},emit(name){(listeners[name]||[]).forEach(f=>f({}));},visibility(hidden){c.document.hidden=hidden;(docs.visibilitychange||[]).forEach(f=>f({}));}};
}
module.exports={runtime,deferred,flush,root,minimalData,canvas};
