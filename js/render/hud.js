// render/hud.js
// Heads-up display: delivered counter (top left), flip clock (top center),
// strike slips (top right), tips, the controls legend and the debug overlay.

function drawHud(ctx, game, fx, ui) {
  drawDeliveredCounter(ctx, game, fx);
  drawFlipClock(ctx, game, fx);
  drawStrikes(ctx, game, fx);
  drawControlsLegend(ctx);
  if (fx.hint) drawHint(ctx, fx.hint);
}

// ---- Delivered (top left) ----

function drawDeliveredCounter(ctx, game, fx) {
  const x = 16;
  const y = 12;
  drawCard(ctx, x, y, 150, 52);
  // Little door icon
  fillCircle(ctx, x + 26, y + 26, 15, PALETTE.brass);
  fillCircle(ctx, x + 26, y + 26, 12, '#f4efe4');
  ctx.strokeStyle = '#3d4250';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  const turn = fx.time * 0.8;
  for (let i = 0; i < 4; i++) {
    const a = turn + (i * Math.PI) / 2;
    ctx.moveTo(x + 26, y + 26);
    ctx.lineTo(x + 26 + Math.cos(a) * 11, y + 26 + Math.sin(a) * 11);
  }
  ctx.stroke();

  ctx.fillStyle = PALETTE.inkSoft;
  ctx.font = font(9, 'bold', FONT_DISPLAY);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  fillSpacedText(ctx, 'DELIVERED', x + 50, y + 15, 1.6);
  const bounce = 1 + 0.35 * easeOutCubic(fx.deliveredBounce) * Math.sin(fx.deliveredBounce * Math.PI);
  ctx.save();
  ctx.translate(x + 50, y + 35);
  ctx.scale(bounce, bounce);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = font(24, 'bold', FONT_DISPLAY);
  ctx.textAlign = 'left';
  ctx.fillText(String(game.deliveredCount), 0, 0);
  ctx.restore();
}

// ---- Flip clock (top center) ----

function drawFlipClock(ctx, game, fx) {
  const time = game.clockTime();
  const text = game.clockText();
  const isFinalMinute = time.hours === 8 && time.minutes === 59;
  const centerX = CANVAS_WIDTH / 2;
  const cardTop = 8;
  const digitWidth = 30;
  const digitHeight = 42;
  const characters = [...text];
  const widths = characters.map((c) => (c === ':' ? 12 : digitWidth));
  const totalWidth = widths.reduce((a, b) => a + b + 4, -4) + 44;   // + room for the small seconds
  const panelWidth = totalWidth + 24;

  ctx.save();
  if (isFinalMinute && game.phase === 'playing') {
    // Heartbeat: two quick beats a second
    const beat = Math.max(0, Math.sin(fx.time * Math.PI * 2.4)) ** 6;
    ctx.translate(centerX, cardTop + 28);
    ctx.scale(1 + beat * 0.05, 1 + beat * 0.05);
    ctx.translate(-centerX, -(cardTop + 28));
  }
  drawCard(ctx, centerX - panelWidth / 2, cardTop, panelWidth, 58, {
    fill: isFinalMinute ? '#5a1f22' : PALETTE.ink,
    border: false,
    radius: 10,
  });

  const fromCharacters = [...fx.clockFlip.fromText.padStart(text.length)];
  let cursor = centerX - panelWidth / 2 + 12;
  characters.forEach((character, i) => {
    const width = widths[i];
    if (character === ':') {
      const blink = Math.floor(fx.time * 2) % 2 === 0 || game.phase !== 'playing' ? 1 : 0.35;
      ctx.fillStyle = `rgba(251, 246, 236, ${blink})`;
      fillCircle(ctx, cursor + width / 2, cardTop + 22, 2.6, ctx.fillStyle);
      fillCircle(ctx, cursor + width / 2, cardTop + 36, 2.6, ctx.fillStyle);
    } else {
      drawFlipDigit(ctx, cursor, cardTop + 8, width, digitHeight, character, fromCharacters[i], fx.clockFlip.age, isFinalMinute);
    }
    cursor += width + 4;
  });
  // Small seconds, ticking
  ctx.fillStyle = isFinalMinute ? '#ffb3ad' : 'rgba(251, 246, 236, 0.6)';
  ctx.font = font(14, 'bold', FONT_DISPLAY);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(':' + String(time.seconds).padStart(2, '0'), cursor + 2, cardTop + 47);
  ctx.font = font(8, 'bold', FONT_DISPLAY);
  ctx.fillStyle = isFinalMinute ? '#ffb3ad' : PALETTE.brassLight;
  fillSpacedText(ctx, 'MON', cursor + 4, cardTop + 20, 1.5);
  ctx.restore();

  // Round progress under the clock, with marks where arrivals speed up (8:57, 8:59)
  const barWidth = 150;
  const barX = centerX - barWidth / 2;
  const barY = cardTop + 64;
  const progress = game.secondsElapsed / ROUND_DURATION_SECONDS;
  fillRoundRect(ctx, barX, barY, barWidth, 5, 2.5, 'rgba(31, 36, 48, 0.18)');
  fillRoundRect(ctx, barX, barY, Math.max(5, barWidth * progress), 5, 2.5, isFinalMinute ? PALETTE.danger : PALETTE.brass);
  for (const step of STREET_SPAWN_RAMP.slice(1)) {
    const markX = barX + (step.fromSecond / ROUND_DURATION_SECONDS) * barWidth;
    fillRoundRect(ctx, markX - 1, barY - 2, 2, 9, 1, PALETTE.ink);
  }
}

