// player.js — movement (WASD/arrows), crouch, sprint with footstep noise
// ripples, petal pickup, and the moon-gate exit.

export const PLAYER_RADIUS = 13;

export function makePlayer(start) {
  return {
    x: start.x,
    y: start.y,
    vx: 0,
    vy: 0,
    facing: -Math.PI / 2,
    crouching: false,
    sprinting: false,
    moving: false,
    stepTimer: 0,
    rippleTimer: 0,
  };
}

function circleHitsRect(px, py, r, rect) {
  const cx = Math.max(rect.x, Math.min(px, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(py, rect.y + rect.h));
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy < r * r;
}

function blocked(x, y, cover) {
  for (const rect of cover) {
    if (circleHitsRect(x, y, PLAYER_RADIUS, rect)) return true;
  }
  return false;
}

// keys: {up,down,left,right,crouch,sprint}. ripples: array to push new
// footstep ripples into. Returns events: {step: bool, ripple: bool}.
export function updatePlayer(player, keys, dt, cover) {
  const events = { step: false, ripple: false };
  let ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  let iy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  const len = Math.hypot(ix, iy);
  player.moving = len > 0;
  player.crouching = !!keys.crouch;
  player.sprinting = !!keys.sprint && !player.crouching && player.moving;

  if (len > 0) {
    ix /= len;
    iy /= len;
    const speed = player.crouching ? 62 : player.sprinting ? 175 : 118;
    const nx = player.x + ix * speed * dt;
    const ny = player.y + iy * speed * dt;
    // Axis-separated movement so the player slides along hedges.
    if (!blocked(nx, player.y, cover)) player.x = nx;
    if (!blocked(player.x, ny, cover)) player.y = ny;
    player.facing = Math.atan2(iy, ix);
    // Footsteps: soft ticks while walking, ripples while sprinting.
    player.stepTimer -= dt;
    if (player.stepTimer <= 0) {
      player.stepTimer = player.crouching ? 0.5 : player.sprinting ? 0.26 : 0.38;
      events.step = true;
    }
    if (player.sprinting) {
      player.rippleTimer -= dt;
      if (player.rippleTimer <= 0) {
        player.rippleTimer = 0.28;
        events.ripple = true;
      }
    }
  }
  return events;
}

export function updateRipples(ripples, dt) {
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.age += dt;
    r.radius = 12 + r.age * 260;
    if (r.age > 0.38 || r.radius > 95) ripples.splice(i, 1);
  }
}

// Petal pickup: walk within 34px of an ungathered petal. (Raised from 28
// after play-testing: a petal at the edge of the lane was frustratingly
// easy to walk just past without collecting it.)
export function checkPetalPickup(player, petals) {
  for (const p of petals) {
    if (!p.taken && Math.hypot(player.x - p.x, player.y - p.y) < 34) {
      p.taken = true;
      return p;
    }
  }
  return null;
}

export function allPetalsTaken(petals) {
  return petals.every((p) => p.taken);
}

// Gate exit: only open once every petal is gathered.
export function checkGateExit(player, gate, petals) {
  if (!allPetalsTaken(petals)) return false;
  return (
    player.x > gate.x - 6 &&
    player.x < gate.x + gate.w + 6 &&
    player.y > gate.y - 6 &&
    player.y < gate.y + gate.h + 6
  );
}
