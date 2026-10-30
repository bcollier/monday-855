// render/doorway.js
// The revolving door, the hero of the screen. Drawn in three layers so the
// riders can sit between them:
//   drawDoorFloor   - floor disc and mat (under everyone)
//   drawDoorWings   - the four glass wings, with motion trails at speed
//   drawDoorHousing - brass rim and the curved glass walls on the left and right
// The four wings, the two walls and the two openings must stay obvious under
// the art (AC #2), so the wings are dark-edged and the walls are bright.

function drawDoorFloor(ctx) {
  const x = DOOR_CENTER_X;
  const y = DOOR_CENTER_Y;
  // Stone floor disc with a soft inner ring
  fillCircle(ctx, x, y, DOOR_RADIUS + 3, '#d9d2c4');
  fillCircle(ctx, x, y, DOOR_RADIUS, '#f4efe4');
  fillCircle(ctx, x, y, DOOR_RADIUS * 0.84, '#ece4d5');
  fillCircle(ctx, x, y, DOOR_RADIUS * 0.8, '#f4efe4');

  // Brass thresholds at the two openings: where people step in and out.
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 3;
  for (const openingAngle of [LOBBY_OPENING_ANGLE, STREET_OPENING_ANGLE]) {
    const halfWidth = ((90 - HOUSING_HALF_WIDTH) * Math.PI) / 180;
    const center = canvasRotationForGameAngle(openingAngle);
    ctx.beginPath();
    ctx.arc(x, y, DOOR_RADIUS + 1, center - halfWidth, center + halfWidth);
    ctx.stroke();
  }
}

