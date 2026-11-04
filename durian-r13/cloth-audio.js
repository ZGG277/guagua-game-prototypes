/** Small, sample-free cloth crack. Call unlock() ONLY from a real user gesture.
 * snap(roundId) is an event, not a request queue: muted/locked events are consumed.
 * pause() suspends for hidden/blur lifecycle. Only a later gesture unlock resumes.
 * reset() stops a current sound, but never clears the per-round event ledger.
 */
export class ClothAudio {
 constructor({AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext}={}){
  this.muted=false;this.context=null;this._AudioContext=AudioContext;this._seen=new Set();this._voices=new Set();this._paused=true;this._unlocked=false;this._resumePromise=null;this._disposed=false;
 }
 get available(){return !this._disposed&&typeof this._AudioContext==='function'}
 get ready(){return !this.muted&&!this._paused&&this._unlocked&&this.context?.state==='running'}
 async unlock(){
  if(this.muted||!this.available)return false;
  this._paused=false;
  try{this.context??=new this._AudioContext();}catch{this._paused=true;return false;}
  if(this.context.state==='closed')return false;
  if(this._resumePromise)return this._resumePromise;
  const context=this.context;
  this._resumePromise=(async()=>{
   try{
    // Do not assume resume() has completed merely because the gesture occurred.
    if(context.state!=='running')await context.resume();
    if(this._paused||this.muted||this._disposed){this._unlocked=false;try{await context.suspend();}catch{}return false;}
    this._unlocked=context.state==='running';return this._unlocked;
   }catch{this._unlocked=false;return false;}
  })();
  try{return await this._resumePromise;}finally{this._resumePromise=null;}
 }
 setMuted(flag){this.muted=!!flag;if(this.muted)void this.pause();return this.muted;}
 reset(){for(const voice of [...this._voices])voice.stop();}
 async pause(){this._paused=true;this._unlocked=false;this.reset();try{if(this.context&&this.context.state!=='closed')await this.context.suspend();}catch{} }
 async dispose(){this._disposed=true;this._paused=true;this._unlocked=false;this.reset();try{await this.context?.close();}catch{} }
 coin(id,amount){
  const key='coin:'+id;if(this._seen.has(key))return false;this._seen.add(key);if(!this.ready||!amount)return false;
  const c=this.context,t=c.currentTime,nodes=[],sources=[];let done=false;
  const voice={stop:()=>{if(done)return;done=true;for(const n of sources)try{n.stop()}catch{}for(const n of nodes)try{n.disconnect()}catch{}this._voices.delete(voice)}};this._voices.add(voice);
  try{const g=c.createGain(),o=c.createOscillator();nodes.push(g,o);sources.push(o);o.type=amount<0?'triangle':'sine';o.frequency.setValueAtTime(amount<0?170:660,t);o.frequency.exponentialRampToValueAtTime(amount<0?70:990,t+.16);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.075,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+.24);o.connect(g);g.connect(c.destination);o.onended=()=>voice.stop();o.start(t);o.stop(t+.25);return true;}catch{voice.stop();return false;}
 }

 // Event IDs are consumed before checking readiness: no delayed surprise sounds.
 hurt(roundId){return this._cue('hurt',roundId);}
 effort(roundId){return this._cue('effort',roundId);}
 impact(roundId,tier='normal',speed=0){return this._cue('impact',roundId,{tier,speed});}
 _cue(kind,roundId,options={}){
  if((typeof roundId!=='string'&&typeof roundId!=='number')||roundId===''||(typeof roundId==='number'&&!Number.isFinite(roundId)))return false;
  const key=kind+':'+roundId;
  if(this._seen.has(key))return false;
  this._seen.add(key);
  if(!this.ready)return false;
  const c=this.context,nodes=[];let source,done=false;
  const voice={stop:()=>{if(done)return;done=true;try{source?.stop();}catch{}for(const n of nodes)try{n.disconnect();}catch{}this._voices.delete(voice);}};
  this._voices.add(voice);
  try{
   const data=renderHarvestCue(kind,c.sampleRate,options);
   const buffer=c.createBuffer(1,data.length,c.sampleRate);buffer.getChannelData(0).set(data);
   source=c.createBufferSource();nodes.push(source);source.buffer=buffer;
   source.connect(c.destination);source.onended=()=>voice.stop();
   source.start(c.currentTime);source.stop(c.currentTime+data.length/c.sampleRate);
   return true;
  }catch{voice.stop();return false;}
 }

 snap(roundId){
  if((typeof roundId!=='string'&&typeof roundId!=='number')||roundId===''||(typeof roundId==='number'&&!Number.isFinite(roundId)))return false;
  if(this._seen.has(roundId))return false;
  this._seen.add(roundId);
  if(!this.ready)return false;
  const c=this.context,nodes=[],sources=[];let ended=false;
  const clean=()=>{if(ended)return;ended=true;for(const n of nodes)try{n.disconnect();}catch{}this._voices.delete(voice);};
  const voice={stop:()=>{for(const source of sources)try{source.stop();}catch{}clean();}};
  this._voices.add(voice);
  const node=n=>(nodes.push(n),n);
  try{
   const t=c.currentTime,duration=.09;
   const master=node(c.createGain());master.gain.setValueAtTime(.0001,t);master.gain.linearRampToValueAtTime(.1,t+.002);master.gain.exponentialRampToValueAtTime(.0001,t+duration);master.connect(c.destination);
   const noise=node(c.createBufferSource());sources.push(noise);
   const buffer=c.createBuffer(1,Math.max(1,Math.ceil(c.sampleRate*duration)),c.sampleRate),data=buffer.getChannelData(0);
   for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(.8-.45*i/data.length);
   noise.buffer=buffer;
   const high=node(c.createBiquadFilter());high.type='highpass';high.frequency.setValueAtTime(650,t);high.Q.setValueAtTime(.6,t);
   const band=node(c.createBiquadFilter());band.type='bandpass';band.frequency.setValueAtTime(1900,t);band.Q.setValueAtTime(.65,t);
   const noiseLevel=node(c.createGain());noiseLevel.gain.setValueAtTime(.7,t);
   noise.connect(high);high.connect(band);band.connect(noiseLevel);noiseLevel.connect(master);
   const low=node(c.createOscillator());sources.push(low);low.type='sine';low.frequency.setValueAtTime(155,t);low.frequency.exponentialRampToValueAtTime(75,t+.035);
   const lowLevel=node(c.createGain());lowLevel.gain.setValueAtTime(.18,t);lowLevel.gain.exponentialRampToValueAtTime(.0001,t+.045);low.connect(lowLevel);lowLevel.connect(master);
   low.onended=clean;noise.start(t);low.start(t);noise.stop(t+duration);low.stop(t+duration+.005);
   return true;
  }catch{voice.stop();return false;}
 }
}

