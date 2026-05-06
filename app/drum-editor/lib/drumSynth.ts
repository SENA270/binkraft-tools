/** Synthesized drum sounds using Web Audio API */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function getContext(): AudioContext {
  return getAudioContext();
}

// --- Utility: create noise buffer ---
function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/** Play a drum sound for the given GM note number */
export function playDrum(note: number, velocity: number): void {
  const ctx = getAudioContext();
  const vol = velocity / 127;

  switch (note) {
    // --- Kicks ---
    case 35:
      playKick(ctx, vol, 150, 35, 0.5);
      break;
    case 36:
      playKick(ctx, vol, 160, 40, 0.4);
      break;

    // --- Snares ---
    case 38:
      playSnare(ctx, vol, 200, 2000);
      break;
    case 40:
      playSnare(ctx, vol, 180, 2500);
      break;

    // --- Side Stick / Clap ---
    case 37:
      playSideStick(ctx, vol);
      break;
    case 39:
      playClap(ctx, vol);
      break;

    // --- Hi-Hats ---
    case 42:
      playHiHat(ctx, vol, 0.06, 7000);
      break;
    case 44:
      playHiHat(ctx, vol, 0.04, 7500);
      break;
    case 46:
      playHiHat(ctx, vol, 0.3, 6000);
      break;

    // --- Toms ---
    case 41:
      playTom(ctx, vol, 90);
      break;
    case 43:
      playTom(ctx, vol, 110);
      break;
    case 45:
      playTom(ctx, vol, 130);
      break;
    case 47:
      playTom(ctx, vol, 160);
      break;
    case 48:
      playTom(ctx, vol, 190);
      break;
    case 50:
      playTom(ctx, vol, 220);
      break;

    // --- Cymbals ---
    case 49:
      playCymbal(ctx, vol, 5000, 0.5, 1.0);
      break;
    case 51:
      playCymbal(ctx, vol, 5500, 2.0, 0.5);
      break;
    case 52:
      playCymbal(ctx, vol, 4000, 0.8, 0.8);
      break;
    case 53:
      playRideBell(ctx, vol);
      break;
    case 55:
      playCymbal(ctx, vol, 6000, 0.7, 0.4);
      break;
    case 57:
      playCymbal(ctx, vol, 4500, 0.5, 1.0);
      break;
    case 58:
      playVibraslap(ctx, vol);
      break;
    case 59:
      playCymbal(ctx, vol, 5200, 1.8, 0.5);
      break;

    // --- Tambourine ---
    case 54:
      playTambourine(ctx, vol);
      break;

    // --- Cowbell ---
    case 56:
      playCowbell(ctx, vol);
      break;

    // --- Bongo ---
    case 60:
      playBongo(ctx, vol, 400);
      break;
    case 61:
      playBongo(ctx, vol, 280);
      break;

    // --- Conga ---
    case 62:
      playConga(ctx, vol, 300, true);
      break;
    case 63:
      playConga(ctx, vol, 310, false);
      break;
    case 64:
      playConga(ctx, vol, 200, false);
      break;

    // --- Timbales ---
    case 65:
      playTimbale(ctx, vol, 500);
      break;
    case 66:
      playTimbale(ctx, vol, 350);
      break;

    // --- Agogo ---
    case 67:
      playAgogo(ctx, vol, 800);
      break;
    case 68:
      playAgogo(ctx, vol, 600);
      break;

    // --- Cabasa / Maracas / Shaker ---
    case 69:
      playShaker(ctx, vol, 0.08, 4000);
      break;
    case 70:
      playShaker(ctx, vol, 0.06, 5000);
      break;
    case 82:
      playShaker(ctx, vol, 0.1, 4500);
      break;

    // --- Whistles ---
    case 71:
      playWhistle(ctx, vol, 0.15);
      break;
    case 72:
      playWhistle(ctx, vol, 0.4);
      break;

    // --- Guiro ---
    case 73:
      playGuiro(ctx, vol, 0.15);
      break;
    case 74:
      playGuiro(ctx, vol, 0.4);
      break;

    // --- Claves / Wood Blocks ---
    case 75:
      playWoodBlock(ctx, vol, 2500);
      break;
    case 76:
      playWoodBlock(ctx, vol, 1800);
      break;
    case 77:
      playWoodBlock(ctx, vol, 1200);
      break;

    // --- Cuica ---
    case 78:
      playCuica(ctx, vol, true);
      break;
    case 79:
      playCuica(ctx, vol, false);
      break;

    // --- Triangle ---
    case 80:
      playTriangle(ctx, vol, 0.15);
      break;
    case 81:
      playTriangle(ctx, vol, 0.6);
      break;

    // --- Jingle Bell ---
    case 83:
      playJingleBell(ctx, vol);
      break;

    // --- Bell Tree ---
    case 84:
      playBellTree(ctx, vol);
      break;

    // --- Castanets ---
    case 85:
      playCastanets(ctx, vol);
      break;

    // --- Surdo ---
    case 86:
      playSurdo(ctx, vol, true);
      break;
    case 87:
      playSurdo(ctx, vol, false);
      break;

    // --- Electronic / Metronome (27-34) ---
    case 27:
      playElectronicClick(ctx, vol, 1000, 0.02);
      break;
    case 28:
      playElectronicClick(ctx, vol, 400, 0.04);
      break;
    case 29:
      playScratch(ctx, vol, true);
      break;
    case 30:
      playScratch(ctx, vol, false);
      break;
    case 31:
      playElectronicClick(ctx, vol, 1200, 0.03);
      break;
    case 32:
      playElectronicClick(ctx, vol, 700, 0.015);
      break;
    case 33:
      playMetronome(ctx, vol, 1000);
      break;
    case 34:
      playMetronome(ctx, vol, 1500);
      break;

    default:
      playClick(ctx, vol);
      break;
  }
}

