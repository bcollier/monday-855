// render/characters.js
// The four passenger types, seen from above. Each one reads by SILHOUETTE first
// (phone, briefcase, coffee tray, cart), then color, so they stay distinguishable
// for color-blind players too (AC #14, #15).
//
// Every figure is drawn facing +x in its own local space, then rotated to face
// where the person is going. Shadows are drawn separately, offset in screen space,
// so they always fall toward the upper right whatever way the person faces.

const WORKER_SHIRTS = ['#7d8fa6', '#8fa58a', '#b48a9b', '#c9a87a', '#6f7f86'];
const MANAGER_SUIT = '#27355e';
const INTERN_CARDIGAN = '#d99a2b';
const COURIER_JACKET = '#2a6d74';
const COURIER_HELMET = '#d2502e';
// A fixed look for the small portraits in the HUD (meter lanes, title screen).
const PORTRAIT_LOOK = { shirtIndex: 0, hair: '#4a3426', skin: '#e0a982', accent: '#3b6fd1', hasBag: false };

/**
 * Draws one person. `pose` holds how they're moving and feeling:
 *   isWalking, walkPhase  - feet stepping
 *   wobble (0–1+)         - intern cups / courier boxes sliding as the door nears their limit
 *   isTapping             - manager taps their watch while the too-slow timer runs
 *   time                  - for small idle motion
 *   scale                 - 1 in the world; smaller for HUD portraits
 */
function drawPersonFigure(ctx, x, y, facing, typeKey, look, pose = {}) {
  const scale = pose.scale ?? 1;
  drawFigureShadow(ctx, x, y, facing, typeKey, scale);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(facing);
  ctx.scale(scale, scale);

  if (pose.isWalking) {
    const step = Math.sin(pose.walkPhase ?? 0);
    fillEllipse(ctx, 3 + step * 5, -5, 4, 2.4, 0, '#2a2a30');
    fillEllipse(ctx, 3 - step * 5, 5, 4, 2.4, 0, '#2a2a30');
  }

  switch (typeKey) {
    case 'manager': drawManager(ctx, look, pose); break;
    case 'intern': drawIntern(ctx, look, pose); break;
    case 'courier': drawCourier(ctx, look, pose); break;
    case 'troublemaker': drawTroublemaker(ctx, look, pose); break;
    default: drawOfficeWorker(ctx, look, pose);
  }
  ctx.restore();
}