/**
 * One flip-clock digit. When it changes, the old digit's top half folds down
 * over the new one: first half of the animation the old top shrinks, then the
 * new bottom grows.
 */
function drawFlipDigit(ctx, x, y, width, height, digit, oldDigit, age, isFinalMinute) {
  const flipSeconds = 0.32;
  const isFlipping = oldDigit !== digit && age < flipSeconds;
  const face = isFinalMinute ? '#7a2a2e' : '#2d3342';
  const ink = '#fbf6ec';
  const half = height / 2;

  const drawHalf = (character, isTop, scaleY) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, isTop ? y : y + half, width, half);
    ctx.clip();
    ctx.translate(0, y + half);
    ctx.scale(1, scaleY);
    ctx.translate(0, -(y + half));
    fillRoundRect(ctx, x, y, width, height, 5, face);
    ctx.fillStyle = ink;
    ctx.font = font(32, 'bold', FONT_DISPLAY);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(character, x + width / 2, y + half + 2);
    ctx.restore();
  };

  if (!isFlipping) {
    drawHalf(digit, true, 1);
    drawHalf(digit, false, 1);
  } else {
    const t = age / flipSeconds;
    drawHalf(digit, true, 1);               // new top is already behind
    drawHalf(oldDigit, false, 1);           // old bottom until covered
    if (t < 0.5) drawHalf(oldDigit, true, 1 - t * 2);
    else drawHalf(digit, false, (t - 0.5) * 2);
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(x, y + half - 0.5, width, 1);
}

// ---- Strikes (top right) ----

