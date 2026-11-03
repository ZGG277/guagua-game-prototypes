// Procedural snow, not a recording: unpitched, decorrelated filtered grains.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function snowAudioTargets(s,playing=true){
 const speed=Math.hypot(s.vx||0,s.vz||0),load=clamp((s.normalLoad||0)/(75*9.81),0,1.3);
 if(!playing||s.airborne||s.caught||speed<.06||load<=0)return{glide:0,scrape:0,brightness:1200};
 const edge=clamp(Math.abs(s.frontEdge||0)*(s.frontLoad??.5)+Math.abs(s.rearEdge||0)*(s.rearLoad??.5));
 const shear=clamp(Math.sqrt(Math.max(0,s.snowWork||0)/2100)),dissipation=clamp(Math.sqrt(Math.max(0,s.frictionWork||0)/3400));
 return{glide:(.05+.24*Math.sqrt(clamp(speed/22)))*Math.sqrt(load)*(1-.30*shear),scrape:.60*Math.sqrt(load)*clamp(.72*shear+.28*dissipation*edge),brightness:1400+4300*clamp(speed/26)+1400*shear};
}
export function snowNoise(kind,seconds=11,sampleRate=44100,seed=37291){
 const n=Math.floor(seconds*sampleRate),out=new Float32Array(n);let r=seed>>>0,lp=0,slow=0,grain=.5,goal=.5,left=0;
 const random=()=>((r=(1664525*r+1013904223)>>>0)/4294967296),a=1-Math.exp(-2*Math.PI*(kind==='glide'?3300:6800)/sampleRate),b=1-Math.exp(-2*Math.PI*110/sampleRate);
 for(let i=0;i<n;i++){const w=random()*2-1;lp+=a*(w-lp);slow+=b*(lp-slow);if(--left<=0){goal=.20+.80*random();left=Math.floor(sampleRate*(.008+random()*.027));}grain+=(goal-grain)*.008;const texture=kind==='glide'?.72:(.28+grain*.95);out[i]=Math.tanh((lp-slow)*1.6)*texture*.65;}
 // A short noise crossfade softens the loop transition; this is not an
 // exact endpoint/derivative match or an independently auditioned recording.
 const blend=Math.min(Math.floor(sampleRate*.07),Math.floor(n/8));for(let i=0;i<blend;i++){const t=i/blend;out[n-blend+i]=out[n-blend+i]*(1-t)+out[i]*t;}
 return out;
}
export function gemPitch(combo=1){const n=Math.max(0,(Number.isFinite(combo)?combo:1)-1);return 740*Math.pow(2,26*(1-Math.exp(-n/18))/12);}
export function createSnowAudio(){
 let ctx=null,master=null,glide=null,scrape=null,filter=null,muted=false,lastLanding=0,enabled=false,failed=false,gemCount=0;const sources=[],effects=new Set();
 function silence(){if(!ctx)return;const t=ctx.currentTime;for(const gain of[glide,scrape,master])if(gain){gain.gain.cancelScheduledValues(t);gain.gain.setValueAtTime(gain.gain.value,t);gain.gain.linearRampToValueAtTime(0,t+.008);}enabled=false;for(const fx of effects){try{fx.source.stop();}catch{}}effects.clear();}
 async function unlock(){if(failed||muted)return false;try{if(!ctx){const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return false;ctx=new Audio();master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=3000;filter.Q.value=.3;filter.connect(master);
 for(const [kind,seconds,seed]of[['glide',11,37291],['scrape',7,19673]]){const g=ctx.createGain();g.gain.value=0;g.connect(filter);if(kind==='glide')glide=g;else scrape=g;const buffer=ctx.createBuffer(2,Math.floor(ctx.sampleRate*seconds),ctx.sampleRate);for(let c=0;c<2;c++)buffer.copyToChannel(snowNoise(kind,seconds,ctx.sampleRate,seed+c*193),c);const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(g);source.start();sources.push(source);}}
 await ctx.resume();return ctx.state==='running';}catch{failed=true;silence();return false;}}
 function update(s,playing){const landing=s.landingCount||0;if(!ctx||ctx.state!=='running'||muted){lastLanding=landing;return;}const targets=snowAudioTargets(s,playing);if(!playing||s.airborne||s.caught){silence();lastLanding=landing;return;}const t=ctx.currentTime;if(!enabled){master.gain.setTargetAtTime(.68,t,.025);enabled=true;}for(const [g,v]of[[glide,targets.glide],[scrape,targets.scrape]]){g.gain.cancelScheduledValues(t);g.gain.setTargetAtTime(v,t,.028);}filter.frequency.setTargetAtTime(targets.brightness,t,.04);
 if(landing>lastLanding){const source=ctx.createBufferSource(),gain=ctx.createGain(),duration=.17,buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*duration),ctx.sampleRate);buffer.copyToChannel(snowNoise('scrape',duration,ctx.sampleRate,landing*811+7),0);source.buffer=buffer;gain.gain.setValueAtTime(.38,t);gain.gain.exponentialRampToValueAtTime(.001,t+duration);source.connect(gain);gain.connect(master);source.onended=()=>{source.disconnect();gain.disconnect();};source.start();}lastLanding=landing;}
 function gem(combo=1){if(!ctx||ctx.state!=='running'||muted||failed||!ctx.createOscillator)return false;try{const t=ctx.currentTime,root=gemPitch(combo);for(let i=0;i<2;i++){const source=ctx.createOscillator(),gain=ctx.createGain(),fx={source,gain};source.type='sine';source.frequency.setValueAtTime(root*(i?2:1),t);gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(i?.025:.10,t+.007);gain.gain.exponentialRampToValueAtTime(.001,t+.13+i*.045);source.connect(gain);gain.connect(ctx.destination);effects.add(fx);source.onended=()=>{effects.delete(fx);source.disconnect();gain.disconnect();};source.start(t);source.stop(t+.19);}gemCount++;return true;}catch{return false;}}
 return{unlock,update,silence,gem,mute(value){muted=!!value;if(muted)silence();return muted;},getState:()=>({muted,ready:!!ctx&&ctx.state==='running',failed,gemCount}),dispose(){silence();for(const s of sources)s.stop();ctx?.close();ctx=null;}};
}
