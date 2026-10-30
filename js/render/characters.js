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
  // Hands: one holding a phone out in front
  fillCircle(ctx, 2, -11, 2.6, look.skin);
  fillCircle(ctx, 9, 6, 2.6, look.skin);
  fillRoundRect(ctx, 9.5, 3.5, 6, 4.5, 1, '#1f2430');
  fillRoundRect(ctx, 10.3, 4.2, 4.4, 3.1, 0.8, pose.isPhoneLit ? '#bfe3ff' : '#4f6b8a');
  drawHead(ctx, look, look.shirtIndex % 2 ? 'bun' : 'short');
}

function drawManager(ctx, look, pose) {
  // Briefcase at their side
  fillRoundRect(ctx, -6, 11.5, 14, 6, 1.5, '#5a3a22');
  fillRoundRect(ctx, -1, 10.5, 4, 2, 1, PALETTE.brass);
  fillEllipse(ctx, 0, 0, 8, 12.5, 0, MANAGER_SUIT);
  // Shirt V, lapels and red tie
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath();
  ctx.moveTo(4, -3.5);
  ctx.lineTo(8.3, 0);
  ctx.lineTo(4, 3.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d43d3d';
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
  drawHead(ctx, { ...look, hair: look.hair === '#c79a5b' ? '#2b2420' : look.hair }, 'slick');
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

  // The tray of six coffees. The cups wobble harder as the door nears 60 °/s.
  const wobble = pose.wobble ?? 0;
  const time = pose.time ?? 0;
  fillRoundRect(ctx, 9, -10.5, 15, 21, 3, '#d6bf93');
  roundRectPath(ctx, 9, -10.5, 15, 21, 3);
  ctx.strokeStyle = '#b39a6a';
  ctx.lineWidth = 1;
  ctx.stroke();
  let cup = 0;
  for (const cupX of [13, 20]) {
    for (const cupY of [-6.2, 0, 6.2]) {
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
    });
    if (ui.showDebug) drawLabelBadge(ctx, visual.x, visual.y, walker.person);
  }
}

/** Icons that float above people: angry clouds and sweat. Drawn after everything else in the world. */
function drawPeopleOverlays(ctx, game, fx) {
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
    if (walker.hasUmbrella) drawUmbrella(ctx, walker.x + 2, walker.y - 2, walker.umbrellaColor);
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
