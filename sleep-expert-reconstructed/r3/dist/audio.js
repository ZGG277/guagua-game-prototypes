import {HAND} from './engine.js';
/* Reconstructed synthesized sound, not recovered recordings.
 * Call unlock() ONLY inside a user gesture. update(game, dt) never unlocks.
 * Music and all-audio are separate: setEnabled(false) retains music preference.
 * Feed setPaused(true) on visibility loss, pause or help; resume via false.
 * close() is terminal and releases all nodes/context; create a new instance to replay.
 * Optional {AudioContext} injection is for testing. No audio capability is a safe no-op.
 */
export function createAudio(options={}){
 const host=typeof window!=='undefined'?window:{};
 const Context=Object.prototype.hasOwnProperty.call(options,'AudioContext')?options.AudioContext:(host.AudioContext||host.webkitAudioContext);
 let context=null,master=null,noise=null,unlocked=false,closed=false,enabled=true,music=false,paused=false,resuming=null;
 let elapsed=0,nextMusic=0,note=0,lastBreath=-1,lastPhase='',lastReason='',lastCry=-99,lastNoiseSerial=0;
 let warnings=new Set();const voices=new Set();
 const audible=()=>!!context&&unlocked&&enabled&&!paused&&!closed&&context.state==='running';
 function silence(channel){for(const voice of Array.from(voices)){if(channel&&voice.channel!==channel)continue;try{voice.source.stop();}catch(_){}try{voice.source.disconnect();voice.gain.disconnect();if(voice.filter)voice.filter.disconnect();}catch(_){}voices.delete(voice);}}
 function sync(){if(master){const t=context.currentTime;master.gain.cancelScheduledValues(t);master.gain.setValueAtTime(enabled&&!paused?.18:0,t);}if(!enabled||paused)silence();}
 async function unlock(){
  if(closed||!Context)return false;
  try{
   if(!context){context=new Context();master=context.createGain();master.connect(context.destination);sync();}
   if(context.state!=='running'){if(!resuming)resuming=Promise.resolve(context.resume()).then(()=>{resuming=null;},()=>{resuming=null;});await resuming;}
   unlocked=context.state==='running';return unlocked;
  }catch(_){unlocked=false;return false;}
 }
 function play(frequency,duration=.18,level=.3,type='sine',slide=0,noisy=false,channel='effect'){
  if(!audible()||voices.size>=20)return;
  const t=context.currentTime,gain=context.createGain();let source,filter=null;
  if(noisy){
   if(!noise){noise=context.createBuffer(1,context.sampleRate,context.sampleRate);const data=noise.getChannelData(0);let seed=9281;for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=seed/2147483648-1;}}
   source=context.createBufferSource();source.buffer=noise;source.loop=true;filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=frequency;source.connect(filter);filter.connect(gain);
  }else{source=context.createOscillator();source.type=type;source.frequency.setValueAtTime(frequency,t);if(slide)source.frequency.linearRampToValueAtTime(Math.max(30,frequency+slide),t+duration);source.connect(gain);}
  gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(level,t+Math.min(.06,duration*.2));gain.gain.exponentialRampToValueAtTime(.0001,t+duration);gain.connect(master);
  const voice={source,gain,filter,channel};voices.add(voice);source.onended=()=>{voices.delete(voice);try{source.disconnect();gain.disconnect();if(filter)filter.disconnect();}catch(_){}};
  source.start(t);source.stop(t+duration+.02);
 }
 function cry(){if(elapsed-lastCry<1.7)return;lastCry=elapsed;play(350,.52,.14,'triangle',-100);play(420,.38,.08,'sine',65);}
 const cues={phone:[660,.22],ledge:[170,.26],bell:[1050,.35],door:[110,.15],cat:[470,.24],clock:[820,.11],toy:[530,.3],window:[230,.35]};
 function update(game,dt){
  if(closed||!game)return;
  if(!paused)elapsed+=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.1));
  // Observe even while muted, so re-enabling does not replay old alarms or crying.
  const active=new Set();for(const event of game.events||[]){if(event.status!=='warning')continue;active.add(event.id);if(!warnings.has(event.id)){const cue=cues[event.id];if(cue)play(cue[0],cue[1],.22,'sine');}}warnings=active;
  if(game.noiseSerial!==lastNoiseSerial){if(game.noiseSerial>lastNoiseSerial)cry();lastNoiseSerial=game.noiseSerial||0;}
  if(game.phase!==lastPhase){if(game.phase==='lower')play(260,.7,.10,'sine',-85);lastPhase=game.phase;lastBreath=-1;}
  const reason=game.handReason||'';if(reason!==lastReason&&['fast','direction','window','release'].includes(reason)&&['leg','head'].includes(game.phase))cry();lastReason=reason;
  if(!audible())return;
  if(music&&elapsed>=nextMusic){const notes=[261.63,329.63,392,329.63,293.66,349.23,440,349.23,261.63,329.63,392,523.25,440,349.23,293.66,261.63];play(notes[note++%notes.length],1.25,.15,'sine',0,false,'music');nextMusic=elapsed+.9;}
  // Hand audio marks the same short exhale window as the engine, never inhalation.
  const hand=HAND[game.phase],breatheTime=hand?game.phaseTime:game.time;
  const breath=Math.floor((breatheTime||0)/HAND.period),position=(breatheTime||0)-breath*HAND.period;
  const exhaling=hand?position>=HAND.start&&position<HAND.start+hand.window:true;
  if(exhaling&&breath!==lastBreath){lastBreath=breath;if(!['rock','awake'].includes(game.phase))play(650,hand?Math.max(.02,HAND.start+hand.window-position):1.05,.055,'sine',0,true);}
 }
 return {
  unlock,
  setMusic(value){const next=!!value;if(music!==next){music=next;nextMusic=elapsed;}if(!music)silence('music');},
  setEnabled(value){enabled=!!value;sync();},
  setPaused(value){paused=!!value;sync();},
  update,
  tap(result){if(['perfect','good','queued','restart'].includes(result))play(110,.10,.38,'sine',-45);else if(result==='saved')play(540,.12,.12);},
  close(){if(closed)return;closed=true;silence();if(master)try{master.disconnect();}catch(_){}if(context)try{const result=context.close();if(result&&result.catch)result.catch(()=>{});}catch(_){}unlocked=false;},
 };
}