function drawFigureShadow(ctx, x, y, facing, typeKey, scale) {
  ctx.save();
  ctx.translate(x + SHADOW_OFFSET.x * 0.8 * scale, y + SHADOW_OFFSET.y * 0.8 * scale);
  ctx.rotate(facing);
  ctx.scale(scale, scale);
  ctx.fillStyle = PALETTE.shadow;
  ctx.beginPath();
  ctx.ellipse(0, 0, 8.5, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  if (typeKey === 'courier') {
    roundRectPath(ctx, 10, -12.5, 28, 25, 3);
    ctx.fill();
  } else if (typeKey === 'intern') {
    roundRectPath(ctx, 9, -10.5, 15, 21, 3);
    ctx.fill();
  }
  ctx.restore();
}

function drawHead(ctx, look, hairStyle) {
  fillCircle(ctx, 1.2, 0, 6.2, look.skin);
  if (hairStyle === 'bun') fillCircle(ctx, -6.2, 0, 3, look.hair);
  fillCircle(ctx, -0.9, 0, 5.9, look.hair);
  if (hairStyle === 'slick') {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(-1, 0, 3.6, -1.2, 1.2);
    ctx.stroke();
  }
}

function drawOfficeWorker(ctx, look, pose) {
  const rare = look.rare?.key;
  if (rare === 'dino') return drawDinoWorker(ctx, look, pose);
  const shirt = WORKER_SHIRTS[look.shirtIndex % WORKER_SHIRTS.length];
  if (look.hasBag) fillRoundRect(ctx, -9, 8, 11, 7, 2, '#6b4a33');
  fillEllipse(ctx, 0, 0, 7.5, 12, 0, shirt);
  // Lanyard
  ctx.strokeStyle = look.accent;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(3, -3.5);
  ctx.lineTo(7, 0);
  ctx.lineTo(3, 3.5);
  ctx.stroke();
  if (rare === 'cake' || rare === 'plant') {
    // Both hands out front, carrying something precious
    fillCircle(ctx, 9, -7, 2.6, look.skin);
    fillCircle(ctx, 9, 7, 2.6, look.skin);
    if (rare === 'cake') {
      drawHead(ctx, look, 'short');
      drawBirthdayCake(ctx, 16, 0, pose.time ?? 0);
    } else {
      fillCircle(ctx, 13, 0, 5.5, '#b86a45');
      drawHead(ctx, look, 'short');
      drawFicusLeaves(ctx, 14, 0, pose.time ?? 0);
    }
    return;
  }
  // Hands: one holding a phone out in front
  fillCircle(ctx, 2, -11, 2.6, look.skin);
  fillCircle(ctx, 9, 6, 2.6, look.skin);
  fillRoundRect(ctx, 9.5, 3.5, 6, 4.5, 1, '#1f2430');
  fillRoundRect(ctx, 10.3, 4.2, 4.4, 3.1, 0.8, pose.isPhoneLit ? '#bfe3ff' : '#4f6b8a');
  drawHead(ctx, look, look.shirtIndex % 2 ? 'bun' : 'short');
}

/** Rare: an office worker who came to work in a dinosaur onesie. Still has their phone. */
function drawDinoWorker(ctx, look, pose) {
  const green = '#6bb35e';
  const wag = Math.sin((pose.walkPhase ?? 0) * 1.2) * 2.5;
  ctx.fillStyle = green;
  ctx.beginPath();
  ctx.moveTo(-5, -4.5);
  ctx.lineTo(-22, wag);
  ctx.lineTo(-5, 4.5);
  ctx.closePath();
  ctx.fill();
  fillEllipse(ctx, 0, 0, 8, 12.5, 0, green);
  for (let k = 0; k < 5; k++) {
    const x = -18 + k * 4.2;
    ctx.fillStyle = '#f2c230';
    ctx.beginPath();
    ctx.moveTo(x - 1.8, wag * (1 - k / 5) * 0.6);
    ctx.lineTo(x, -2.2);
    ctx.lineTo(x + 1.8, 0);
    ctx.lineTo(x, 2.2);
    ctx.closePath();
    ctx.fill();
  }
  fillCircle(ctx, 2, -11, 2.8, green);
  fillCircle(ctx, 9, 6, 2.8, green);
  fillRoundRect(ctx, 9.5, 3.5, 6, 4.5, 1, '#1f2430');
  // Hood with eyes and felt teeth
  fillCircle(ctx, 0.5, 0, 6.8, green);
  for (const side of [-1, 1]) {
    fillCircle(ctx, 4, side * 3, 1.9, '#ffffff');
    fillCircle(ctx, 4.6, side * 3, 0.9, '#1f2430');
  }
  ctx.fillStyle = '#ffffff';
  for (const y of [-2.5, 0, 2.5]) {
    ctx.beginPath();
    ctx.moveTo(6.6, y - 1.1);
    ctx.lineTo(8, y);
    ctx.lineTo(6.6, y + 1.1);
    ctx.closePath();
    ctx.fill();
  }
}

function drawBirthdayCake(ctx, x, y, time) {
  fillCircle(ctx, x, y, 8.5, '#ffffff');
  fillCircle(ctx, x, y, 7, '#f4a7c0');
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    fillCircle(ctx, x + Math.cos(a) * 5.6, y + Math.sin(a) * 5.6, 1.2, '#fff4f8');
  }
  for (const [cx, cy] of [[-2, -2.5], [2.5, 0], [-2, 2.5]]) {
    fillCircle(ctx, x + cx, y + cy, 1, '#5b8de0');
    const flicker = 1 + Math.sin(time * 30 + cx) * 0.25;
    fillCircle(ctx, x + cx, y + cy, 1.5 * flicker, 'rgba(255, 196, 64, 0.85)');
  }
}

function drawFicusLeaves(ctx, x, y, time) {
  const sway = Math.sin(time * 3) * 0.08;
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + sway;
    fillEllipse(ctx, x + Math.cos(a) * 9, y + Math.sin(a) * 9, 8, 3.4, a, k % 2 ? PALETTE.leaf : PALETTE.leafDark);
  }
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + 0.3 - sway;
    fillEllipse(ctx, x + Math.cos(a) * 4.5, y + Math.sin(a) * 4.5, 5, 2.2, a, PALETTE.leafLight);
  }
}

