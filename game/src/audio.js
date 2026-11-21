// audio.js — all sound from WebAudio oscillators. No audio files, no
// network. M toggles mute. The AudioContext is created lazily on the first
// user gesture, so autoplay policies never block the game.

let ctx = null;
let muted = false;
let alertOsc = null;
let alertGain = null;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlockAudio() {
  ensureCtx();
}

export function toggleMute() {
  muted = !muted;
  if (muted) stopAlert();
  return muted;
}

export function isMuted() {
  return muted;
}

function blip(freq, dur, type, vol, when = 0) {
  if (muted) return;
  const ac = ensureCtx();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function playStep(sprinting) {
  blip(sprinting ? 190 : 150, 0.07, 'sine', sprinting ? 0.12 : 0.06);
}

export function playPetal() {
  blip(880, 0.22, 'sine', 0.16);
  blip(1318, 0.3, 'sine', 0.12, 0.07);
}

export function playGate() {
  [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.4, 'triangle', 0.12, i * 0.09));
}

export function playCaught() {
  // Guard shout sting: a short descending sawtooth bark.
  if (muted) return;
  const ac = ensureCtx();
  if (!ac) return;
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(320, t0);
  osc.frequency.exponentialRampToValueAtTime(90, t0 + 0.35);
  gain.gain.setValueAtTime(0.18, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + 0.45);
}

// Rising alert tick while any detection meter is filling (0..1 intensity).
export function setAlertLevel(level) {
  if (muted || level <= 0.02) {
    stopAlert();
    return;
  }
  const ac = ensureCtx();
  if (!ac) return;
  if (!alertOsc) {
    alertOsc = ac.createOscillator();
    alertGain = ac.createGain();
    alertOsc.type = 'square';
    alertOsc.frequency.value = 660;
    alertGain.gain.value = 0;
    alertOsc.connect(alertGain);
    alertGain.connect(ac.destination);
    alertOsc.start();
  }
  const target = 0.015 + level * 0.05;
  alertGain.gain.setTargetAtTime(target, ac.currentTime, 0.08);
  alertOsc.frequency.setTargetAtTime(520 + level * 480, ac.currentTime, 0.1);
}

function stopAlert() {
  if (alertOsc) {
    try { alertOsc.stop(); } catch { /* already stopped */ }
    alertOsc.disconnect();
    alertGain.disconnect();
    alertOsc = null;
    alertGain = null;
  }
}
