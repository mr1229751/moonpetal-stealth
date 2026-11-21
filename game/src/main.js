// main.js — boot, fixed-step game loop, state machine (title / playing /
// caught / level-complete / victory / paused), and the deterministic
// ?shot=1..4 staging presets used for screenshots.

import { LEVELS, GARDEN } from './garden.js';
import { makeGuard, updateGuard, highestMeter } from './guards.js';
import { makePlayer, updatePlayer, updateRipples, checkPetalPickup, checkGateExit, allPetalsTaken } from './player.js';
import { renderWorld } from './render.js';
import { drawHud, drawTitleScreen, drawCaughtScreen, drawLevelCompleteScreen, drawVictoryScreen, drawPausedScreen } from './hud.js';
import { unlockAudio, playStep, playPetal, playGate, playCaught, setAlertLevel, toggleMute } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = GARDEN.w;
canvas.height = GARDEN.h;

const params = new URLSearchParams(window.location.search);
const shotNum = Number(params.get('shot') || 0);

const keys = {
  up: false, down: false, left: false, right: false, crouch: false, sprint: false,
};

const state = {
  mode: 'title', // title | playing | caught | levelComplete | victory | paused
  levelIndex: 0,
  level: LEVELS[0],
  player: null,
  guards: [],
  ripples: [],
  hearts: 3,
  spotted: 0,
  gateOpen: false,
  time: 0, // seconds spent playing
  levelTime: 0,
  prevMode: 'playing',
};

function loadLevel(index, keepPetals = false) {
  const level = LEVELS[index];
  state.levelIndex = index;
  state.level = level;
  // Fresh copies: petals carry a `taken` flag, guards carry live state.
  state.level = {
    ...level,
    petals: level.petals.map((p) => ({ ...p, taken: keepPetals ? p.taken : false })),
    cover: level.cover,
    lamps: level.lamps,
    guards: level.guards,
    gate: level.gate,
    name: level.name,
    intro: level.intro,
    start: level.start,
  };
  state.player = makePlayer(level.start);
  state.guards = level.guards.map((p) => makeGuard(p));
  state.ripples = [];
  state.gateOpen = false;
  state.levelTime = 0;
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function startGame() {
  state.hearts = 3;
  state.spotted = 0;
  state.time = 0;
  loadLevel(0);
  state.mode = 'playing';
}

function onCaught() {
  state.spotted += 1;
  state.hearts -= 1;
  playCaught();
  setAlertLevel(0);
  if (state.hearts <= 0) {
    // Level restarts, hearts refilled, petals reset.
    state.hearts = 3;
    loadLevel(state.levelIndex);
  } else {
    // Respawn at the level start; petals already gathered stay gathered.
    const taken = state.level.petals.map((p) => p.taken);
    loadLevel(state.levelIndex);
    state.level.petals.forEach((p, i) => { p.taken = taken[i]; });
    state.gateOpen = allPetalsTaken(state.level.petals);
  }
  state.mode = 'caught';
}

function update(dt) {
  if (state.mode !== 'playing') return;
  state.time += dt;
  state.levelTime += dt;

  const events = updatePlayer(state.player, keys, dt, state.level.cover);
  if (events.step) playStep(state.player.sprinting);
  if (events.ripple) {
    state.ripples.push({ x: state.player.x, y: state.player.y, age: 0, radius: 12 });
  }
  updateRipples(state.ripples, dt);

  let caught = false;
  for (const g of state.guards) {
    updateGuard(g, dt, state.player, state.level.cover, state.level.lamps, state.ripples);
    if (g.meter >= 1) caught = true;
  }
  setAlertLevel(highestMeter(state.guards));

  const petal = checkPetalPickup(state.player, state.level.petals);
  if (petal) {
    playPetal();
    if (allPetalsTaken(state.level.petals)) {
      state.gateOpen = true;
      playGate();
    }
  }

  if (checkGateExit(state.player, state.level.gate, state.level.petals)) {
    setAlertLevel(0);
    state.mode = 'levelComplete';
    return;
  }
  if (caught) onCaught();
}

function render(t) {
  ctx.clearRect(0, 0, GARDEN.w, GARDEN.h);
  renderWorld(ctx, state, t);
  if (state.mode !== 'title') drawHud(ctx, state);
  if (state.mode === 'title') drawTitleScreen(ctx);
  else if (state.mode === 'caught') drawCaughtScreen(ctx, state.hearts);
  else if (state.mode === 'levelComplete') drawLevelCompleteScreen(ctx, state.level.name, formatTime(state.levelTime));
  else if (state.mode === 'victory') drawVictoryScreen(ctx, formatTime(state.time), state.spotted);
  else if (state.mode === 'paused') drawPausedScreen(ctx);
}

// ---- Screenshot staging: deterministic scenes, frozen in place. ----
function applyShot(n) {
  const t = 1.5; // fixed visual time so petals/lamps render identically
  if (n === 1) {
    // Cover: level 1. Player crouched in shadow behind the lower hedge,
    // a guard's amber cone sweeping just past it, two petals in view,
    // the dim gate far away, one lamp pool glowing.
    loadLevel(0);
    state.player.x = 330; state.player.y = 640; state.player.crouching = true;
    state.guards[0].x = 420; state.guards[0].y = 470; state.guards[0].heading = -Math.PI / 2;
    state.guards[1].x = 900; state.guards[1].y = 300; state.guards[1].heading = Math.PI;
    state.mode = 'playing';
    render(t);
  } else if (n === 2) {
    // Spotted: the detection moment. Player at a cone's edge on the lit
    // path, cone orange, eye wide, meter about 0.6.
    loadLevel(0);
    state.player.x = 420; state.player.y = 372; state.player.crouching = false;
    state.guards[0].x = 420; state.guards[0].y = 250; state.guards[0].heading = Math.PI / 2;
    state.guards[0].meter = 0.6;
    state.guards[1].x = 900; state.guards[1].y = 300; state.guards[1].heading = Math.PI;
    state.mode = 'playing';
    render(t);
  } else if (n === 3) {
    // Courtyard: level 2. Lamp courtyard, two guards crossing, player in
    // a shadow lane between hedges, a petal ahead.
    loadLevel(1);
    state.player.x = 300; state.player.y = 500; state.player.crouching = true;
    state.guards[0].x = 480; state.guards[0].y = 420; state.guards[0].heading = 0;
    state.guards[1].x = 900; state.guards[1].y = 470; state.guards[1].heading = -Math.PI / 2;
    state.guards[2].x = 1120; state.guards[2].y = 380; state.guards[2].heading = Math.PI;
    state.mode = 'playing';
    render(t);
  } else if (n === 4) {
    // Moongate: level 3 near the end. Gate open and glowing, player one
    // step away in shadow, a red-tinged cone behind.
    loadLevel(2);
    state.level.petals.forEach((p) => { p.taken = true; });
    state.gateOpen = true;
    state.player.x = 1108; state.player.y = 150; state.player.crouching = true;
    state.guards[2].x = 1040; state.guards[2].y = 300; state.guards[2].heading = -Math.PI / 2;
    state.guards[2].meter = 0.85;
    state.guards[0].x = 300; state.guards[0].y = 420; state.guards[0].heading = Math.PI / 2;
    state.guards[1].x = 700; state.guards[1].y = 260; state.guards[1].heading = 0;
    state.guards[3].x = 700; state.guards[3].y = 480; state.guards[3].heading = Math.PI;
    state.mode = 'playing';
    render(t);
  }
}

// ---- Input ----
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  KeyC: 'crouch', ControlLeft: 'crouch', ControlRight: 'crouch',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
};

