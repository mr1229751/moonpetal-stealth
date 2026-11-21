// garden.js — the three levels as data: hedges and walls (cover), lamp
// positions, guard patrols, petal spots, player start, and the moon gate.
// Coordinates are in the 1280x800 garden frame. Cover rectangles block both
// movement and guard line of sight; lamps mark lit ground (detection is
// faster there, slower in shadow).

export const GARDEN = { w: 1280, h: 800 };

// A wall border keeps the player inside the garden.
function borderWalls() {
  return [
    { x: 0, y: 0, w: 1280, h: 24, kind: 'wall' },
    { x: 0, y: 776, w: 1280, h: 24, kind: 'wall' },
    { x: 0, y: 0, w: 24, h: 800, kind: 'wall' },
    { x: 1256, y: 0, w: 24, h: 800, kind: 'wall' },
  ];
}

// A guard patrol: waypoints with optional pauses (seconds) and a look
// direction (radians) held while paused.
function patrol(waypoints, speed = 55) {
  return { waypoints, speed };
}

export const LEVELS = [
  {
    name: 'First Bloom',
    intro: 'Gather the three moonpetals, then slip through the moon gate.',
    start: { x: 90, y: 690 },
    gate: { x: 1150, y: 90, w: 64, h: 84 },
    petals: [
      { x: 330, y: 200 },
      { x: 700, y: 620 },
      { x: 1060, y: 420 },
    ],
    lamps: [
      { x: 420, y: 360, r: 130 },
      { x: 900, y: 180, r: 120 },
    ],
    cover: [
      ...borderWalls(),
      { x: 220, y: 120, w: 260, h: 44, kind: 'hedge' },
      { x: 220, y: 560, w: 260, h: 44, kind: 'hedge' },
      { x: 560, y: 300, w: 44, h: 240, kind: 'hedge' },
      { x: 760, y: 120, w: 260, h: 44, kind: 'hedge' },
      { x: 860, y: 480, w: 260, h: 44, kind: 'hedge' },
      { x: 1080, y: 260, w: 44, h: 200, kind: 'hedge' },
    ],
    guards: [
      patrol([
        { x: 420, y: 250, pause: 1.6, look: Math.PI / 2 },
        { x: 420, y: 480, pause: 1.2, look: -Math.PI / 2 },
      ]),
      patrol([
        { x: 900, y: 300, pause: 2.0, look: Math.PI },
        { x: 900, y: 560, pause: 1.0, look: 0 },
      ]),
    ],
  },
  {
    name: 'Lamp Courtyard',
    intro: 'The courtyard lamps leave little shadow. Move between the hedges.',
    start: { x: 90, y: 110 },
    gate: { x: 1150, y: 690, w: 64, h: 84 },
    petals: [
      { x: 640, y: 400 },
      { x: 300, y: 640 },
      { x: 1080, y: 180 },
    ],
    lamps: [
      { x: 640, y: 400, r: 150 },
      { x: 340, y: 300, r: 110 },
      { x: 980, y: 560, r: 120 },
    ],
    cover: [
      ...borderWalls(),
      { x: 180, y: 240, w: 44, h: 320, kind: 'hedge' },
      { x: 420, y: 200, w: 300, h: 44, kind: 'hedge' },
      { x: 420, y: 560, w: 300, h: 44, kind: 'hedge' },
      { x: 800, y: 240, w: 44, h: 320, kind: 'hedge' },
      { x: 960, y: 200, w: 200, h: 44, kind: 'hedge' },
      { x: 520, y: 360, w: 200, h: 44, kind: 'hedge' },
      { x: 180, y: 640, w: 260, h: 44, kind: 'hedge' },
    ],
    guards: [
      patrol([
        { x: 340, y: 420, pause: 1.4, look: 0 },
        { x: 640, y: 420, pause: 1.4, look: Math.PI },
      ], 62),
      patrol([
        { x: 900, y: 320, pause: 1.8, look: Math.PI / 2 },
        { x: 900, y: 620, pause: 1.0, look: -Math.PI / 2 },
      ], 62),
      patrol([
        { x: 1120, y: 320, pause: 2.2, look: Math.PI },
        { x: 1120, y: 520, pause: 1.2, look: Math.PI / 2 },
      ], 58),
    ],
  },
  {
    name: 'Moonlit Maze',
    intro: 'Four lanterns, tight lanes, one open gate. Be the shadow.',
    start: { x: 90, y: 690 },
    gate: { x: 1150, y: 90, w: 64, h: 84 },
    petals: [
      { x: 260, y: 180 },
      { x: 640, y: 640 },
      { x: 1040, y: 500 },
    ],
    lamps: [
      { x: 420, y: 220, r: 120 },
      { x: 860, y: 360, r: 130 },
      { x: 560, y: 620, r: 110 },
      { x: 1080, y: 200, r: 110 },
    ],
    cover: [
      ...borderWalls(),
      { x: 180, y: 140, w: 220, h: 44, kind: 'hedge' },
      { x: 180, y: 420, w: 44, h: 260, kind: 'hedge' },
      { x: 420, y: 300, w: 44, h: 260, kind: 'hedge' },
      { x: 500, y: 140, w: 300, h: 44, kind: 'hedge' },
      { x: 620, y: 420, w: 300, h: 44, kind: 'hedge' },
      { x: 960, y: 300, w: 44, h: 260, kind: 'hedge' },
      { x: 1060, y: 560, w: 160, h: 44, kind: 'hedge' },
      { x: 300, y: 620, w: 260, h: 44, kind: 'hedge' },
      { x: 820, y: 620, w: 44, h: 130, kind: 'hedge' },
    ],
    guards: [
      patrol([
        { x: 300, y: 300, pause: 1.2, look: Math.PI / 2 },
        { x: 300, y: 560, pause: 1.6, look: -Math.PI / 2 },
      ], 66),
      patrol([
        { x: 700, y: 260, pause: 1.8, look: 0 },
        { x: 700, y: 560, pause: 1.0, look: Math.PI },
      ], 66),
      patrol([
        { x: 1040, y: 260, pause: 2.0, look: -Math.PI / 2 },
        { x: 1040, y: 640, pause: 1.2, look: Math.PI / 2 },
      ], 62),
      patrol([
        { x: 520, y: 480, pause: 1.5, look: Math.PI },
        { x: 880, y: 480, pause: 1.5, look: 0 },
      ], 60),
    ],
  },
];
