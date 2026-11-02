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
