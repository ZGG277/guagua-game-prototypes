import { musicMp3 } from './wall-music-clip.mjs';

export const musicLevel = 0.50;

export function decodeMusic(context, onReady) {
  const packed = atob(musicMp3);
  const bytes = new Uint8Array(packed.length);
  for (let i = 0; i < packed.length; i++) bytes[i] = packed.charCodeAt(i);
  context.decodeAudioData(bytes.buffer, onReady, () => {});
}
