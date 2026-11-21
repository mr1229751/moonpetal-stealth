// hud.js — top bar (level name, petal icons, hearts), the detection eye
// that opens as the highest meter rises, and the title / caught /
// level-complete / victory / paused screens plus the controls footer.

import { highestMeter } from './guards.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPetalIcon(ctx, x, y, taken, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = taken ? '#f2eaff' : 'rgba(242, 234, 255, 0.25)';
  ctx.strokeStyle = taken ? '#b79cff' : 'rgba(183, 156, 255, 0.4)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 5, Math.sin(a) * 5, 4, 2.6, a, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = taken ? '#ffd977' : 'rgba(255, 217, 119, 0.3)';
  ctx.beginPath();
  ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawHud(ctx, state) {
  const level = state.level;
  const taken = level.petals.filter((p) => p.taken).length;
  // Top bar.
  ctx.fillStyle = 'rgba(6, 18, 24, 0.82)';
  ctx.fillRect(0, 0, 1280, 52);
  ctx.fillStyle = '#e8f0e8';
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Level ${state.levelIndex + 1} — ${level.name}`, 18, 27);
  // Petal icons.
  for (let i = 0; i < 3; i++) {
    drawPetalIcon(ctx, 560 + i * 34, 26, i < taken, 1.15);
  }
  ctx.fillStyle = '#c9d6c9';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText(`${taken} / 3 moonpetals`, 668, 27);
  // Hearts.
  for (let i = 0; i < 3; i++) {
    const x = 900 + i * 30;
    const y = 26;
    ctx.fillStyle = i < state.hearts ? '#ff6b81' : 'rgba(255, 107, 129, 0.25)';
    ctx.beginPath();
    ctx.arc(x - 5, y - 3, 7, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 3, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 11, y - 1);
    ctx.lineTo(x + 11, y - 1);
    ctx.lineTo(x, y + 11);
    ctx.closePath();
    ctx.fill();
  }
  // Detection eye: opens as the highest meter rises.
  const m = highestMeter(state.guards);
  const ex = 1130;
  const ey = 26;
  const openness = 0.15 + m * 0.85;
  ctx.strokeStyle = m >= 0.66 ? '#ff5a46' : m >= 0.33 ? '#ff9a3c' : '#cfe0cf';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(ex, ey, 22, 22 * openness, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = m >= 0.66 ? '#ff5a46' : '#e8c85a';
  ctx.beginPath();
  ctx.arc(ex, ey, 6 + m * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0e2f33';
  ctx.beginPath();
  ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c9d6c9';
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(m > 0.02 ? 'SEEN' : 'HIDDEN', ex + 30, ey);
  // Controls footer.
  ctx.fillStyle = 'rgba(6, 18, 24, 0.72)';
  ctx.fillRect(0, 800 - 30, 1280, 30);
  ctx.fillStyle = '#a9bda9';
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'WASD / arrows move · C crouch · Shift sprint (noisy!) · P pause · R restart level · M mute',
    640,
    800 - 15,
  );
  // Gate hint once all petals are gathered.
  if (state.gateOpen) {
    ctx.fillStyle = '#dfeaff';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('The moon gate is open — slip through!', 640, 78);
  }
}

function overlay(ctx, alpha) {
  ctx.fillStyle = `rgba(4, 14, 20, ${alpha})`;
  ctx.fillRect(0, 0, 1280, 800);
}

function panel(ctx, w, h) {
  roundRect(ctx, 640 - w / 2, 400 - h / 2, w, h, 18);
  ctx.fillStyle = 'rgba(10, 32, 38, 0.94)';
  ctx.fill();
  ctx.strokeStyle = '#8fc98f';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function title(ctx, text, y, size, color) {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 640, y);
}

function body(ctx, text, y, size, color) {
  ctx.fillStyle = color;
  ctx.font = `${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 640, y);
}

export function drawTitleScreen(ctx) {
  overlay(ctx, 0.55);
  panel(ctx, 640, 380);
  title(ctx, 'MOONPETAL', 268, 64, '#f2eaff');
  body(ctx, 'A night garden. Three moonpetals. Lantern guards who must never see you.', 330, 19, '#cfe0cf');
  body(ctx, 'Gather all three petals, then slip through the moon gate — unseen.', 362, 19, '#cfe0cf');
  body(ctx, 'Press Enter to begin', 420, 22, '#ffd977');
  body(ctx, 'WASD / arrows move · C crouch (harder to see) · Shift sprint (loud!)', 470, 16, '#a9bda9');
  body(ctx, 'Stay out of the lantern cones · shadow slows their gaze · P pause · R restart · M mute', 496, 16, '#a9bda9');
}

export function drawCaughtScreen(ctx, heartsLeft) {
  overlay(ctx, 0.45);
  panel(ctx, 520, 240);
  title(ctx, 'SPOTTED!', 330, 48, '#ff5a46');
  body(ctx, heartsLeft > 0 ? `A lantern found you. ${heartsLeft} heart${heartsLeft === 1 ? '' : 's'} left — back to the start.` : 'No hearts left. The level begins again.', 395, 18, '#e8f0e8');
  body(ctx, 'Press Enter to keep sneaking', 445, 18, '#ffd977');
}

export function drawLevelCompleteScreen(ctx, levelName, timeText) {
  overlay(ctx, 0.45);
  panel(ctx, 560, 260);
  title(ctx, 'LEVEL CLEAR', 320, 44, '#cfe4ff');
  body(ctx, `${levelName} — through the gate, unseen.`, 380, 19, '#e8f0e8');
  body(ctx, `Time: ${timeText}`, 412, 18, '#cfe0cf');
  body(ctx, 'Press Enter for the next garden', 462, 18, '#ffd977');
}

export function drawVictoryScreen(ctx, timeText, spotted) {
  overlay(ctx, 0.55);
  panel(ctx, 640, 340);
  title(ctx, 'THE GARDEN IS YOURS', 290, 44, '#f2eaff');
  body(ctx, 'All three moonpetals, all three gates — and no lantern ever held you.', 350, 19, '#cfe0cf');
  body(ctx, `Total time: ${timeText}   ·   Times spotted: ${spotted}`, 392, 19, '#e8f0e8');
  body(ctx, 'Press Enter to play again', 448, 18, '#ffd977');
}

export function drawPausedScreen(ctx) {
  overlay(ctx, 0.5);
  panel(ctx, 420, 180);
  title(ctx, 'PAUSED', 370, 40, '#e8f0e8');
  body(ctx, 'Press P or Esc to keep sneaking', 425, 17, '#ffd977');
}