/** Original procedural audio, not recorded voices. Shared with offline WAV QA.
 * Short vowel-like harmonics and breath suggest exertion/pain without speech.
 * Impact combines a falling low thud, shell cracks and a debris tail.
 */
export function renderHarvestCue(kind,sampleRate=48000,{tier='normal',speed=0}={}){
 const rate=Number.isFinite(sampleRate)&&sampleRate>=8000?Math.min(192000,sampleRate):48000;
 const severe=tier==='shattered'||tier==='severe'||tier==='heavy'||tier===3;
 const duration=kind==='effort'?.22:kind==='hurt'?.43:severe?.52:tier==='intact'?.24:.38;
 const data=new Float32Array(Math.ceil(rate*duration));
 let seed=kind==='hurt'?731:kind==='effort'?313:997,phase=0,air=0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
 const intensity=Math.max(0,Math.min(1,Number.isFinite(speed)?Math.abs(speed)/1200:0));
 for(let i=0;i<data.length;i++){
  const t=i/rate,u=t/duration,n=random();let value=0;
  if(kind==='hurt'||kind==='effort'){
   const hurt=kind==='hurt';
   const f=hurt?172-65*u+9*Math.sin(2*Math.PI*8*t):112+28*Math.sin(Math.PI*u);
   phase+=2*Math.PI*f/rate;
   // Two broad vowel formants color a glottal harmonic source.
   let vowel=0;
   for(let h=1;h<=16;h++){
    const hz=h*f,formant=Math.exp(-(((hz-(hurt?620:430))/220)**2))+.45*Math.exp(-(((hz-1120)/310)**2));
    vowel+=Math.sin(h*phase)*(.09/h+.21*formant/h**.65);
   }
   air=.72*air+.28*n;
   const attack=Math.min(1,t/(hurt?.014:.009));
   const envelope=attack*Math.pow(Math.max(0,1-u),hurt?1.35:1.8);
   value=envelope*(vowel*(hurt?.69:.62)+air*(hurt?.16:.27));
  }else if(kind==='impact'){
   const base=severe?78:100;
   const thud=Math.sin(2*Math.PI*(base*t-38*t*t))*Math.exp(-t*(severe?14:19))*.20;
   let crack=0;
   for(const [at,strength] of [[.002,1],[.023,.7],[.051,.42],[.089,.21]]){
    const dt=t-at;if(dt>=0)crack+=n*Math.exp(-dt*155)*strength*.16;
   }
   const debris=n*Math.exp(-t*15)*Math.min(1,t*90)*.035;
   value=(thud+(tier==='intact'?0:crack)+debris)*(severe?1.14:tier==='intact'?.65:.86)*(.9+.1*intensity);
  }
  // Soft bounded output, with tiny endpoint fades to avoid clicks.
  const fade=Math.min(1,t/.002,(duration-t)/.012);
  data[i]=.32*Math.tanh(value/.32)*Math.max(0,fade);
 }
 return data;
}