/** Faint wedge highlighting the compartment lined up with each opening: "people step in here". */
function drawAlignedCompartmentGlow(ctx, door, time) {
  for (const openingAngle of [LOBBY_OPENING_ANGLE, STREET_OPENING_ANGLE]) {
    const compartment = door.findAlignedCompartment(openingAngle);
    if (compartment === -1) continue;
    const center = door.compartmentCenterAngle(compartment);
    const start = canvasRotationForGameAngle(center + 45);
    const end = canvasRotationForGameAngle(center - 45);
    ctx.save();
    ctx.globalAlpha = 0.16 + 0.05 * Math.sin(time * 6);
    ctx.fillStyle = '#ffe7a6';
    ctx.beginPath();
    ctx.moveTo(DOOR_CENTER_X, DOOR_CENTER_Y);
    ctx.arc(DOOR_CENTER_X, DOOR_CENTER_Y, DOOR_RADIUS - 3, start, end);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawDoorWings(ctx, angle, speed, mood, time) {
  // Motion trails: ghost wings behind the real ones once the door is really moving.
  const trailStrength = clamp((speed - 100) / 100, 0, 1);
  if (trailStrength > 0) {
    for (let k = 1; k <= 4; k++) {
      ctx.save();
      ctx.globalAlpha = 0.11 * trailStrength * (1 - k / 5);
      for (let i = 0; i < WING_COUNT; i++) drawWing(ctx, angle + i * 90 - k * speed * 0.016, true);
      ctx.restore();
    }
  }

  // Flat shadows first (sun from the lower left), then the wings.
  for (let i = 0; i < WING_COUNT; i++) {
    const tip = pointAroundDoor(angle + i * 90, DOOR_RADIUS - 3);
    ctx.strokeStyle = PALETTE.shadow;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(DOOR_CENTER_X + SHADOW_OFFSET.x * 0.6, DOOR_CENTER_Y + SHADOW_OFFSET.y * 0.6);
    ctx.lineTo(tip.x + SHADOW_OFFSET.x * 0.6, tip.y + SHADOW_OFFSET.y * 0.6);
    ctx.stroke();
  }
  for (let i = 0; i < WING_COUNT; i++) drawWing(ctx, angle + i * 90, false);

  // Brass hub with a turning glint, and the door's face
  fillCircle(ctx, DOOR_CENTER_X + 2, DOOR_CENTER_Y - 2, 18, PALETTE.shadow);
  fillCircle(ctx, DOOR_CENTER_X, DOOR_CENTER_Y, 17, PALETTE.brassDark);
  fillCircle(ctx, DOOR_CENTER_X, DOOR_CENTER_Y, 15, PALETTE.brass);
  const glint = pointAroundDoor(angle + 135, 12.5);
  fillCircle(ctx, glint.x, glint.y, 2, PALETTE.brassLight);
  drawDoorFace(ctx, mood, time);
}

/**
 * How the door "feels", from what's happening inside it. Shown as the hub's face
 * and a glow around the rim, right where the player is already looking:
 *   alarmed - someone is within 8 °/s of their top speed (a smack is coming)
 *   worried - someone's too-slow timer is running
 *   dizzy   - over 150 °/s
 *   ouch    - a complaint just happened
 *   happy / content / asleep otherwise
 */
function doorMood(game, fx) {
  if (game.phase === 'title') return 'content';
  if (fx.lastComplaintAge < 0.9) return 'ouch';
  const speed = game.door.speed;
  const riders = game.door.allRiders();
  const calmRiders = riders.filter((rider) => !rider.hasComplained);
  if (calmRiders.some((rider) => speed > rider.type.comfortMaxSpeed - 8)) return 'alarmed';
  if (speed > 150) return 'dizzy';
  if (calmRiders.some((rider) => rider.mood === 'impatient')) return 'worried';
  if (speed < 1 && riders.length === 0) return 'asleep';
  if (calmRiders.length > 0) return 'happy';
  return 'content';
}

/** Colored halo around the door for the moods that need the player's attention. */
function drawDoorMoodGlow(ctx, mood, time) {
  const glow = { alarmed: [226, 69, 60, 0.55], ouch: [226, 69, 60, 0.4], worried: [242, 181, 29, 0.45], happy: [54, 179, 104, 0.22] }[mood];
  if (!glow) return;
  const pulse = mood === 'alarmed' ? 0.6 + 0.4 * Math.sin(time * 18) : mood === 'worried' ? 0.7 + 0.3 * Math.sin(time * 8) : 1;
  ctx.save();
  ctx.strokeStyle = `rgba(${glow[0]}, ${glow[1]}, ${glow[2]}, ${glow[3] * pulse})`;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(DOOR_CENTER_X, DOOR_CENTER_Y, DOOR_RADIUS + 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(DOOR_CENTER_X, DOOR_CENTER_Y, DOOR_RADIUS + 27, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** The hub's face. It stays upright while the door turns under it. */
function drawDoorFace(ctx, mood, time) {
  const ink = '#4a3412';
  ctx.save();
  ctx.translate(DOOR_CENTER_X, DOOR_CENTER_Y);
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  const eye = (x, draw) => { ctx.save(); ctx.translate(x, -2.5); draw(); ctx.restore(); };
  const stroke = (path) => { ctx.beginPath(); path(); ctx.stroke(); };

  switch (mood) {
    case 'asleep':
      for (const x of [-5, 5]) eye(x, () => stroke(() => ctx.arc(0, -1, 2.4, 0.2, Math.PI - 0.2)));
      stroke(() => ctx.arc(0, 5, 1.6, 0, Math.PI * 2));
      // Little z's drifting off
      ctx.font = font(9, 'bold', FONT_DISPLAY);
      for (let k = 0; k < 2; k++) {
        const t = (time * 0.5 + k / 2) % 1;
        ctx.globalAlpha = 1 - t;
        ctx.fillText('z', 10 + t * 10, -10 - t * 16);
      }
      break;
    case 'happy':
      for (const x of [-5, 5]) eye(x, () => stroke(() => ctx.arc(0, 1.5, 2.4, Math.PI + 0.3, -0.3)));
      stroke(() => ctx.arc(0, 2.5, 5, 0.25, Math.PI - 0.25));
      fillCircle(ctx, -9, 3, 2, 'rgba(226, 92, 138, 0.45)');
      fillCircle(ctx, 9, 3, 2, 'rgba(226, 92, 138, 0.45)');
      break;
    case 'worried':
      for (const x of [-5, 5]) eye(x, () => fillCircle(ctx, 0, 0, 1.8, ink));
      stroke(() => { ctx.moveTo(-8, -7); ctx.lineTo(-3, -6); ctx.moveTo(8, -7); ctx.lineTo(3, -6); });
      stroke(() => { ctx.moveTo(-4, 6); ctx.quadraticCurveTo(-2, 4, 0, 6); ctx.quadraticCurveTo(2, 8, 4, 6); });
      break;
    case 'alarmed': {
      const shake = Math.sin(time * 40) * 0.6;
      for (const x of [-5, 5]) eye(x + shake, () => { fillCircle(ctx, 0, 0, 3.6, '#ffffff'); fillCircle(ctx, 0, 0.5, 1.6, ink); });
      fillEllipse(ctx, shake, 6.5, 2.4, 3, 0, ink);
      break;
    }
    case 'dizzy':
      for (const x of [-5, 5]) {
        eye(x, () => {
          ctx.rotate(time * 10);
          stroke(() => { for (let a = 0; a < Math.PI * 4; a += 0.3) ctx.lineTo(Math.cos(a) * a * 0.28, Math.sin(a) * a * 0.28); });
        });
      }
      stroke(() => { ctx.moveTo(-5, 6); for (let x = -5; x <= 5; x += 1) ctx.lineTo(x, 6 + Math.sin(x * 1.5 + time * 12)); });
      break;
    case 'ouch':
      for (const x of [-5, 5]) eye(x, () => stroke(() => { ctx.moveTo(-2, -2); ctx.lineTo(2, 2); ctx.moveTo(2, -2); ctx.lineTo(-2, 2); }));
      stroke(() => { ctx.moveTo(-5, 6); ctx.lineTo(-2, 4.5); ctx.lineTo(1, 6.5); ctx.lineTo(4, 4.5); ctx.lineTo(6, 6); });
      break;
    default:
      for (const x of [-5, 5]) eye(x, () => fillCircle(ctx, 0, 0, 1.7, ink));
      stroke(() => ctx.arc(0, 2.5, 3.6, 0.35, Math.PI - 0.35));
  }
  ctx.restore();
}

/** One glass wing: brass-edged glass panel with a push bar. */
function drawWing(ctx, wingAngle, isGhost) {
  const start = pointAroundDoor(wingAngle, 15);
  const tip = pointAroundDoor(wingAngle, DOOR_RADIUS - 3);
  ctx.lineCap = 'round';
  ctx.strokeStyle = isGhost ? PALETTE.glassEdge : '#3d4250';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  if (isGhost) return;
  ctx.strokeStyle = PALETTE.glassSolid;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  // Brass push bar across the middle of the panel
  const barCenter = pointAroundDoor(wingAngle, DOOR_RADIUS * 0.62);
  const across = ((wingAngle + 90) * Math.PI) / 180;
  const dx = Math.cos(across) * 6;
  const dy = -Math.sin(across) * 6;
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(barCenter.x - dx, barCenter.y - dy);
  ctx.lineTo(barCenter.x + dx, barCenter.y + dy);
  ctx.stroke();
  // Brass cap at the tip
  fillCircle(ctx, tip.x, tip.y, 3.2, PALETTE.brass);
}

/** Brass rim and the curved glass walls. A bright reflection slides along each wall now and then. */
function drawDoorHousing(ctx, time) {
  const x = DOOR_CENTER_X;
  const y = DOOR_CENTER_Y;
  const wallHalfWidth = (HOUSING_HALF_WIDTH * Math.PI) / 180;
  for (const wallCenter of [0, Math.PI]) {
    const from = wallCenter - wallHalfWidth;
    const to = wallCenter + wallHalfWidth;
    // Shadow
    ctx.strokeStyle = PALETTE.shadow;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(x + SHADOW_OFFSET.x, y + SHADOW_OFFSET.y, DOOR_RADIUS + 7, from, to);
    ctx.stroke();
    // Brass frame
    ctx.strokeStyle = PALETTE.brassDark;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(x, y, DOOR_RADIUS + 7, from, to);
    ctx.stroke();
    // Glass
    ctx.strokeStyle = '#a9d3e8';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(x, y, DOOR_RADIUS + 7, from + 0.02, to - 0.02);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, DOOR_RADIUS + 5, from + 0.05, to - 0.05);
    ctx.stroke();
    // Moving reflection
    const sweep = ((time * 0.35 + (wallCenter ? 0.5 : 0)) % 1.6) / 1.2;
    if (sweep < 1) {
      const center = from + (to - from) * sweep;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(x, y, DOOR_RADIUS + 7, Math.max(from, center - 0.06), Math.min(to, center + 0.06));
      ctx.stroke();
    }
    // Brass end caps where the walls meet the openings
    for (const end of [from, to]) {
      fillCircle(ctx, x + Math.cos(end) * (DOOR_RADIUS + 7), y + Math.sin(end) * (DOOR_RADIUS + 7), 6.5, PALETTE.brass);
      fillCircle(ctx, x + Math.cos(end) * (DOOR_RADIUS + 7) - 1, y + Math.sin(end) * (DOOR_RADIUS + 7) - 1, 2.5, PALETTE.brassLight);
    }
  }
}