function drawManager(ctx, look, pose) {
  const isCeo = look.rare?.key === 'ceo';
  // Briefcase at their side (gold, if you're the CEO)
  fillRoundRect(ctx, -6, 11.5, 14, 6, 1.5, isCeo ? PALETTE.brass : '#5a3a22');
  fillRoundRect(ctx, -1, 10.5, 4, 2, 1, isCeo ? PALETTE.brassLight : PALETTE.brass);
  fillEllipse(ctx, 0, 0, 8, 12.5, 0, isCeo ? '#15171d' : MANAGER_SUIT);
  // Shirt V, lapels and red tie
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath();
  ctx.moveTo(4, -3.5);
  ctx.lineTo(8.3, 0);
  ctx.lineTo(4, 3.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = isCeo ? '#e6b84a' : '#d43d3d';
  ctx.beginPath();
  ctx.moveTo(5.2, -1.3);
  ctx.lineTo(8.6, 0);
  ctx.lineTo(5.2, 1.3);
  ctx.closePath();
  ctx.fill();

  if (pose.isTapping) {
    // Arm raised: tapping the watch, faster as the timer runs down
    const tap = Math.sin((pose.time ?? 0) * 26) * 1.6;
    fillCircle(ctx, 9, -5, 2.8, look.skin);
    fillRoundRect(ctx, 7.6, -7.2, 3.2, 4.4, 1, PALETTE.brass);
    fillCircle(ctx, 10.5 + tap * 0.3, -1 + tap, 2.6, look.skin);
  } else {
    fillCircle(ctx, 1, -11.5, 2.7, look.skin);
    fillCircle(ctx, 1, 11.5, 2.7, look.skin);
  }
  drawHead(ctx, { ...look, hair: isCeo ? '#d8d8d8' : look.hair === '#c79a5b' ? '#2b2420' : look.hair }, 'slick');
  if (isCeo) {
    // Sunglasses. Indoors. On a Monday.
    fillRoundRect(ctx, 3.6, -5.2, 3.4, 4.4, 1.4, '#0e0f12');
    fillRoundRect(ctx, 3.6, 0.8, 3.4, 4.4, 1.4, '#0e0f12');
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(4.4, -4.4, 0.8, 1.6);
  }
}

function drawIntern(ctx, look, pose) {
  fillEllipse(ctx, 0, 0, 7.5, 11.5, 0, INTERN_CARDIGAN);
  // Arms reaching forward to the tray
  ctx.strokeStyle = INTERN_CARDIGAN;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(1, -9); ctx.lineTo(9, -9);
  ctx.moveTo(1, 9); ctx.lineTo(9, 9);
  ctx.stroke();
  fillCircle(ctx, 10, -9, 2.4, look.skin);
  fillCircle(ctx, 10, 9, 2.4, look.skin);

  // The tray of six coffees (twelve, on two trays, for the rare overachiever).
  // The cups wobble harder as the door nears 60 °/s.
  const wobble = pose.wobble ?? 0;
  const time = pose.time ?? 0;
  const isTwelve = look.rare?.key === 'twelve';
  const halfHeight = isTwelve ? 20.5 : 10.5;
  const rows = isTwelve ? [-16.5, -10.3, -4.1, 4.1, 10.3, 16.5] : [-6.2, 0, 6.2];
  if (isTwelve) {
    fillCircle(ctx, 10, -15, 2.4, look.skin);
    fillCircle(ctx, 10, 15, 2.4, look.skin);
  }
  fillRoundRect(ctx, 9, -halfHeight, 15, halfHeight * 2, 3, '#d6bf93');
  roundRectPath(ctx, 9, -halfHeight, 15, halfHeight * 2, 3);
  ctx.strokeStyle = '#b39a6a';
  ctx.lineWidth = 1;
  ctx.stroke();
  let cup = 0;
  for (const cupX of [13, 20]) {
    for (const cupY of rows) {
      const jitterX = Math.sin(time * 31 + cup * 1.9) * wobble * 1.4;
      const jitterY = Math.cos(time * 27 + cup * 2.3) * wobble * 1.4;
      fillCircle(ctx, cupX + jitterX, cupY + jitterY, 3.1, '#fffaf0');
      fillCircle(ctx, cupX + jitterX, cupY + jitterY, 1.5, wobble > 0.6 ? '#8a5530' : '#c9a27c');
      cup++;
    }
  }
  drawHead(ctx, look, 'bun');
}

function drawCourier(ctx, look, pose) {
  // Cart in front, stacked with boxes that slide as the door nears 70 °/s.
  const slide = Math.sin((pose.time ?? 0) * 18) * (pose.wobble ?? 0) * 1.8;
  fillRoundRect(ctx, 11, -12, 27, 24, 3, '#8e959c');
  fillRoundRect(ctx, 12.5, -10.5, 24, 21, 2, '#a9b0b6');
  const boxes = [[13.5, -10, 11, 9.5], [13.5, 0.5, 11, 9.5], [25.5, -8.5, 10.5, 17]];
  boxes.forEach(([bx, by, bw, bh], i) => {
    const offset = i === 2 ? -slide : slide;
    fillRoundRect(ctx, bx, by + offset, bw, bh, 1.5, i === 2 ? '#b9844b' : '#c8975a');
    ctx.fillStyle = '#ead6ae';
    ctx.fillRect(bx + bw / 2 - 1, by + offset, 2, bh);
  });
  // Top box on the stack
  fillRoundRect(ctx, 15.5, -5 + slide * 1.4, 8, 9, 1.5, '#d9aa6c');
  if (look.rare?.key === 'cat') drawCartCat(ctx, 20, slide * 1.4, pose.time ?? 0);
  // Handle bar and hands
  ctx.strokeStyle = '#3d4250';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(9.5, -11);
  ctx.lineTo(9.5, 11);
  ctx.stroke();
  fillEllipse(ctx, 0, 0, 7.8, 12, 0, COURIER_JACKET);
  fillRoundRect(ctx, -5, -4, 3, 8, 1, '#f2c230');   // reflective stripe
  fillCircle(ctx, 9, -8.5, 2.6, look.skin);
  fillCircle(ctx, 9, 8.5, 2.6, look.skin);
  // Bike helmet with vents
  fillCircle(ctx, 0, 0, 6.8, COURIER_HELMET);
  ctx.strokeStyle = '#8f2f1a';
  ctx.lineWidth = 1.2;
  for (const offset of [-2.5, 0, 2.5]) {
    ctx.beginPath();
    ctx.moveTo(-4, offset);
    ctx.lineTo(3, offset);
    ctx.stroke();
  }
  fillEllipse(ctx, 5.4, 0, 1.8, 4.2, 0, '#2a2a30');
}

/** Rare: a ginger cat riding on top of the courier's boxes, tail swishing. */
function drawCartCat(ctx, x, y, time) {
  ctx.strokeStyle = '#d9822b';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 4, y);
  ctx.quadraticCurveTo(x - 9, y + Math.sin(time * 4) * 6, x - 6, y + 6 + Math.sin(time * 4) * 2);
  ctx.stroke();
  fillEllipse(ctx, x, y, 5.5, 4.6, 0, '#e8933a');
  ctx.strokeStyle = '#b8641c';
  ctx.lineWidth = 1;
  for (const sx of [-2, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(x + sx, y - 3.5);
    ctx.lineTo(x + sx, y + 3.5);
    ctx.stroke();
  }
  fillCircle(ctx, x + 5, y, 3.4, '#e8933a');
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#e8933a';
    ctx.beginPath();
    ctx.moveTo(x + 4, y + side * 1.5);
    ctx.lineTo(x + 6.5, y + side * 4.4);
    ctx.lineTo(x + 7, y + side * 1);
    ctx.closePath();
    ctx.fill();
  }
}

