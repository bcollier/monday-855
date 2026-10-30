// render/lessons.js
// Draws the tutorial: the step card (top left) and a pulsing ring around
// whatever the step is about (the door, the speed meter or the street line).

function drawTutorial(ctx, tutorial, fx) {
  drawTutorialFocus(ctx, tutorial.current.focus, fx.time);
  drawTutorialCard(ctx, tutorial, fx);
}

function drawTutorialFocus(ctx, focus, time) {
  if (!focus) return;
  const pulse = 0.5 + 0.5 * Math.sin(time * 5);
  ctx.save();
  ctx.strokeStyle = `rgba(199, 154, 69, ${0.55 + 0.45 * pulse})`;
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 7]);
  ctx.lineDashOffset = -time * 30;
  if (focus === 'door') {
    ctx.beginPath();
    ctx.arc(DOOR_CENTER_X, DOOR_CENTER_Y, DOOR_RADIUS + 30 + pulse * 4, 0, Math.PI * 2);
    ctx.stroke();
  } else if (focus === 'meter') {
    roundRectPath(ctx, METER.x - 7 - pulse * 2, METER.y - 7 - pulse * 2, METER.width + 14 + pulse * 4, METER.height + 14 + pulse * 4, 16);
    ctx.stroke();
  } else if (focus === 'street') {
    const front = queueFrontPoint('street');
    roundRectPath(ctx, front.x - 36 - pulse * 2, front.y - 26 - pulse * 2, 230 + pulse * 4, 140 + pulse * 4, 18);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTutorialCard(ctx, tutorial, fx) {
  const step = tutorial.current;
  const x = 16;
  const y = 76;
  const width = 400;
  const textWidth = width - 36;
  ctx.font = font(13, '600');
  const lines = layoutHintText(ctx, step.text, textWidth);
  const lineHeight = 23;
  const feedbackHeight = tutorial.feedback ? 34 : 0;
  const height = 78 + lines.length * lineHeight + feedbackHeight + 28;

  ctx.save();
  drawCard(ctx, x, y, width, height, { radius: 14, fill: '#fffdf7' });
  fillRoundRect(ctx, x, y, width, 6, 3, PALETTE.brass);

  // Step counter as little dots
  TUTORIAL_STEPS.forEach((_, i) => {
    const color = i < tutorial.stepIndex ? PALETTE.safe : i === tutorial.stepIndex ? PALETTE.brass : 'rgba(31, 36, 48, 0.15)';
    fillCircle(ctx, x + 22 + i * 14, y + 24, 4.5, color);
  });
  ctx.fillStyle = PALETTE.brassDark;
  ctx.font = font(9, 'bold', FONT_DISPLAY);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  fillSpacedText(ctx, `PRACTICE · STEP ${tutorial.stepIndex + 1} OF ${TUTORIAL_STEPS.length}`, x + width - 18, y + 24, 1.4);

  ctx.fillStyle = PALETTE.ink;
  ctx.font = font(21, 'bold', FONT_DISPLAY);
  ctx.textAlign = 'left';
  ctx.fillText(step.title, x + 18, y + 54);

  lines.forEach((line, lineIndex) => {
    let cursor = x + 18;
    const baseline = y + 84 + lineIndex * lineHeight;
    for (const token of line) {
      if (token.isKey) {
        drawKeyCap(ctx, cursor, baseline - 10, token.width, token.text, { height: 19, fontSize: 10 });
      } else {
        ctx.fillStyle = PALETTE.inkSoft;
        ctx.font = font(13, '600');
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(token.text, cursor, baseline + 0.5);
      }
      cursor += token.width + token.spaceAfter;
    }
  });

  if (tutorial.feedback) {
    const feedbackY = y + 76 + lines.length * lineHeight;
    fillRoundRect(ctx, x + 14, feedbackY, width - 28, 28, 8, 'rgba(226, 69, 60, 0.1)');
    ctx.fillStyle = PALETTE.danger;
    ctx.font = font(12, 'bold');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(tutorial.feedback.text, x + 24, feedbackY + 14.5);
  }

  ctx.fillStyle = 'rgba(31, 36, 48, 0.45)';
  ctx.font = font(10, '600');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(tutorial.isFinished ? 'Esc: back to the menu' : 'Esc: leave practice', x + 18, y + height - 15);

  // "Nice!" stamp when a step is done
  if (tutorial.successAge !== Infinity && !tutorial.isFinished) {
    const pop = easeOutBack(tutorial.successAge / 0.3);
    ctx.save();
    ctx.translate(x + width - 70, y + 52);
    ctx.rotate(-0.12);
    ctx.scale(pop, pop);
    fillRoundRect(ctx, -44, -16, 88, 32, 16, PALETTE.safe);
    ctx.fillStyle = '#ffffff';
    ctx.font = font(16, 'bold', FONT_DISPLAY);
    ctx.textAlign = 'center';
    fillSpacedText(ctx, 'NICE!', 0, 1, 2);
    ctx.restore();
  }
  ctx.restore();
}