// ========== Synthesis functions ==========

function playKick(ctx: AudioContext, vol: number, startFreq: number, endFreq: number, duration: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12);
  gain.gain.setValueAtTime(vol * 1.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playSnare(ctx: AudioContext, vol: number, bodyFreq: number, noiseFreq: number) {
  const now = ctx.currentTime;

  // Body (sine)
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(bodyFreq, now);
  osc.frequency.exponentialRampToValueAtTime(bodyFreq * 0.5, now + 0.05);
  oscGain.gain.setValueAtTime(vol * 0.6, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(oscGain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.15);

  // Noise (snare wires)
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 0.2);
  const noiseGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(noiseFreq, now);
  noiseGain.gain.setValueAtTime(vol * 0.8, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  noise.connect(filter).connect(noiseGain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.2);
}

function playSideStick(ctx: AudioContext, vol: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(800, now);
  gain.gain.setValueAtTime(vol * 0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.05);
}

function playClap(ctx: AudioContext, vol: number) {
  const now = ctx.currentTime;
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 0.15);
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1200, now);
  filter.Q.setValueAtTime(1.5, now);
  gain.gain.setValueAtTime(vol * 0.7, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.15);
}

function playHiHat(ctx: AudioContext, vol: number, duration: number, freq: number) {
  const now = ctx.currentTime;
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, duration);
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(vol * 0.45, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + duration);
}

function playTom(ctx: AudioContext, vol: number, freq: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq * 1.5, now);
  osc.frequency.exponentialRampToValueAtTime(freq, now + 0.08);
  gain.gain.setValueAtTime(vol * 0.8, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

function playCymbal(ctx: AudioContext, vol: number, freq: number, q: number, duration: number) {
  const now = ctx.currentTime;
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, duration);
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(freq, now);
  filter.Q.setValueAtTime(q, now);
  gain.gain.setValueAtTime(vol * 0.6, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + duration);
}

function playRideBell(ctx: AudioContext, vol: number) {
  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(880, now);
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1320, now);
  gain.gain.setValueAtTime(vol * 0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.4);
  osc2.stop(now + 0.4);
}