// ---- Troublemakers (Rush mode) ----

function drawTroublemaker(ctx, look, pose) {
  if (look.trouble === 'pickpocket') return drawPickpocket(ctx, look, pose);
  if (look.trouble === 'kid') return drawSpinnyKid(ctx, look, pose);
  return drawSalesperson(ctx, look, pose);
}

/** Loud checked blazer, bow tie, clipboard thrust forward. */
function drawSalesperson(ctx, look) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 12.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#d8a93a';
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(120, 60, 20, 0.55)';
  ctx.lineWidth = 1.4;
  for (let k = -12; k <= 12; k += 4.5) {
    ctx.beginPath(); ctx.moveTo(-9, k); ctx.lineTo(9, k); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(k, -13); ctx.lineTo(k, 13); ctx.stroke();
  }
  ctx.restore();
  fillCircle(ctx, 10, -6, 2.6, look.skin);
  fillCircle(ctx, 10, 6, 2.6, look.skin);
  fillRoundRect(ctx, 10.5, -6.5, 9, 13, 1.5, '#8a5a32');
  fillRoundRect(ctx, 11.5, -5.2, 7, 10.6, 1, '#ffffff');
  ctx.fillStyle = 'rgba(31, 36, 48, 0.4)';
  for (let k = 0; k < 4; k++) ctx.fillRect(12.5, -3.6 + k * 2.4, 5, 0.8);
  fillRoundRect(ctx, 10.2, -1.6, 2.2, 3.2, 0.8, '#c0c4cc');
  drawHead(ctx, look, 'slick');
  // Red bow tie
  ctx.fillStyle = '#d43d3d';
  ctx.beginPath();
  ctx.moveTo(7, 0); ctx.lineTo(9, -2.6); ctx.lineTo(9, 2.6); ctx.closePath();
  ctx.moveTo(7, 0); ctx.lineTo(5, -2.6); ctx.lineTo(5, 2.6); ctx.closePath();
  ctx.fill();
}

