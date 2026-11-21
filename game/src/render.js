// render.js — everything drawn: patterned night floor, hedges with lit
// rims, warm lamp pools, vision cones (amber → orange → red as the meter
// fills), character sprites drawn from shapes, petal glow, the moon gate,
// footstep ripples, and a darkness vignette with lit areas cut out.

import { CONE_RANGE, CONE_HALF_ANGLE, segmentHitsRect } from './guards.js';

// Deterministic speckles: a tiny hash so the floor texture is identical
// on every run without any randomness at render time.
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

// Ray from (ox,oy) along angle a: distance to the first cover rect, or
// maxDist if none. Used to clip vision cones around hedges.
function rayDistance(ox, oy, a, maxDist, cover) {
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  let best = maxDist;
  for (const r of cover) {
    // Slab test, parametric t in [0, best].
    let tmin = 0;
    let tmax = best;
    let ok = true;
    if (dx === 0) {
      if (ox < r.x || ox > r.x + r.w) ok = false;
    } else {
      let t1 = (r.x - ox) / dx;
      let t2 = (r.x + r.w - ox) / dx;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) ok = false;
    }
    if (ok) {
      if (dy === 0) {
        if (oy < r.y || oy > r.y + r.h) ok = false;
      } else {
        let t1 = (r.y - oy) / dy;
        let t2 = (r.y + r.h - oy) / dy;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) ok = false;
      }
    }
    if (ok && tmin < best && tmin >= 0) best = tmin;
  }
  return best;
}

function coneColor(meter) {
  if (meter >= 0.66) return { fill: 'rgba(224, 62, 52, 0.34)', edge: 'rgba(255, 90, 70, 0.55)' };
  if (meter >= 0.33) return { fill: 'rgba(240, 140, 40, 0.30)', edge: 'rgba(255, 170, 60, 0.5)' };
  return { fill: 'rgba(255, 196, 66, 0.22)', edge: 'rgba(255, 210, 110, 0.42)' };
}

