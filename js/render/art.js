// render/art.js
// The look of the game: palette, fonts and small drawing helpers shared by every
// render file.
//
// Art direction (PLAN.md §1): flat editorial illustration on a Monday morning.
// The sun is low in the lower left, so EVERY shadow falls up and to the right by
// SHADOW_OFFSET. Keeping that one rule is what makes the scene feel lit.

const PALETTE = {
  ink: '#1f2430',
  inkSoft: '#4a5060',
  paper: '#fbf6ec',
  paperShade: '#efe6d4',

  lobbyFloor: '#eee3cf',
  terrazzoChips: ['#d8c6a6', '#c7ad86', '#b6c0bc', '#e9dbc2', '#a99579', '#d6b6a1', '#9fb0ae'],
  brassDark: '#8a6a2f',
  brass: '#c79a45',
  brassLight: '#f1d68f',
  wood: '#7a4b2c',
  woodLight: '#9a6440',
  leaf: '#4f8a5b',
  leafDark: '#3a6c47',
  leafLight: '#73ab6f',

  facade: '#363a45',
  facadeLight: '#4a4f5c',
  window: '#9cc3d6',

  sidewalk: '#c2c5c6',
  sidewalkJoint: '#aab0b3',
  puddle: '#94a2ad',
  curb: '#dcdedd',
  road: '#464a52',
  roadMark: '#ece6d3',

  glass: 'rgba(176, 218, 238, 0.55)',
  glassSolid: '#cfe6f1',
  glassEdge: '#7fb3d5',

  shadow: 'rgba(52, 38, 24, 0.20)',
  shadowSoft: 'rgba(52, 38, 24, 0.10)',

  belt: '#2c3a63',
  safe: '#36b368',
  warning: '#f2b51d',
  danger: '#e2453c',
  pinkSlip: '#f8d3d6',

  skinTones: ['#f1c7a5', '#e0a982', '#c98b62', '#9c6544', '#6e4630'],
  hairColors: ['#2b2420', '#4a3426', '#7a5434', '#c79a5b', '#1c1c22', '#8b8b8b', '#a5452f'],
};

const MOOD_COLORS = {
  comfortable: PALETTE.safe,
  impatient: PALETTE.warning,
  furious: PALETTE.danger,
};

const FONT_DISPLAY = '"Futura", "Avenir Next", "Century Gothic", "Trebuchet MS", sans-serif';
const FONT_UI = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif';

const SHADOW_OFFSET = { x: 5, y: -4 };   // sun from the lower left: shadows go up and to the right

function font(size, weight = 'bold', family = FONT_UI) {
  return `${weight} ${size}px ${family}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - clamp(t, 0, 1), 3);
}

function easeInOutCubic(t) {
  t = clamp(t, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Overshoots a little before settling: for things that pop in. */
function easeOutBack(t) {
  t = clamp(t, 0, 1);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** Small deterministic random generator, so generated art looks the same every load. */
function seededRandom(seed) {
  let state = seed >>> 0;
  return function () {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function fillRoundRect(ctx, x, y, width, height, radius, color) {
  roundRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = color;
  ctx.fill();
}

function fillCircle(ctx, x, y, radius, color) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function fillEllipse(ctx, x, y, radiusX, radiusY, rotation, color) {
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * A paper card with a flat offset shadow: the base of every HUD panel.
 * The shadow goes the same way as the sun's, so HUD and world feel like one picture.
 */
function drawCard(ctx, x, y, width, height, options = {}) {
  const radius = options.radius ?? 12;
  fillRoundRect(ctx, x + 4, y + 4, width, height, radius, options.shadow ?? 'rgba(20, 16, 10, 0.22)');
  fillRoundRect(ctx, x, y, width, height, radius, options.fill ?? PALETTE.paper);
  if (options.border !== false) {
    roundRectPath(ctx, x + 0.5, y + 0.5, width - 1, height - 1, radius);
    ctx.strokeStyle = options.border ?? 'rgba(31, 36, 48, 0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/** Draws text with letter spacing (canvas has no portable letterSpacing yet). */
function fillSpacedText(ctx, text, x, y, spacing) {
  const characters = [...text];
  const widths = characters.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (characters.length - 1);
  const align = ctx.textAlign;
  let cursor = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.textAlign = 'left';
  characters.forEach((c, i) => {
    ctx.fillText(c, cursor, y);
    cursor += widths[i] + spacing;
  });
  ctx.textAlign = align;
}

/** A keyboard key cap, used on the title screen and in hints. */
function drawKeyCap(ctx, x, y, width, label, options = {}) {
  const height = options.height ?? 26;
  fillRoundRect(ctx, x, y + 3, width, height, 6, '#b9b0a0');
  fillRoundRect(ctx, x, y, width, height, 6, options.fill ?? '#ffffff');
  roundRectPath(ctx, x + 0.5, y + 0.5, width - 1, height - 1, 6);
  ctx.strokeStyle = 'rgba(31, 36, 48, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = PALETTE.ink;
  ctx.font = font(options.fontSize ?? 12, 'bold');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + width / 2, y + height / 2 + 1);
}