function playTambourine(ctx: AudioContext, vol: number) {
  const now = ctx.currentTime;
  // High noise component
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 0.15);
  const nGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(8000, now);
  nGain.gain.setValueAtTime(vol * 0.35, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  noise.connect(filter).connect(nGain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.15);
  // Sine ping
  const osc = ctx.createOscillator();
  const oGain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(3000, now);
  oGain.gain.setValueAtTime(vol * 0.15, now);
  oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(oGain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}

function playCowbell(ctx: AudioContext, vol: number) {
  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  osc1.type = "square";
  osc1.frequency.setValueAtTime(560, now);
  osc2.type = "square";
  osc2.frequency.setValueAtTime(845, now);
  gain.gain.setValueAtTime(vol * 0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.25);
  osc2.stop(now + 0.25);
}

function playBongo(ctx: AudioContext, vol: number, freq: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq * 1.8, now);
  osc.frequency.exponentialRampToValueAtTime(freq, now + 0.04);
  gain.gain.setValueAtTime(vol * 0.7, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}

function playConga(ctx: AudioContext, vol: number, freq: number, muted: boolean) {
  const now = ctx.currentTime;
  const duration = muted ? 0.08 : 0.2;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq * 1.6, now);
  osc.frequency.exponentialRampToValueAtTime(freq, now + 0.03);
  gain.gain.setValueAtTime(vol * 0.7, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playTimbale(ctx: AudioContext, vol: number, freq: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(vol * 0.6, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  // Add brightness with a second harmonic
  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(freq * 2.5, now);
  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(vol * 0.2, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc.connect(gain).connect(ctx.destination);
  osc2.connect(gain2).connect(ctx.destination);
  osc.start(now);
  osc2.start(now);
  osc.stop(now + 0.2);
  osc2.stop(now + 0.1);
}

function playAgogo(ctx: AudioContext, vol: number, freq: number) {
  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(freq, now);
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(freq * 1.5, now);
  gain.gain.setValueAtTime(vol * 0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.3);
  osc2.stop(now + 0.3);
}

function playShaker(ctx: AudioContext, vol: number, duration: number, freq: number) {
  const now = ctx.currentTime;
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, duration);
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(vol * 0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + duration);
}

function playWhistle(ctx: AudioContext, vol: number, duration: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(2400, now);

  // Vibrato
  lfo.type = "sine";
  lfo.frequency.setValueAtTime(6, now);
  lfoGain.gain.setValueAtTime(50, now);
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  gain.gain.setValueAtTime(vol * 0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  lfo.start(now);
  osc.stop(now + duration);
  lfo.stop(now + duration);
}

function playGuiro(ctx: AudioContext, vol: number, duration: number) {
  const now = ctx.currentTime;
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, duration);
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(3000, now);
  filter.Q.setValueAtTime(3, now);

  // Amplitude modulation for scraping effect
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = "square";
  lfo.frequency.setValueAtTime(30, now);
  lfoGain.gain.setValueAtTime(vol * 0.2, now);
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);

  gain.gain.setValueAtTime(vol * 0.3, now);
  gain.gain.linearRampToValueAtTime(0.001, now + duration);
  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start(now);
  lfo.start(now);
  noise.stop(now + duration);
  lfo.stop(now + duration);
}

function playWoodBlock(ctx: AudioContext, vol: number, freq: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(vol * 0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.04);
}

function playCuica(ctx: AudioContext, vol: number, muted: boolean) {
  const now = ctx.currentTime;
  const duration = muted ? 0.15 : 0.3;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  // Pitch bend upward for cuica sound
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(muted ? 500 : 800, now + duration * 0.7);
  gain.gain.setValueAtTime(vol * 0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playTriangle(ctx: AudioContext, vol: number, duration: number) {
  const now = ctx.currentTime;
  // Fundamental
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const osc3 = ctx.createOscillator();
  const gain = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(4000, now);
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(4000 * 2.3, now); // inharmonic
  osc3.type = "sine";
  osc3.frequency.setValueAtTime(4000 * 3.7, now); // inharmonic
  gain.gain.setValueAtTime(vol * 0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc1.connect(gain);
  osc2.connect(gain);
  osc3.connect(gain);
  gain.connect(ctx.destination);
  osc1.start(now);
  osc2.start(now);
  osc3.start(now);
  osc1.stop(now + duration);
  osc2.stop(now + duration);
  osc3.stop(now + duration);
}

function playVibraslap(ctx: AudioContext, vol: number) {
  const now = ctx.currentTime;
  const duration = 0.4;
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, duration);
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(2000, now);
  filter.Q.setValueAtTime(5, now);
  // Rattle envelope: quick attack, sustained buzz
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(vol * 0.4, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + duration);
}

function playJingleBell(ctx: AudioContext, vol: number) {
  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(2500, now);
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(3200, now);
  gain.gain.setValueAtTime(vol * 0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  // Add noise shimmer
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 0.15);
  const nGain = ctx.createGain();
  const nFilter = ctx.createBiquadFilter();
  nFilter.type = "highpass";
  nFilter.frequency.setValueAtTime(8000, now);
  nGain.gain.setValueAtTime(vol * 0.1, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  noise.connect(nFilter).connect(nGain).connect(ctx.destination);
  osc1.start(now);
  osc2.start(now);
  noise.start(now);
  osc1.stop(now + 0.25);
  osc2.stop(now + 0.25);
  noise.stop(now + 0.15);
}

function playBellTree(ctx: AudioContext, vol: number) {
  const now = ctx.currentTime;
  const duration = 0.6;
  // Rising sweep of bell tones
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1500, now);
  osc.frequency.exponentialRampToValueAtTime(5000, now + duration * 0.8);
  gain.gain.setValueAtTime(vol * 0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playCastanets(ctx: AudioContext, vol: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1800, now);
  gain.gain.setValueAtTime(vol * 0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.025);
}

function playSurdo(ctx: AudioContext, vol: number, muted: boolean) {
  const now = ctx.currentTime;
  const duration = muted ? 0.15 : 0.4;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(100, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
  gain.gain.setValueAtTime(vol * 1.0, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playElectronicClick(ctx: AudioContext, vol: number, freq: number, duration: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(vol * 0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playScratch(ctx: AudioContext, vol: number, push: boolean) {
  const now = ctx.currentTime;
  const duration = 0.08;
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, duration);
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(push ? 2000 : 1500, now);
  filter.frequency.exponentialRampToValueAtTime(push ? 4000 : 800, now + duration);
  filter.Q.setValueAtTime(5, now);
  gain.gain.setValueAtTime(vol * 0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + duration);
}

function playMetronome(ctx: AudioContext, vol: number, freq: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(vol * 0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.05);
}

function playClick(ctx: AudioContext, vol: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(600, now);
  gain.gain.setValueAtTime(vol * 0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.03);
}
