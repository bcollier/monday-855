// render/effects.js
// Draws what fx.js animates: floor stains, flying particles and speech bubbles.

/** Coffee stains and the like. They stay on the floor for the rest of the round. */
function drawDecals(ctx, fx) {
  for (const decal of fx.decals) {
    const settle = easeOutCubic(decal.age / 0.25);
    ctx.save();
    ctx.translate(decal.x, decal.y);
    ctx.scale(settle, settle);
    for (const blob of decal.blobs) fillCircle(ctx, blob.x, blob.y, blob.r, 'rgba(110, 66, 34, 0.55)');
    for (const blob of decal.blobs.slice(0, 3)) fillCircle(ctx, blob.x - 1, blob.y - 1, blob.r * 0.4, 'rgba(200, 160, 120, 0.35)');
    ctx.restore();
  }
}

function drawParticles(ctx, fx) {
  for (const particle of fx.particles) {
    const lifeLeft = 1 - particle.age / particle.life;
    ctx.save();
    ctx.globalAlpha = clamp(lifeLeft * 2.5, 0, 1);
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);
    const size = particle.size;
    switch (particle.kind) {
      case 'drop':
        fillCircle(ctx, 0, 0, size, '#6b3f22');
        break;
      case 'cup':
        fillCircle(ctx, 1.5, -1.5, size, PALETTE.shadow);
        fillCircle(ctx, 0, 0, size, '#fffaf0');
        fillCircle(ctx, 0, 0, size * 0.5, '#8a5530');
        break;
      case 'paper':
        fillRoundRect(ctx, -size * 0.7, -size, size * 1.4, size * 2, 1, '#ffffff');
        ctx.fillStyle = '#aab2c0';
        for (let line = -1; line <= 1; line++) ctx.fillRect(-size * 0.5, line * size * 0.5, size, 0.8);
        break;
      case 'box':
        fillRoundRect(ctx, -size / 2, -size / 2, size, size, 1.5, '#c8975a');
        ctx.fillStyle = '#ead6ae';
        ctx.fillRect(-1, -size / 2, 2, size);
        break;
      case 'phone':
        fillRoundRect(ctx, -size * 0.6, -size, size * 1.2, size * 2, 1.5, '#1f2430');
        fillRoundRect(ctx, -size * 0.45, -size * 0.8, size * 0.9, size * 1.5, 1, '#bfe3ff');
        break;
      case 'spark':
        ctx.strokeStyle = PALETTE.warning;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-size, 0);
        ctx.lineTo(size, 0);
        ctx.stroke();
        break;
      case 'puff':
        fillCircle(ctx, 0, 0, size * (1 + particle.age * 2.2), 'rgba(255, 255, 255, 0.7)');
        break;
      case 'confetti':
        ctx.fillStyle = particle.color;
        ctx.fillRect(-size / 2, -size, size, size * 1.8);
        break;
      case 'heart':
        // Drifts upright, whatever its rotation
        ctx.rotate(-particle.rotation);
        ctx.translate(0, -particle.age * 18);
        ctx.fillStyle = '#e25c8a';
        ctx.beginPath();
        ctx.moveTo(0, size * 0.9);
        ctx.bezierCurveTo(-size * 1.6, -size * 0.2, -size * 0.6, -size * 1.4, 0, -size * 0.4);
        ctx.bezierCurveTo(size * 0.6, -size * 1.4, size * 1.6, -size * 0.2, 0, size * 0.9);
        ctx.fill();
        break;
      case 'feather':
        fillEllipse(ctx, 0, 0, size * 1.4, size * 0.5, 0, '#c9cfd8');
        ctx.strokeStyle = '#8e97a6';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-size * 1.4, 0);
        ctx.lineTo(size * 1.4, 0);
        ctx.stroke();
        break;
    }
    ctx.restore();
  }
}

/**
 * Speech bubbles over people who just complained (AC #19). They pop in with a
 * little overshoot, wobble, follow the person, and fade out.
 */
function drawSpeechBubbles(ctx, fx) {
  for (const bubble of fx.bubbles) {
    const { visual, text, age } = bubble;
    const pop = easeOutBack(age / 0.22);
    const fade = clamp((BUBBLE_SECONDS - age) / 0.3, 0, 1);
    ctx.save();
    ctx.font = font(13, 'bold', FONT_DISPLAY);
    const width = ctx.measureText(text).width + 18;
    const height = 26;
    const below = visual.y < 110;   // too close to the top: put the bubble under the person
    const anchorY = below ? visual.y + 22 : visual.y - 22;
    const bubbleX = clamp(visual.x, width / 2 + 8, CANVAS_WIDTH - width / 2 - 8);
    const bubbleY = below ? anchorY + 8 : anchorY - 8 - height;

    ctx.globalAlpha = fade;
    ctx.translate(visual.x, anchorY);
    ctx.scale(pop, pop);
    ctx.rotate(Math.sin(age * 22) * 0.05 * (1 - clamp(age / 0.8, 0, 1)));
    ctx.translate(-visual.x, -anchorY);

    // Tail
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(visual.x, anchorY);
    ctx.lineTo(clamp(visual.x - 6, bubbleX - width / 2 + 10, bubbleX + width / 2 - 20), below ? bubbleY + 1 : bubbleY + height - 1);
    ctx.lineTo(clamp(visual.x + 6, bubbleX - width / 2 + 20, bubbleX + width / 2 - 10), below ? bubbleY + 1 : bubbleY + height - 1);
    ctx.closePath();
    ctx.fill();
    drawCard(ctx, bubbleX - width / 2, bubbleY, width, height, { radius: 10, fill: '#ffffff', border: PALETTE.ink });
    // Redraw the tail join over the card border
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(clamp(visual.x - 5, bubbleX - width / 2 + 11, bubbleX + width / 2 - 19), below ? bubbleY : bubbleY + height - 2, 10, 2);

    ctx.fillStyle = bubble.tone === 'calm' ? '#8a3fc2' : bubble.person.complaintReason === 'tooSlow' ? '#b0700b' : PALETTE.danger;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bubbleX, bubbleY + height / 2 + 1);

    // What actually went wrong, stamped on the bubble's corner: the funny line alone doesn't say.
    if (bubble.tone !== 'calm') {
      const reason = bubble.person.type.isTroublemaker ? 'GOT IN' : bubble.person.complaintReason === 'tooSlow' ? 'TOO SLOW' : 'TOO FAST';
      ctx.font = font(9, 'bold', FONT_DISPLAY);
      const chipWidth = ctx.measureText(reason).width + 14;
      const chipX = bubbleX + width / 2 - chipWidth + 6;
      const chipY = bubbleY - 9;
      ctx.save();
      ctx.translate(chipX + chipWidth / 2, chipY + 7);
      ctx.rotate(-0.06);
      fillRoundRect(ctx, -chipWidth / 2, -7, chipWidth, 14, 7, ctx.fillStyle);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(reason, 0, 0.5);
      ctx.restore();
    }
    ctx.restore();
  }
}