function drawCone(ctx, guard, cover) {
  const c = coneColor(guard.meter);
  const steps = 26;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  for (let i = 0; i <= steps; i++) {
    const a = guard.heading - CONE_HALF_ANGLE + (2 * CONE_HALF_ANGLE * i) / steps;
    const d = rayDistance(guard.x, guard.y, a, CONE_RANGE, cover);
    ctx.lineTo(guard.x + Math.cos(a) * d, guard.y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fillStyle = c.fill;
  ctx.fill();
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Meter arc over the guard: how full the gaze is.
  if (guard.meter > 0.02) {
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 24, -Math.PI / 2, -Math.PI / 2 + guard.meter * 2 * Math.PI);
    ctx.strokeStyle = guard.meter >= 0.66 ? '#ff5a46' : guard.meter >= 0.33 ? '#ff9a3c' : '#ffc442';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

function drawFloor(ctx, t) {
  ctx.fillStyle = '#0e2f33';
  ctx.fillRect(0, 0, 1280, 800);
  // Subtle stone-tile grid.
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 1280; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 800); ctx.stroke();
  }
  for (let y = 0; y <= 800; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1280, y); ctx.stroke();
  }
  // Speckled texture + a few pale night flowers.
  for (let gx = 0; gx < 40; gx++) {
    for (let gy = 0; gy < 25; gy++) {
      const h = hash2(gx, gy);
      if (h < 0.22) {
        ctx.fillStyle = h < 0.06 ? 'rgba(190, 220, 200, 0.10)' : 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        ctx.arc(gx * 32 + 9 + h * 14, gy * 32 + 8 + (h % 0.13) * 90, h < 0.06 ? 2.4 : 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // Lighter stone paths along the main lanes.
  ctx.fillStyle = 'rgba(214, 196, 158, 0.10)';
  ctx.fillRect(24, 372, 1232, 56);
  ctx.fillRect(600, 24, 56, 752);
}

function drawCover(ctx, cover) {
  for (const r of cover) {
    if (r.kind === 'wall') {
      ctx.fillStyle = '#3d4a55';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      if (r.h <= 24) ctx.fillRect(r.x, r.y + r.h - 5, r.w, 5);
      else ctx.fillRect(r.x + r.w - 5, r.y, 5, r.h);
      continue;
    }
    // Hedge: dark green body, pale lit top rim, leafy bumps.
    ctx.fillStyle = '#1d4d2e';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#2c6b3f';
    for (let bx = r.x + 6; bx < r.x + r.w - 4; bx += 18) {
      for (let by = r.y + 6; by < r.y + r.h - 4; by += 18) {
        ctx.beginPath();
        ctx.arc(bx, by, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#8fc98f';
    if (r.h <= 44) ctx.fillRect(r.x, r.y, r.w, 6);
    else ctx.fillRect(r.x, r.y, 6, r.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  }
}

function drawLamps(ctx, lamps, t) {
  for (const l of lamps) {
    const flicker = 1 + Math.sin(t * 2.1 + l.x) * 0.04;
    const grad = ctx.createRadialGradient(l.x, l.y, 6, l.x, l.y, l.r * flicker);
    grad.addColorStop(0, 'rgba(255, 196, 90, 0.34)');
    grad.addColorStop(0.6, 'rgba(255, 180, 70, 0.14)');
    grad.addColorStop(1, 'rgba(255, 180, 70, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r * flicker, 0, Math.PI * 2);
    ctx.fill();
    // Lamp post.
    ctx.fillStyle = '#2b2b33';
    ctx.fillRect(l.x - 3, l.y - 14, 6, 28);
    ctx.fillStyle = '#ffd977';
    ctx.beginPath();
    ctx.arc(l.x, l.y - 16, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 240, 180, 0.9)';
    ctx.beginPath();
    ctx.arc(l.x, l.y - 16, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPetals(ctx, petals, t) {
  for (const p of petals) {
    if (p.taken) continue;
    const pulse = 1 + Math.sin(t * 3 + p.x * 0.1) * 0.18;
    const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 34 * pulse);
    grad.addColorStop(0, 'rgba(226, 214, 255, 0.85)');
    grad.addColorStop(0.4, 'rgba(190, 160, 255, 0.28)');
    grad.addColorStop(1, 'rgba(190, 160, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 34 * pulse, 0, Math.PI * 2);
    ctx.fill();
    // Five-petal flower.
    ctx.fillStyle = '#f2eaff';
    ctx.strokeStyle = '#b79cff';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2 + Math.sin(t * 0.8) * 0.1;
      ctx.beginPath();
      ctx.ellipse(p.x + Math.cos(a) * 8, p.y + Math.sin(a) * 8, 6.5, 4, a, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#ffd977';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGate(ctx, gate, open, t) {
  const cx = gate.x + gate.w / 2;
  const cy = gate.y + gate.h / 2;
  if (open) {
    const pulse = 1 + Math.sin(t * 2.4) * 0.12;
    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 90 * pulse);
    grad.addColorStop(0, 'rgba(190, 220, 255, 0.75)');
    grad.addColorStop(0.5, 'rgba(150, 190, 255, 0.25)');
    grad.addColorStop(1, 'rgba(150, 190, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 90 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  // Two stone posts + crescent moon.
  ctx.fillStyle = '#5a6270';
  ctx.fillRect(gate.x, gate.y, 12, gate.h);
  ctx.fillRect(gate.x + gate.w - 12, gate.y, 12, gate.h);
  ctx.fillStyle = '#79828f';
  ctx.fillRect(gate.x, gate.y, 12, 8);
  ctx.fillRect(gate.x + gate.w - 12, gate.y, 12, 8);
  ctx.fillStyle = open ? '#cfe4ff' : '#4a5568';
  ctx.beginPath();
  ctx.arc(cx, gate.y + 16, 14, 0, Math.PI * 2);
  ctx.fill();
  if (open) {
    ctx.fillStyle = '#0e2f33';
    ctx.beginPath();
    ctx.arc(cx + 6, gate.y + 13, 12, 0, Math.PI * 2);
    ctx.fill();
  }
  // Shut gate: dim bars across the opening.
  if (!open) {
    ctx.strokeStyle = 'rgba(120, 130, 145, 0.8)';
    ctx.lineWidth = 3;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(gate.x + 12, gate.y + (gate.h * i) / 4);
      ctx.lineTo(gate.x + gate.w - 12, gate.y + (gate.h * i) / 4);
      ctx.stroke();
    }
  }
  ctx.fillStyle = open ? '#dfeaff' : '#8b95a5';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'MOON GATE OPEN' : 'MOON GATE', cx, gate.y + gate.h + 18);
}

function drawGuard(ctx, g, t) {
  // Soft shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(g.x + 3, g.y + 12, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Slate-blue body with brass lantern.
  ctx.fillStyle = '#3d5a80';
  ctx.beginPath();
  ctx.arc(g.x, g.y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2c4361';
  ctx.beginPath();
  ctx.arc(g.x, g.y + 4, 11, 0, Math.PI);
  ctx.fill();
  // Brass helmet.
  ctx.fillStyle = '#c9a227';
  ctx.beginPath();
  ctx.arc(g.x, g.y - 3, 9, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(g.x - 9, g.y - 4, 18, 3);
  // Lantern held ahead, swinging with the heading.
  const lx = g.x + Math.cos(g.heading) * 20;
  const ly = g.y + Math.sin(g.heading) * 20;
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(g.x + Math.cos(g.heading) * 12, g.y + Math.sin(g.heading) * 12);
  ctx.lineTo(lx, ly);
  ctx.stroke();
  ctx.fillStyle = '#ffd977';
  ctx.beginPath();
  ctx.arc(lx, ly, 5, 0, Math.PI * 2);
  ctx.fill();
  // Eyes look along the heading.
  const ex = Math.cos(g.heading) * 4;
  const ey = Math.sin(g.heading) * 4;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(g.x - 4 + ex, g.y - 2 + ey, 2.4, 0, Math.PI * 2);
  ctx.arc(g.x + 4 + ex, g.y - 2 + ey, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(g.x - 4 + ex * 1.6, g.y - 2 + ey * 1.6, 1.2, 0, Math.PI * 2);
  ctx.arc(g.x + 4 + ex * 1.6, g.y - 2 + ey * 1.6, 1.2, 0, Math.PI * 2);
  ctx.fill();
  // "!" when the meter is high — the near-miss alarm.
  if (g.meter >= 0.66) {
    ctx.fillStyle = '#ff5a46';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', g.x, g.y - 26);
  }
}

function drawPlayer(ctx, p, t) {
  const squash = p.crouching ? 0.72 : 1;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(p.x + 2, p.y + 11 * squash, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cream apron body, apricot hood.
  ctx.fillStyle = '#f3e2c2';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 13 * squash + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8a56b';
  ctx.beginPath();
  ctx.arc(p.x, p.y - 3, 8, 0, Math.PI * 2);
  ctx.fill();
  // Face + hair tuft, turned toward facing.
  const fx = Math.cos(p.facing) * 3;
  const fy = Math.sin(p.facing) * 3;
  ctx.fillStyle = '#2b2b33';
  ctx.beginPath();
  ctx.arc(p.x - 3 + fx, p.y - 4 + fy, 1.6, 0, Math.PI * 2);
  ctx.arc(p.x + 3 + fx, p.y - 4 + fy, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5a4632';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y - 6, 6, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  // Crouch: a "hush" ring so the state reads at a glance.
  if (p.crouching) {
    ctx.strokeStyle = 'rgba(243, 226, 194, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 19, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawRipples(ctx, ripples) {
  for (const r of ripples) {
    const alpha = Math.max(0, 0.55 * (1 - r.age / 0.38));
    ctx.strokeStyle = `rgba(255, 240, 200, ${alpha})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawVignette(ctx, lamps, gate, gateOpen) {
  // Darkness over the whole garden, with lit areas cut out: lamp pools,
  // vision cones stay dimly visible, and the open gate glows.
  const dark = document.createElement('canvas');
  dark.width = 1280;
  dark.height = 800;
  const d = dark.getContext('2d');
  d.fillStyle = 'rgba(4, 12, 20, 0.42)';
  d.fillRect(0, 0, 1280, 800);
  d.globalCompositeOperation = 'destination-out';
  for (const l of lamps) {
    const g = d.createRadialGradient(l.x, l.y, 10, l.x, l.y, l.r * 1.15);
    g.addColorStop(0, 'rgba(0,0,0,0.85)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = g;
    d.beginPath();
    d.arc(l.x, l.y, l.r * 1.15, 0, Math.PI * 2);
    d.fill();
  }
  if (gateOpen) {
    const cx = gate.x + gate.w / 2;
    const cy = gate.y + gate.h / 2;
    const g = d.createRadialGradient(cx, cy, 5, cx, cy, 110);
    g.addColorStop(0, 'rgba(0,0,0,0.8)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = g;
    d.beginPath();
    d.arc(cx, cy, 110, 0, Math.PI * 2);
    d.fill();
  }
  ctx.drawImage(dark, 0, 0);
}

export function renderWorld(ctx, state, t) {
  const level = state.level;
  drawFloor(ctx, t);
  drawLamps(ctx, level.lamps, t);
  drawCover(ctx, level.cover);
  for (const g of state.guards) drawCone(ctx, g, level.cover);
  drawPetals(ctx, level.petals, t);
  drawGate(ctx, level.gate, state.gateOpen, t);
  drawRipples(ctx, state.ripples);
  for (const g of state.guards) drawGuard(ctx, g, t);
  drawPlayer(ctx, state.player, t);
  drawVignette(ctx, level.lamps, level.gate, state.gateOpen);
}

export { segmentHitsRect };
