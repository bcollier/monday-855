// render/screens.js
// Full-screen moments: the title screen (AC #30), pause (AC #31) and the three
// end screens (AC #24–26), each drawn over the live scene.

function drawTitleScreen(ctx, fx) {
  ctx.fillStyle = 'rgba(24, 22, 30, 0.42)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const width = 640;
  const height = 430;
  const x = (CANVAS_WIDTH - width) / 2;
  const y = 104;
  const rise = easeOutCubic(fx.time / 0.7);
  ctx.save();
  ctx.translate(0, (1 - rise) * 40);
  ctx.globalAlpha = rise;
  drawCard(ctx, x, y, width, height, { radius: 18 });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.brassDark;
  ctx.font = font(11, 'bold', FONT_DISPLAY);
  fillSpacedText(ctx, 'A REVOLVING DOOR GAME', CANVAS_WIDTH / 2, y + 34, 3);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = font(60, 'bold', FONT_DISPLAY);
  ctx.fillText('Monday, 8:55', CANVAS_WIDTH / 2, y + 82);
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.font = font(15, '500');
  ctx.fillText('Everyone in the city has to be at work by 9:00, and every one of them', CANVAS_WIDTH / 2, y + 126);
  ctx.fillText('goes through your revolving door. One door speed. Very different people.', CANVAS_WIDTH / 2, y + 146);

  // Left column: controls
  const columnTop = y + 186;
  const leftX = x + 40;
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.brassDark;
  ctx.font = font(10, 'bold', FONT_DISPLAY);
  fillSpacedText(ctx, 'CONTROLS', leftX, columnTop, 2);
  const controls = [
    ['SPACE', 72, 'hold to push the door'],
    ['↓', 30, 'hold: street line waits'],
    ['↑', 30, 'hold: lobby line waits'],
    ['P', 30, 'pause'],
  ];
  controls.forEach(([key, keyWidth, label], i) => {
    const rowY = columnTop + 20 + i * 36;
    drawKeyCap(ctx, leftX, rowY, keyWidth, key);
    ctx.fillStyle = PALETTE.ink;
    ctx.font = font(13, '600');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, leftX + 84, rowY + 13);
  });

  // Right column: the people and their speeds
  const rightX = x + 336;
  ctx.fillStyle = PALETTE.brassDark;
  ctx.font = font(10, 'bold', FONT_DISPLAY);
  ctx.textAlign = 'left';
  fillSpacedText(ctx, 'COMFORTABLE AT', rightX, columnTop, 2);
  METER_LANE_TYPES.forEach((typeKey, i) => {
    const type = PERSON_TYPES[typeKey];
    const rowY = columnTop + 33 + i * 36;
    drawPersonFigure(ctx, rightX + 14, rowY, 0, typeKey, PORTRAIT_LOOK, { time: fx.time, scale: 0.8 });
    ctx.fillStyle = PALETTE.ink;
    ctx.font = font(13, 'bold');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(type.displayName, rightX + 58, rowY - 6);
    ctx.fillStyle = PALETTE.inkSoft;
    ctx.font = font(12, '500');
    const note = { officeWorker: 'easy-going', manager: 'hates slow doors', intern: 'six coffees, careful', courier: 'needs a whole compartment' }[typeKey];
    ctx.fillText(`${type.comfortMinSpeed}–${type.comfortMaxSpeed} °/s · ${note}`, rightX + 58, rowY + 9);
  });

  // Rules strip
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.font = font(12, '500');
  ctx.textAlign = 'center';
  ctx.fillText('Too fast and the wing hits them. Too slow for 1.5 s and they snap.', CANVAS_WIDTH / 2, y + height - 64);
  ctx.fillText('3 complaints and you\'re fired. More than 8 in a line is gridlock.', CANVAS_WIDTH / 2, y + height - 46);

  // Start prompt
  const blink = 0.6 + 0.4 * Math.abs(Math.sin(fx.time * 2.6));
  ctx.globalAlpha = rise * blink;
  const pillWidth = 236;
  fillRoundRect(ctx, CANVAS_WIDTH / 2 - pillWidth / 2, y + height - 30, pillWidth, 34, 17, PALETTE.ink);
  ctx.fillStyle = PALETTE.paper;
  ctx.font = font(13, 'bold', FONT_DISPLAY);
  fillSpacedText(ctx, 'PRESS SPACE TO START', CANVAS_WIDTH / 2, y + height - 12, 2);
  ctx.restore();
}