window.addEventListener('keydown', (e) => {
  unlockAudio();
  if (KEYMAP[e.code] !== undefined) {
    keys[KEYMAP[e.code]] = true;
    e.preventDefault();
    return;
  }
  if (e.code === 'Enter') {
    if (state.mode === 'title') startGame();
    else if (state.mode === 'caught') state.mode = 'playing';
    else if (state.mode === 'levelComplete') {
      if (state.levelIndex + 1 >= LEVELS.length) state.mode = 'victory';
      else {
        loadLevel(state.levelIndex + 1);
        state.mode = 'playing';
      }
    } else if (state.mode === 'victory') startGame();
  } else if (e.code === 'KeyP' || e.code === 'Escape') {
    if (state.mode === 'playing') { state.prevMode = 'playing'; state.mode = 'paused'; }
    else if (state.mode === 'paused') state.mode = 'playing';
  } else if (e.code === 'KeyR') {
    if (state.mode === 'playing' || state.mode === 'paused' || state.mode === 'caught') {
      loadLevel(state.levelIndex);
      state.mode = 'playing';
    }
  } else if (e.code === 'KeyM') {
    toggleMute();
  }
});

window.addEventListener('keyup', (e) => {
  if (KEYMAP[e.code] !== undefined) keys[KEYMAP[e.code]] = false;
});

// Headless play-test hook: drive the game from a test page / script.
window.__moonpetal = { state, keys, loadLevel, startGame, LEVELS };

// ---- Fixed-step loop ----
let last = performance.now();
let acc = 0;
const STEP = 1 / 60;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += dt;
  while (acc >= STEP) {
    update(STEP);
    acc -= STEP;
  }
  render(now / 1000);
  requestAnimationFrame(frame);
}

loadLevel(0);
if (shotNum >= 1 && shotNum <= 4) {
  applyShot(shotNum);
  document.title = `Moonpetal — shot ${shotNum}`;
} else {
  requestAnimationFrame(frame);
}
