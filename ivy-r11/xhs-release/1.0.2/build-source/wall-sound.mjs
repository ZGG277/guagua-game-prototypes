import { decodeMusic, musicLevel } from './wall-music.mjs';
import { effortPcm, landingPcm } from './wall-effort-clip.mjs';

function createRecordedBuffer(context, pcmData) {
  const bytes = atob(pcmData);
  const buffer = context.createBuffer(1, bytes.length / 2, 24000);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) {
    const pcm = bytes.charCodeAt(i * 2) | (bytes.charCodeAt(i * 2 + 1) << 8);
    samples[i] = (pcm < 32768 ? pcm : pcm - 65536) / 32768;
  }
  return buffer;
}

function createGripBuffer(context) {
  const duration = 0.11;
  const rate = 24000;
  const buffer = context.createBuffer(1, Math.ceil(rate * duration), rate);
  const samples = buffer.getChannelData(0);
  let noise = 0;
  for (let i = 0; i < samples.length; i++) {
    const time = i / rate;
    noise += 0.16 * (Math.random() * 2 - 1 - noise);
    const attack = 1 - Math.exp(-time * 320);
    const tail = Math.min(1, (duration - time) / 0.022);
    samples[i] = attack * noise * Math.exp(-time * 34) * 0.40 * tail;
  }
  return buffer;
}

export function createWallSound(host) {
  let context, buffers, enabled = true;
  const voices = new Set();
  let musicEnabled = true;
  let musicActive = false;
  let musicBuffer, musicVoice;
  let musicOffset = 0;

  function stopMusic() {
    if (!musicVoice) return;
    const { source, gain, startedAt } = musicVoice;
    const now = context.currentTime;
    musicOffset = (musicOffset + Math.max(0, now - startedAt)) % musicBuffer.duration;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.055);
    source.stop(now + 0.06);
    musicVoice = null;
  }

  function setMusicActive(active) {
    musicActive = active;
    if (!active || !musicEnabled || host.document?.hidden) {
      stopMusic();
      return;
    }
    if (musicVoice || !musicBuffer || context?.state !== 'running') return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    const now = context.currentTime;
    source.buffer = musicBuffer;
    source.loop = true;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(musicLevel, now + 0.12);
    source.connect(gain);
    gain.connect(context.destination);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start(now, musicOffset);
    musicVoice = { source, gain, startedAt: now };
  }
  let started = false;
  let resumePending = false;

  function resumeContext() {
    if ((!enabled && !musicEnabled) || !context || resumePending || host.document?.hidden) return;
    if (context.state === 'running') { started = true; return; }
    if (!['suspended', 'interrupted'].includes(context.state)) return;
    resumePending = true;
    context.resume().then(() => {
      if (context.state === 'running') started = true;
    }).catch(() => {}).then(() => { resumePending = false; });
  }

  function foreground() {
    if (started) resumeContext();
  }

  function unlock() {
    if (!enabled && !musicEnabled) return;
    try {
      const Audio = host.AudioContext || host.webkitAudioContext;
      if (!Audio) return;
      if (!context) {
        context = new Audio();
        buffers = {
          jump: createRecordedBuffer(context, effortPcm),
          land: createRecordedBuffer(context, landingPcm),
          grip: createGripBuffer(context),
        };
        decodeMusic(context, buffer => {
          musicBuffer = buffer;
          setMusicActive(musicActive);
        });
      }
      resumeContext();
    } catch { /* The game can run without Web Audio. */ }
  }

  function play(name) {
    if (!enabled || context?.state !== 'running' || !buffers?.[name]) return;
    const source = context.createBufferSource();
    source.buffer = buffers[name];
    const gain = context.createGain();
    source.connect(gain); gain.connect(context.destination);
    voices.add(source);
    source.onended = () => {
      voices.delete(source); source.disconnect(); gain.disconnect();
    };
    source.start();
    if (musicVoice && (name === 'jump' || name === 'land')) {
      const volume = musicVoice.gain.gain;
      const now = context.currentTime;
      volume.cancelScheduledValues(now);
      volume.setValueAtTime(volume.value, now);
      volume.linearRampToValueAtTime(musicLevel * 0.5, now + 0.018);
      volume.linearRampToValueAtTime(musicLevel, now + source.buffer.duration + 0.13);
    }
  }

  function quiet() { for (const source of voices) source.stop(); }
  return { unlock, play, quiet, foreground, setMusicActive,
    toggleMusic() {
      musicEnabled = !musicEnabled;
      if (musicEnabled) unlock();
      setMusicActive(musicActive);
      return musicEnabled;
    },
    toggle() { enabled = !enabled; if (!enabled) quiet(); else unlock(); return enabled; },
  };
}
