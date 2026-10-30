// render/meter.js
// The speed meter (AC #28): the most important thing on screen after the door.
//
// One main bar with a needle for the current speed (0–200 °/s), and one lane per
// passenger type showing that type's comfort range. A lane lights up when someone
// of that type is riding, shows a dashed outline when they're next in line, and
// stays faint otherwise, so the player learns everyone's range by playing.
// The overlap of everyone riding glows as the SAFE ZONE; when there is no overlap
// (a manager and an intern together) the bar turns red: NO SAFE SPEED.

const METER = {
  x: 16,
  y: 484,
  width: 436,
  height: 142,
  trackLeft: 112,
  trackRight: 432,
  barY: 518,
  barHeight: 20,
  laneTop: 548,
  laneHeight: 17,
};
const METER_LANE_TYPES = ['officeWorker', 'manager', 'intern', 'courier'];
const METER_LANE_NAMES = { officeWorker: 'Worker', manager: 'Manager', intern: 'Intern', courier: 'Courier' };

function meterX(speed) {
  return METER.trackLeft + (clamp(speed, 0, DOOR_MAX_SPEED) / DOOR_MAX_SPEED) * (METER.trackRight - METER.trackLeft);
}

function drawSpeedMeter(ctx, game, fx) {
  const riders = game.door.allRiders();
  const speed = game.door.speed;
  const shared = sharedComfortRange(riders);
  const nextUp = [game.streetQueue.people[0], game.lobbyQueue.people[0]].filter(Boolean);

  drawCard(ctx, METER.x, METER.y, METER.width, METER.height, { fill: 'rgba(251, 246, 236, 0.96)' });

  // Header
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.font = font(10, 'bold', FONT_DISPLAY);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  fillSpacedText(ctx, 'DOOR SPEED', METER.x + 14, METER.y + 16, 1.8);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.ink;
  ctx.font = font(15, 'bold', FONT_DISPLAY);
  ctx.fillText(`${Math.round(speed)}`, METER.trackRight - 26, METER.y + 17);
  ctx.font = font(10, 'bold', FONT_DISPLAY);
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.fillText('°/s', METER.trackRight, METER.y + 17);

  // Main bar
  const barLeft = METER.trackLeft;
  const barWidth = METER.trackRight - METER.trackLeft;
  fillRoundRect(ctx, barLeft, METER.barY, barWidth, METER.barHeight, 6, '#e6dccb');
  const isConflict = shared && shared.isEmpty;
  if (shared && !shared.isEmpty) {
    // SAFE ZONE
    const left = meterX(shared.min);
    const right = meterX(shared.max);
    const pulse = 0.75 + 0.25 * Math.sin(fx.time * 4);
    ctx.save();
    ctx.globalAlpha = pulse;
    fillRoundRect(ctx, left, METER.barY + 2, right - left, METER.barHeight - 4, 4, PALETTE.safe);
    ctx.restore();
    if (right - left > 64) {
      ctx.fillStyle = '#ffffff';
      ctx.font = font(9, 'bold', FONT_DISPLAY);
      ctx.textAlign = 'center';
      fillSpacedText(ctx, 'SAFE ZONE', (left + right) / 2, METER.barY + METER.barHeight / 2 + 1, 1.2);
    }
  } else if (isConflict) {
    // NO SAFE SPEED: red hatching across the whole bar
    ctx.save();
    roundRectPath(ctx, barLeft, METER.barY, barWidth, METER.barHeight, 6);
    ctx.clip();
    ctx.fillStyle = 'rgba(226, 69, 60, 0.25)';
    ctx.fillRect(barLeft, METER.barY, barWidth, METER.barHeight);
    ctx.strokeStyle = 'rgba(226, 69, 60, 0.55)';
    ctx.lineWidth = 4;
    const scroll = (fx.time * 30) % 14;
    for (let x = barLeft - 30 + scroll; x < barLeft + barWidth + 30; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, METER.barY + METER.barHeight);
      ctx.lineTo(x + 14, METER.barY);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Ticks
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.font = font(9, '600');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let tick = 0; tick <= DOOR_MAX_SPEED; tick += 25) {
    const x = meterX(tick);
    ctx.fillStyle = 'rgba(31, 36, 48, 0.25)';
    ctx.fillRect(x - 0.5, METER.barY + METER.barHeight - 5, 1, 5);
  }

  // Lanes: one per passenger type
  METER_LANE_TYPES.forEach((typeKey, laneIndex) => {
    const type = PERSON_TYPES[typeKey];
    const y = METER.laneTop + laneIndex * METER.laneHeight;
    const ridersOfType = riders.filter((rider) => rider.typeKey === typeKey);
    const isNext = nextUp.some((person) => person.typeKey === typeKey);
    const left = meterX(type.comfortMinSpeed);
    const right = meterX(type.comfortMaxSpeed);
    const bandY = y + 3;
    const bandHeight = METER.laneHeight - 6;

    // Little portrait and name
    drawPersonFigure(ctx, METER.x + 18, y + METER.laneHeight / 2, 0, typeKey, PORTRAIT_LOOK, { time: fx.time, scale: 0.55 });
    ctx.fillStyle = ridersOfType.length ? PALETTE.ink : 'rgba(31, 36, 48, 0.45)';
    ctx.font = font(10, ridersOfType.length ? 'bold' : '600');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(METER_LANE_NAMES[typeKey], METER.x + 44, y + METER.laneHeight / 2 + 0.5);

    // Lane guide
    ctx.fillStyle = 'rgba(31, 36, 48, 0.05)';
    ctx.fillRect(METER.trackLeft, y + 1, barWidth, METER.laneHeight - 2);

    if (ridersOfType.length) {
      fillRoundRect(ctx, left, bandY, right - left, bandHeight, 4, type.color);
      // One dot per rider of this type, in their mood color
      ridersOfType.forEach((rider, i) => {
        const dotX = right - 7 - i * 10;
        fillCircle(ctx, dotX, bandY + bandHeight / 2, 4, '#ffffff');
        fillCircle(ctx, dotX, bandY + bandHeight / 2, 3, MOOD_COLORS[rider.mood]);
      });
    } else if (isNext) {
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = type.color;
      ctx.lineWidth = 1.6;
      roundRectPath(ctx, left + 0.8, bandY + 0.8, right - left - 1.6, bandHeight - 1.6, 4);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = type.color;
      ctx.font = font(8, 'bold', FONT_DISPLAY);
      ctx.textAlign = 'left';
      fillSpacedText(ctx, 'NEXT', right + 4 > METER.trackRight - 24 ? left - 28 : right + 4, bandY + bandHeight / 2 + 0.5, 1);
    } else {
      ctx.save();
      ctx.globalAlpha = 0.16;
      fillRoundRect(ctx, left, bandY, right - left, bandHeight, 4, type.color);
      ctx.restore();
    }
  });

  // Needle across the bar and every lane
  const needleX = meterX(speed);
  const needleBottom = METER.laneTop + METER_LANE_TYPES.length * METER.laneHeight;
  ctx.strokeStyle = 'rgba(31, 36, 48, 0.35)';
  ctx.setLineDash([2, 3]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(needleX, METER.barY + METER.barHeight);
  ctx.lineTo(needleX, needleBottom);
  ctx.stroke();
  ctx.setLineDash([]);
  fillRoundRect(ctx, needleX - 2.5 + 1.5, METER.barY - 5 - 1.5, 5, METER.barHeight + 10, 2.5, PALETTE.shadow);
  fillRoundRect(ctx, needleX - 2.5, METER.barY - 5, 5, METER.barHeight + 10, 2.5, PALETTE.ink);
  ctx.fillStyle = PALETTE.ink;
  ctx.beginPath();
  ctx.moveTo(needleX - 6, METER.barY - 10);
  ctx.lineTo(needleX + 6, METER.barY - 10);
  ctx.lineTo(needleX, METER.barY - 3);
  ctx.closePath();
  ctx.fill();

  if (isConflict) drawNoSafeSpeedStamp(ctx, fx.time);
}

function drawNoSafeSpeedStamp(ctx, time) {
  const pulse = 1 + 0.04 * Math.sin(time * 9);
  ctx.save();
  ctx.translate(METER.x + 198, METER.y + 17);
  ctx.rotate(-0.04);
  ctx.scale(pulse, pulse);
  fillRoundRect(ctx, -66, -11, 132, 22, 4, PALETTE.danger);
  roundRectPath(ctx, -63, -8, 126, 16, 3);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = font(11, 'bold', FONT_DISPLAY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fillSpacedText(ctx, 'NO SAFE SPEED', 0, 1, 1.5);
  ctx.restore();
}
