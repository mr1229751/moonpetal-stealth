// guards.js — guard patrols, vision cones, line-of-sight occlusion, the
// per-guard detection meter, and investigate-the-noise behaviour.

export const CONE_RANGE = 185;
export const CONE_HALF_ANGLE = (32 * Math.PI) / 180;

// Does segment (x1,y1)-(x2,y2) hit rectangle r? (slab test)
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

export function lineOfSightClear(x1, y1, x2, y2, cover) {
  for (const r of cover) {
    if (segmentHitsRect(x1, y1, x2, y2, r)) return false;
  }
  return true;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

// Is the player inside this guard's cone with a clear line of sight?
export function guardSeesPlayer(guard, player, cover) {
  const d = dist(guard.x, guard.y, player.x, player.y);
  if (d > CONE_RANGE) return false;
  const ang = Math.atan2(player.y - guard.y, player.x - guard.x);
  if (Math.abs(angleDiff(ang, guard.heading)) > CONE_HALF_ANGLE) return false;
  return lineOfSightClear(guard.x, guard.y, player.x, player.y, cover);
}

export function makeGuard(patrolDef) {
  const first = patrolDef.waypoints[0];
  return {
    x: first.x,
    y: first.y,
    heading: 0,
    wpIndex: 1 % patrolDef.waypoints.length,
    pauseLeft: 0,
    speed: patrolDef.speed,
    meter: 0,
    state: 'patrol', // patrol | investigate | return
    investigateTarget: null,
    lookTimer: 0,
    patrol: patrolDef,
    // head-turn sweep while paused: swings heading around the look direction
    sweepPhase: 0,
  };
}

// A guard hears a footstep ripple if its body is inside the ripple radius.
export function guardHearsRipple(guard, ripple) {
  return dist(guard.x, guard.y, ripple.x, ripple.y) <= ripple.radius;
}

export function updateGuard(guard, dt, player, cover, lamps, ripples) {
  // Hearing: sprint ripples pull the guard off patrol.
  if (guard.state === 'patrol') {
    for (const r of ripples) {
      if (guardHearsRipple(guard, r)) {
        guard.state = 'investigate';
        guard.investigateTarget = { x: r.x, y: r.y };
        break;
      }
    }
  }

  if (guard.state === 'investigate') {
    const t = guard.investigateTarget;
    const d = dist(guard.x, guard.y, t.x, t.y);
    if (d < 8) {
      guard.lookTimer += dt;
      guard.sweepPhase += dt * 2.2;
      guard.heading = Math.atan2(t.y - guard.y, t.x - guard.x) + Math.sin(guard.sweepPhase) * 0.9;
      if (guard.lookTimer >= 2) {
        guard.state = 'return';
        guard.lookTimer = 0;
      }
    } else {
      guard.heading = Math.atan2(t.y - guard.y, t.x - guard.x);
      const step = guard.speed * 1.25 * dt;
      guard.x += Math.cos(guard.heading) * Math.min(step, d);
      guard.y += Math.sin(guard.heading) * Math.min(step, d);
    }
  } else if (guard.state === 'return') {
    // Walk back to the nearest patrol waypoint, then resume the loop.
    const wps = guard.patrol.waypoints;
    let best = 0;
    let bestD = Infinity;
    wps.forEach((w, i) => {
      const d = dist(guard.x, guard.y, w.x, w.y);
      if (d < bestD) { bestD = d; best = i; }
    });
    const target = wps[best];
    const d = dist(guard.x, guard.y, target.x, target.y);
    if (d < 8) {
      guard.wpIndex = (best + 1) % wps.length;
      guard.state = 'patrol';
      guard.pauseLeft = 0;
    } else {
      guard.heading = Math.atan2(target.y - guard.y, target.x - guard.x);
      const step = guard.speed * dt;
      guard.x += Math.cos(guard.heading) * Math.min(step, d);
      guard.y += Math.sin(guard.heading) * Math.min(step, d);
    }
  } else {
    // Patrol: walk the waypoint loop, pausing and looking around.
    const wps = guard.patrol.waypoints;
    const target = wps[guard.wpIndex];
    if (guard.pauseLeft > 0) {
      guard.pauseLeft -= dt;
      guard.sweepPhase += dt * 1.6;
      const base = target.look ?? guard.heading;
      guard.heading = base + Math.sin(guard.sweepPhase) * 0.7;
      if (guard.pauseLeft <= 0) guard.wpIndex = (guard.wpIndex + 1) % wps.length;
    } else {
      const d = dist(guard.x, guard.y, target.x, target.y);
      if (d < 6) {
        guard.pauseLeft = target.pause ?? 0;
        guard.sweepPhase = 0;
        if (guard.pauseLeft <= 0) guard.wpIndex = (guard.wpIndex + 1) % wps.length;
      } else {
        guard.heading = Math.atan2(target.y - guard.y, target.x - guard.x);
        const step = guard.speed * dt;
        guard.x += Math.cos(guard.heading) * Math.min(step, d);
        guard.y += Math.sin(guard.heading) * Math.min(step, d);
      }
    }
  }

  // Detection meter: fills while seen, decays when unseen. Never an
  // instant catch below 1.0 — a near miss is always recoverable.
  const seen = guardSeesPlayer(guard, player, cover);
  if (seen) {
    const d = dist(guard.x, guard.y, player.x, player.y);
    let rate = 0.55 + (1 - d / CONE_RANGE) * 0.9; // closer = faster
    if (playerInLamp(player, lamps)) rate *= 1.6;
    else rate *= 0.7; // shadow slows the gaze
    if (player.crouching) rate *= 0.55;
    guard.meter = Math.min(1, guard.meter + rate * dt);
  } else {
    guard.meter = Math.max(0, guard.meter - 0.5 * dt);
  }
  return seen;
}

function playerInLamp(player, lamps) {
  for (const l of lamps) {
    if (dist(player.x, player.y, l.x, l.y) <= l.r) return true;
  }
  return false;
}

export function highestMeter(guards) {
  let m = 0;
  for (const g of guards) m = Math.max(m, g.meter);
  return m;
}