function drawStrikes(ctx, game, fx) {
  const cardWidth = 190;
  const x = CANVAS_WIDTH - 16 - cardWidth;
  const y = 12;
  drawCard(ctx, x, y, cardWidth, 52);
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.font = font(9, 'bold', FONT_DISPLAY);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  fillSpacedText(ctx, 'COMPLAINTS', x + 12, y + 26, 1.4);

  for (let i = 0; i < MAX_COMPLAINTS; i++) {
    const slipX = x + 104 + i * 26;
    const slipY = y + 9;
    const isFilled = i < game.complaintCount;
    ctx.save();
    ctx.translate(slipX + 10, slipY + 17);
    ctx.rotate((i - 1) * 0.06);
    if (isFilled) {
      fillRoundRect(ctx, -10 + 2, -16 - 2, 20, 32, 2, PALETTE.shadow);
      fillRoundRect(ctx, -10, -16, 20, 32, 2, PALETTE.pinkSlip);
      ctx.fillStyle = 'rgba(31, 36, 48, 0.25)';
      for (let line = 0; line < 4; line++) ctx.fillRect(-6, -10 + line * 5, line === 3 ? 7 : 12, 1.2);
      // Red X stamp, slammed down when the complaint happens
      const age = fx.strikeStampAge[i];
      const stamp = age === Infinity ? 1 : easeOutCubic(age / 0.25);
      const stampScale = lerp(2.4, 1, stamp);
      ctx.globalAlpha = clamp(stamp * 1.5, 0, 1);
      ctx.scale(stampScale, stampScale);
      ctx.strokeStyle = PALETTE.danger;
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-6, -6); ctx.lineTo(6, 6);
      ctx.moveTo(6, -6); ctx.lineTo(-6, 6);
      ctx.stroke();
    } else {
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(31, 36, 48, 0.3)';
      ctx.lineWidth = 1.2;
      roundRectPath(ctx, -10, -16, 20, 32, 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ---- Tips and legend ----

function drawControlsLegend(ctx) {
  const text = 'SPACE push   ↓ / ↑ hold a line   P pause   D debug';
  ctx.save();
  ctx.font = font(10, '600');
  const width = ctx.measureText(text).width + 20;
  fillRoundRect(ctx, CANVAS_WIDTH - 10 - width, CANVAS_HEIGHT - 21, width, 17, 8.5, 'rgba(20, 22, 30, 0.6)');
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, CANVAS_WIDTH - 20, CANVAS_HEIGHT - 12);
  ctx.restore();
}

/**
 * A tip card that slides in above the speed meter. "[KEY]" in the text is drawn
 * as a key cap. Never pauses the game (the clock must stay true, AC #21).
 */
function drawHint(ctx, hint) {
  const maxWidth = 380;
  const lineHeight = 24;
  ctx.font = font(13, '600');
  const lines = layoutHintText(ctx, hint.text, maxWidth);
  const height = lines.length * lineHeight + 16;
  const width = maxWidth + 46;
  const slide = easeOutCubic(hint.age / 0.3);
  const fade = clamp((HINT_SECONDS - hint.age) / 0.4, 0, 1);
  const x = 16 - (1 - slide) * (width + 30);
  const y = METER.y - height - 10;

  ctx.save();
  ctx.globalAlpha = fade;
  drawCard(ctx, x, y, width, height, { fill: '#fffdf7' });
  fillRoundRect(ctx, x, y, 6, height, 3, PALETTE.brass);
  ctx.fillStyle = PALETTE.brassDark;
  ctx.font = font(9, 'bold', FONT_DISPLAY);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  fillSpacedText(ctx, 'TIP', x + 14, y + 8 + lineHeight / 2, 1.5);

  lines.forEach((line, lineIndex) => {
    let cursor = x + 42;
    const baseline = y + 8 + lineIndex * lineHeight + lineHeight / 2;
    for (const token of line) {
      if (token.isKey) {
        drawKeyCap(ctx, cursor, baseline - 10, token.width, token.text, { height: 19, fontSize: 10 });
      } else {
        ctx.fillStyle = PALETTE.ink;
        ctx.font = font(13, '600');
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(token.text, cursor, baseline + 0.5);
      }
      cursor += token.width + token.spaceAfter;
    }
  });
  ctx.restore();
}

/** Splits hint text into lines of tokens; [KEY] tokens become key caps. */
function layoutHintText(ctx, text, maxWidth) {
  const spaceWidth = ctx.measureText(' ').width;
  const tokens = text.split(' ').map((word) => {
    const keyMatch = word.match(/^\[(.+)\](.*)$/);
    if (keyMatch) {
      ctx.font = font(10, 'bold');
      const width = Math.max(22, ctx.measureText(keyMatch[1]).width + 14);
      ctx.font = font(13, '600');
      // Punctuation stuck to a key (e.g. "[SPACE]!") stays as its own small token.
      const tail = keyMatch[2] ? [{ text: keyMatch[2], width: ctx.measureText(keyMatch[2]).width, isKey: false }] : [];
      return [{ text: keyMatch[1], width, isKey: true }, ...tail];
    }
    return [{ text: word, width: ctx.measureText(word).width, isKey: false }];
  });
  const lines = [[]];
  let lineWidth = 0;
  for (const group of tokens) {
    const groupWidth = group.reduce((sum, token) => sum + token.width, 0);
    if (lineWidth + groupWidth > maxWidth && lines[lines.length - 1].length) {
      lines.push([]);
      lineWidth = 0;
    }
    group.forEach((token, i) => {
      token.spaceAfter = i === group.length - 1 ? spaceWidth : 1;
      lines[lines.length - 1].push(token);
    });
    lineWidth += groupWidth + spaceWidth;
  }
  return lines;
}

// ---- Debug overlay (AC #27) ----

function drawDebugOverlay(ctx, game, ui) {
  const x = CANVAS_WIDTH - 16 - 250;
  const y = 74;
  const rows = [
    ['door speed', `${game.door.speed.toFixed(2)} °/s`],
    ['real time', `${game.secondsElapsed.toFixed(2)} s`],
    ['game clock', `${game.clockText()}:${String(game.clockTime().seconds).padStart(2, '0')}`],
    ['street every', `${game.currentStreetSpawnInterval()} s`],
    ['queues', `street ${game.streetQueue.length} · lobby ${game.lobbyQueue.length}`],
    ['riders', `${game.door.allRiders().length}`],
    ['frame rate', `${Math.round(ui.framesPerSecond)} fps`],
  ];
  const height = rows.length * 17 + 52;
  ctx.save();
  fillRoundRect(ctx, x, y, 250, height, 10, 'rgba(20, 22, 30, 0.88)');
  ctx.fillStyle = PALETTE.brassLight;
  ctx.font = font(9, 'bold', FONT_DISPLAY);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  fillSpacedText(ctx, 'DEBUG  (D TO HIDE)', x + 12, y + 14, 1.5);
  ctx.font = '12px ui-monospace, "SF Mono", Menlo, monospace';
  rows.forEach(([label, value], i) => {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 12, y + 34 + i * 17);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(value, x + 238, y + 34 + i * 17);
  });
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'left';
  ctx.font = font(10, '600');
  ctx.fillText('1–4: add worker / manager / intern / courier', x + 12, y + height - 18);
  ctx.fillText('to the street line (hold Shift: lobby line)', x + 12, y + height - 6);
  ctx.restore();
}