/** Striped shirt, black beanie, a suspicious sack over the shoulder. */
function drawPickpocket(ctx, look) {
  fillCircle(ctx, -9, 6, 6, '#a08c6a');
  fillCircle(ctx, -9, 6, 2, '#7a6a4e');
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, 7.5, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#f4f1ea';
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = '#1f2430';
  for (let k = -12; k <= 12; k += 4) ctx.fillRect(-9, k, 18, 2);
  ctx.restore();
  fillCircle(ctx, 6, -9, 2.5, look.skin);
  fillCircle(ctx, 6, 9, 2.5, look.skin);
  fillCircle(ctx, 1.2, 0, 6.2, look.skin);
  fillCircle(ctx, -1, 0, 6.2, '#1f2430');
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 0.8;
  for (const r of [2.5, 4.5]) { ctx.beginPath(); ctx.arc(-1, 0, r, 0, Math.PI * 2); ctx.stroke(); }
  // Eye mask
  fillRoundRect(ctx, 3.6, -4.6, 2.6, 9.2, 1.2, '#1f2430');
  fillCircle(ctx, 5, -2.2, 0.9, '#ffffff');
  fillCircle(ctx, 5, 2.2, 0.9, '#ffffff');
}

/** A small kid in a propeller cap with a lollipop. Just wants to spin. */
function drawSpinnyKid(ctx, look, pose) {
  ctx.save();
  ctx.scale(0.8, 0.8);
  fillEllipse(ctx, 0, 0, 7.5, 11, 0, '#2fb3a5');
  fillCircle(ctx, 8, -7, 2.6, look.skin);
  fillCircle(ctx, 8, 7, 2.6, look.skin);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(8, 7); ctx.lineTo(14, 9); ctx.stroke();
  fillCircle(ctx, 15.5, 9.5, 3.4, '#e25c8a');
  fillCircle(ctx, 15.5, 9.5, 1.6, '#ffd1e3');
  // Cap in four colors
  const colors = ['#e2453c', '#f2c230', '#3b6fd1', '#36b368'];
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 6.6, (k * Math.PI) / 2, ((k + 1) * Math.PI) / 2);
    ctx.closePath();
    ctx.fillStyle = colors[k];
    ctx.fill();
  }
  // Propeller
  ctx.rotate((pose.time ?? 0) * 18);
  ctx.strokeStyle = '#f2c230';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
  fillCircle(ctx, 0, 0, 1.6, '#1f2430');
  ctx.restore();
}

// ---- Mood and warning signs ----

/**
 * Mood ring on the floor around a rider (AC #18, #20):
 *   green  - comfortable
 *   yellow - too slow; the ring drains like a timer over the 1.5 s grace period
 *   red    - has complained (stays red for the rest of the ride)
 */
function drawMoodRing(ctx, x, y, person, time) {
  const radius = 17;
  const mood = person.mood;
  if (mood === 'furious') {
    fillCircle(ctx, x, y, radius, 'rgba(226, 69, 60, 0.18)');
    ctx.strokeStyle = PALETTE.danger;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  if (mood === 'impatient') {
    const remaining = clamp(1 - person.secondsTooSlow / TOO_SLOW_GRACE_SECONDS, 0, 1);
    fillCircle(ctx, x, y, radius, 'rgba(242, 181, 29, 0.16)');
    ctx.strokeStyle = 'rgba(242, 181, 29, 0.3)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = PALETTE.warning;
    ctx.lineWidth = 4 + Math.sin(time * 20) * 0.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + remaining * Math.PI * 2);
    ctx.stroke();
    return;
  }
  ctx.strokeStyle = 'rgba(54, 179, 104, 0.85)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
}