function drawPauseScreen(ctx) {
  ctx.fillStyle = 'rgba(24, 22, 30, 0.55)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const width = 320;
  const height = 150;
  const x = (CANVAS_WIDTH - width) / 2;
  const y = (CANVAS_HEIGHT - height) / 2;
  drawCard(ctx, x, y, width, height, { radius: 16 });
  // Pause glyph
  fillRoundRect(ctx, CANVAS_WIDTH / 2 - 14, y + 22, 9, 30, 3, PALETTE.ink);
  fillRoundRect(ctx, CANVAS_WIDTH / 2 + 5, y + 22, 9, 30, 3, PALETTE.ink);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = font(26, 'bold', FONT_DISPLAY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fillSpacedText(ctx, 'PAUSED', CANVAS_WIDTH / 2, y + 84, 4);
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.font = font(13, '600');
  ctx.fillText('The clock has stopped. So has the door.', CANVAS_WIDTH / 2, y + 110);
  ctx.fillText('Press P to carry on.', CANVAS_WIDTH / 2, y + 128);
}

const END_SCREENS = {
  fired: {
    title: "YOU'RE FIRED",
    quip: 'HR would like a word. Bring the pink slip.',
    color: PALETTE.danger,
    tint: 'rgba(80, 16, 20, 0.5)',
  },
  gridlock: {
    title: 'LOBBY GRIDLOCK',
    quip: 'The fire marshal has questions.',
    color: '#d98a12',
    tint: 'rgba(70, 44, 10, 0.5)',
  },
  madeIt: {
    title: 'MADE IT',
    quip: 'Everyone is in by 9:00. Nobody will ever thank you.',
    color: PALETTE.safe,
    tint: 'rgba(14, 50, 30, 0.42)',
  },
};

function drawEndScreen(ctx, game, fx) {
  const screen = END_SCREENS[game.endReason];
  const age = fx.endScreenAge;
  ctx.save();
  ctx.globalAlpha = clamp(age / 0.4, 0, 1);
  ctx.fillStyle = screen.tint;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.restore();

  const width = 540;
  const height = 384;
  const x = (CANVAS_WIDTH - width) / 2;
  const finalY = 118;
  const y = lerp(-height - 20, finalY, easeOutBack(age / 0.55));

  ctx.save();
  drawCard(ctx, x, y, width, height, { radius: 18 });
  ctx.save();
  roundRectPath(ctx, x, y, width, height, 18);
  ctx.clip();
  ctx.fillStyle = screen.color;
  ctx.fillRect(x, y, width, 10);
  ctx.restore();

  drawEndBadge(ctx, game.endReason, CANVAS_WIDTH / 2, y, screen.color, age);

  // Title, stamped
  const stamp = easeOutCubic((age - 0.35) / 0.25);
  ctx.save();
  ctx.translate(CANVAS_WIDTH / 2, y + 72);
  ctx.rotate(-0.03);
  ctx.scale(lerp(1.8, 1, stamp), lerp(1.8, 1, stamp));
  ctx.globalAlpha = clamp(stamp * 1.4, 0, 1);
  ctx.fillStyle = screen.color;
  ctx.font = font(48, 'bold', FONT_DISPLAY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(screen.title, 0, 0);
  ctx.restore();

  ctx.fillStyle = PALETTE.inkSoft;
  ctx.font = font(15, '500');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(screen.quip, CANVAS_WIDTH / 2, y + 114);

  // The two numbers the spec asks for: delivered and complaints
  const statY = y + 146;
  for (const [i, label, value] of [[0, 'PEOPLE DELIVERED', String(game.deliveredCount)], [1, 'COMPLAINTS', `${game.complaintCount} / ${MAX_COMPLAINTS}`]]) {
    const boxX = x + 36 + i * 240;
    fillRoundRect(ctx, boxX, statY, 228, 76, 12, PALETTE.paperShade);
    ctx.fillStyle = PALETTE.inkSoft;
    ctx.font = font(10, 'bold', FONT_DISPLAY);
    fillSpacedText(ctx, label, boxX + 114, statY + 20, 2);
    ctx.fillStyle = PALETTE.ink;
    ctx.font = font(34, 'bold', FONT_DISPLAY);
    ctx.fillText(value, boxX + 114, statY + 50);
  }

  // Report card
  const rows = reportCardRows(game);
  rows.forEach((row, i) => {
    const rowY = y + 252 + i * 24;
    ctx.fillStyle = PALETTE.inkSoft;
    ctx.font = font(13, '500');
    ctx.textAlign = 'left';
    ctx.fillText(row[0], x + 48, rowY);
    ctx.fillStyle = PALETTE.ink;
    ctx.font = font(13, 'bold');
    ctx.textAlign = 'right';
    ctx.fillText(row[1], x + width - 48, rowY);
    ctx.fillStyle = 'rgba(31, 36, 48, 0.1)';
    ctx.fillRect(x + 48, rowY + 12, width - 96, 1);
  });

  // Try again
  const blink = 0.65 + 0.35 * Math.abs(Math.sin(age * 2.6));
  ctx.globalAlpha = blink;
  drawKeyCap(ctx, CANVAS_WIDTH / 2 - 92, y + height - 48, 30, 'R');
  ctx.fillStyle = PALETTE.ink;
  ctx.font = font(14, 'bold', FONT_DISPLAY);
  ctx.textAlign = 'left';
  fillSpacedText(ctx, 'TO TRY AGAIN', CANVAS_WIDTH / 2 - 50, y + height - 34, 2);
  ctx.restore();
}

/** Three funny-but-true lines about the round, from game.stats. */
function reportCardRows(game) {
  const stats = game.stats;
  const internsDelivered = stats.deliveredByType.intern || 0;
  const internComplaints = stats.complaintsByType.intern || 0;
  const coffees = Math.max(0, internsDelivered - internComplaints) * 6;
  const worst = Object.entries(stats.complaintsByType).sort((a, b) => b[1] - a[1])[0];
  const names = { officeWorker: 'office worker', manager: 'manager', intern: 'intern', courier: 'courier' };
  return [
    ['Coffees delivered without spilling', String(coffees)],
    ['Longest stretch without a complaint', `${Math.round(stats.longestCalmSeconds)} s`],
    ['Who you upset most', worst ? `${worst[1]} ${names[worst[0]]}${worst[1] === 1 ? '' : 's'}` : 'nobody (suspicious)'],
  ];
}

/** Round badge sitting on the top edge of the end card: pink slip, crowd, or a clock at 9:00. */
function drawEndBadge(ctx, reason, x, y, color, age) {
  const pop = easeOutBack((age - 0.5) / 0.3);
  if (pop <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pop, pop);
  fillCircle(ctx, 3, 3, 30, 'rgba(20, 16, 10, 0.22)');
  fillCircle(ctx, 0, 0, 30, color);
  fillCircle(ctx, 0, 0, 25, 'rgba(255, 255, 255, 0.15)');
  if (reason === 'fired') {
    ctx.rotate(-0.15);
    fillRoundRect(ctx, -11, -14, 22, 28, 2, PALETTE.pinkSlip);
    ctx.fillStyle = 'rgba(31, 36, 48, 0.3)';
    for (let line = 0; line < 4; line++) ctx.fillRect(-7, -9 + line * 5, line === 3 ? 8 : 14, 1.3);
    ctx.strokeStyle = PALETTE.danger;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -6); ctx.lineTo(6, 6);
    ctx.moveTo(6, -6); ctx.lineTo(-6, 6);
    ctx.stroke();
  } else if (reason === 'gridlock') {
    for (const [hx, hy] of [[-12, 4], [0, 6], [12, 4], [-6, -7], [6, -7]]) {
      fillEllipse(ctx, hx, hy + 3, 6.5, 4.5, 0, '#ffffff');
      fillCircle(ctx, hx, hy, 4, '#3b2a22');
    }
  } else {
    fillCircle(ctx, 0, 0, 17, '#ffffff');
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, -12);     // minute hand at 12
    ctx.moveTo(0, 0); ctx.lineTo(-7.5, 0);    // hour hand at 9
    ctx.stroke();
    fillCircle(ctx, 0, 0, 2, PALETTE.ink);
  }
  ctx.restore();
}