/** Small storm cloud over someone who has complained. Shape, not just color, says "angry". */
function drawAngryCloud(ctx, x, y, time) {
  const bob = Math.sin(time * 5) * 1.2;
  ctx.save();
  ctx.translate(x, y + bob);
  for (const [cx, cy, r] of [[-5, 1, 4.5], [0, -2, 5.5], [5, 1, 4.5], [0, 2, 4.5]]) fillCircle(ctx, cx, cy, r, '#4a4f5c');
  ctx.fillStyle = PALETTE.warning;
  ctx.beginPath();
  ctx.moveTo(0.5, 3);
  ctx.lineTo(-2.5, 9);
  ctx.lineTo(0.5, 8);
  ctx.lineTo(-1, 13);
  ctx.lineTo(3, 6.5);
  ctx.lineTo(0.3, 7.2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Purple "!" tag over a troublemaker, so they stand out in a crowded line. */
function drawTroubleTag(ctx, x, y, time) {
  const bob = Math.sin(time * 6) * 1.5;
  ctx.save();
  ctx.translate(x, y + bob);
  fillCircle(ctx, 1.5, 1.5, 7.5, PALETTE.shadow);
  fillCircle(ctx, 0, 0, 7.5, '#8a3fc2');
  ctx.fillStyle = '#ffffff';
  ctx.font = font(11, 'bold', FONT_DISPLAY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', 0, 0.5);
  ctx.restore();
}

/** Sweat drops when the door is within a few °/s of someone's top speed. */
function drawSweat(ctx, x, y, time) {
  for (const [dx, phase] of [[-11, 0], [11, 1.7]]) {
    const drip = ((time * 1.6 + phase) % 1) * 5;
    ctx.save();
    ctx.translate(x + dx, y - 10 + drip);
    ctx.fillStyle = '#7ec4f0';
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.quadraticCurveTo(3, 0, 0, 2.5);
    ctx.quadraticCurveTo(-3, 0, 0, -4);
    ctx.fill();
    ctx.restore();
  }
}

/** Letter badge (W/M/I/C); only shown with the debug overlay on. */
function drawLabelBadge(ctx, x, y, person) {
  fillCircle(ctx, x + 12, y + 12, 6, PALETTE.ink);
  ctx.fillStyle = '#ffffff';
  ctx.font = font(8, 'bold');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(person.type.label, x + 12, y + 12.5);
}

// ---- Putting people on screen ----

function drawQueuedPeople(ctx, game, fx, ui) {
  for (const queue of [game.streetQueue, game.lobbyQueue]) {
    // Back of the line first, so people closer to the door are drawn on top.
    for (let i = queue.people.length - 1; i >= 0; i--) {
      const person = queue.people[i];
      const visual = fx.visualOf(person);
      drawPersonFigure(ctx, visual.x, visual.y, visual.facing, person.typeKey, visual.look, {
        isWalking: visual.isWalking,
        walkPhase: visual.walkPhase,
        time: fx.time,
        isPhoneLit: true,
        scale: celebrationScale(fx, visual, person.id),
      });
      if (ui.showDebug) drawLabelBadge(ctx, visual.x, visual.y, person);
    }
  }
}

function drawRiders(ctx, game, fx, ui) {
  const speed = game.door.speed;
  for (const person of game.door.allRiders()) {
    const visual = fx.visualOf(person);
    if (visual.enterAge >= ENTER_GLIDE_SECONDS * 0.6) drawMoodRing(ctx, visual.x, visual.y, person, fx.time);
  }
  for (const person of game.door.allRiders()) {
    const visual = fx.visualOf(person);
    drawPersonFigure(ctx, visual.x, visual.y, visual.facing, person.typeKey, visual.look, {
      isWalking: visual.isWalking,
      walkPhase: visual.walkPhase,
      time: fx.time,
      wobble: riderWobble(person, speed),
      isTapping: person.mood === 'impatient',
      isPhoneLit: false,
      scale: celebrationScale(fx, visual, person.id),
    });
    if (ui.showDebug) drawLabelBadge(ctx, visual.x, visual.y, person);
  }
}

/** 0 when the door is comfortably slow for this person, rising toward 1+ at their top speed. */
function riderWobble(person, speed) {
  const warningStart = person.type.comfortMaxSpeed - 22;
  return clamp((speed - warningStart) / 22, 0, 1.3);
}

function drawWalkers(ctx, fx, ui) {
  for (const walker of fx.walkers) {
    const visual = walker.visual;
    drawPersonFigure(ctx, visual.x, visual.y, visual.facing, walker.person.typeKey, visual.look, {
      isWalking: true,
      walkPhase: visual.walkPhase,
      time: fx.time,
      scale: celebrationScale(fx, visual, walker.person.id),
    });
    if (ui.showDebug) drawLabelBadge(ctx, visual.x, visual.y, walker.person);
  }
}

/** Icons that float above people: angry clouds, sweat, troublemaker tags. Drawn after everything else in the world. */
function drawPeopleOverlays(ctx, game, fx) {
  game.streetQueue.people.forEach((person, placeInLine) => {
    if (!person.type.isTroublemaker) return;
    const visual = fx.visualOf(person);
    const isBeingHeld = placeInLine === 0 && person.patienceLeft < TROUBLEMAKER_PATIENCE_SECONDS;
    if (isBeingHeld) {
      // Patience ring: drains while ↓ holds them at the front. Empty = they give up.
      const left = clamp(person.patienceLeft / TROUBLEMAKER_PATIENCE_SECONDS, 0, 1);
      ctx.strokeStyle = 'rgba(138, 63, 194, 0.25)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(visual.x, visual.y, 17, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#8a3fc2';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(visual.x, visual.y, 17, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2);
      ctx.stroke();
    }
    drawTroubleTag(ctx, visual.x, visual.y - 22, fx.time + person.id);
  });
  const speed = game.door.speed;
  for (const person of game.door.allRiders()) {
    const visual = fx.visualOf(person);
    if (person.hasComplained) drawAngryCloud(ctx, visual.x, visual.y - 24, fx.time + person.id);
    else if (speed > person.type.comfortMaxSpeed - 8) drawSweat(ctx, visual.x, visual.y, fx.time);
  }
  for (const walker of fx.walkers) {
    if (walker.person.hasComplained) drawAngryCloud(ctx, walker.visual.x, walker.visual.y - 24, fx.time + walker.person.id);
  }
}

/** Pedestrians passing on the far side of the sidewalk. Pure scenery. */
function drawAmbientPeople(ctx, fx) {
  for (const walker of fx.ambientPeople) {
    const facing = walker.direction > 0 ? 0 : Math.PI;
    drawPersonFigure(ctx, walker.x, walker.y, facing, 'officeWorker', walker.look, {
      isWalking: true,
      walkPhase: walker.walkPhase,
      time: fx.time,
    });
    if (walker.hasDog) {
      const dogX = walker.x + walker.direction * 24;
      ctx.strokeStyle = 'rgba(31, 36, 48, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(walker.x + walker.direction * 8, walker.y + 5);
      ctx.quadraticCurveTo(walker.x + walker.direction * 16, walker.y + 10, dogX - walker.direction * 8, walker.y + 4);
      ctx.stroke();
      drawDog(ctx, dogX, walker.y + 4, facing, walker.walkPhase);
    }
    const isRaining = fx.weather.rain > 0.35;
    if (walker.hasUmbrella || (isRaining && walker.opensUmbrellaInRain)) drawUmbrella(ctx, walker.x + 2, walker.y - 2, walker.umbrellaColor);
  }
}

function drawUmbrella(ctx, x, y, color) {
  fillCircle(ctx, x + SHADOW_OFFSET.x, y + SHADOW_OFFSET.y, 16, PALETTE.shadowSoft);
  const panels = 8;
  for (let i = 0; i < panels; i++) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, 16, (i / panels) * Math.PI * 2, ((i + 1) / panels) * Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? color : shadeColor(color, -18);
    ctx.fill();
  }
  fillCircle(ctx, x, y, 1.8, '#1f2430');
}

/** Lightens (positive) or darkens (negative) a #rrggbb color by an amount 0–255. */
function shadeColor(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const r = clamp((value >> 16) + amount, 0, 255);
  const g = clamp(((value >> 8) & 0xff) + amount, 0, 255);
  const b = clamp((value & 0xff) + amount, 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}
