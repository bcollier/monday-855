// render/extras.js
// Draws the flourishes from surprises.js: floating words, banners, streak
// call-outs, the pigeon, rain, dogs on the sidewalk and the final countdown.

/** "+1", "LATTES INTACT!" and friends, drifting up and fading. */
function drawFloaters(ctx, fx) {
  for (const floater of fx.floaters) {
    const t = floater.age / floater.life;
    const pop = easeOutBack(floater.age / 0.2);
    ctx.save();
    ctx.globalAlpha = clamp((1 - t) * 2, 0, 1);
    ctx.translate(floater.x, floater.y);
    ctx.scale(pop, pop);
    ctx.font = font(floater.size, 'bold', FONT_DISPLAY);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3.5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeText(floater.text, 0, 0);
    ctx.fillStyle = floater.color;
    ctx.fillText(floater.text, 0, 0);
    ctx.restore();
  }
}

/** Announcement under the clock: rare sightings, the rain. Slides down, waits, slides back up. */
function drawBanner(ctx, fx) {
  const banner = fx.banner;
  if (!banner) return;
  const inT = easeOutBack(banner.age / 0.35);
  const outT = clamp((banner.age - 2.6) / 0.4, 0, 1);
  const y = lerp(-40, 88, inT) - outT * 130;
  ctx.save();
  ctx.font = font(13, 'bold');
  const width = Math.max(220, ctx.measureText(banner.subtitle).width + 40);
  const x = CANVAS_WIDTH / 2 - width / 2;
  drawCard(ctx, x, y, width, 46, { radius: 12, fill: '#fffdf7' });
  fillRoundRect(ctx, x, y, width, 5, 2.5, banner.color);
  ctx.fillStyle = banner.color;
  ctx.font = font(11, 'bold', FONT_DISPLAY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fillSpacedText(ctx, banner.title, CANVAS_WIDTH / 2, y + 17, 2);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = font(13, '600');
  ctx.fillText(banner.subtitle, CANVAS_WIDTH / 2, y + 33);
  ctx.restore();
}

/** "SMOOTH!", "BUTTERY!"... stamped over the lobby floor beside the door. */
function drawStreakCallout(ctx, fx) {
  const callout = fx.streakCallout;
  if (!callout) return;
  const pop = easeOutBack(callout.age / 0.3);
  const fade = clamp((1.8 - callout.age) / 0.4, 0, 1);
  ctx.save();
  ctx.translate(232, 214);
  ctx.rotate(-0.09);
  ctx.scale(pop, pop);
  ctx.globalAlpha = fade;
  ctx.font = font(30, 'bold', FONT_DISPLAY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText(callout.text, 0, 0);
  ctx.fillStyle = PALETTE.safe;
  ctx.fillText(callout.text, 0, 0);
  ctx.font = font(12, 'bold', FONT_DISPLAY);
  ctx.lineWidth = 4;
  const sub = `${callout.streak} HAPPY IN A ROW`;
  ctx.strokeText(sub, 0, 26);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText(sub, 0, 26);
  ctx.restore();
}

/** A city pigeon, seen from above. Wings spread and flap while flying. */
function drawPigeon(ctx, pigeon, time) {
  if (pigeon.state === 'away') return;
  const isFlying = pigeon.state !== 'riding';
  ctx.save();
  // Shadow: further from the bird while it flies, as if it were higher up
  const lift = isFlying ? 14 : 2;
  fillEllipse(ctx, pigeon.x + lift * 0.8, pigeon.y - lift * 0.6, 7, 5, pigeon.facing, PALETTE.shadow);
  ctx.translate(pigeon.x, pigeon.y);
  ctx.rotate(pigeon.facing);
  if (isFlying) {
    const flap = Math.sin(time * 28) * 0.5 + 0.5;
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#8e97a6';
      ctx.beginPath();
      ctx.moveTo(1, side * 2);
      ctx.quadraticCurveTo(-2, side * (8 + flap * 8), -7, side * (11 + flap * 6));
      ctx.lineTo(-5, side * 2);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    // Riding: balances with little wing twitches
    const twitch = Math.max(0, Math.sin(time * 9)) * 1.5;
    fillEllipse(ctx, -1, -4 - twitch, 4, 2, 0, '#8e97a6');
    fillEllipse(ctx, -1, 4 + twitch, 4, 2, 0, '#8e97a6');
  }
  // Tail fan, body, wing bars, head with a green-purple neck shine, beak
  ctx.fillStyle = '#5f6673';
  ctx.beginPath();
  ctx.moveTo(-5, 0);
  ctx.lineTo(-11, -3);
  ctx.lineTo(-11, 3);
  ctx.closePath();
  ctx.fill();
  fillEllipse(ctx, 0, 0, 6.5, 4.2, 0, '#9aa3b2');
  ctx.fillStyle = '#3d4250';
  ctx.fillRect(-3, -3.4, 1.2, 6.8);
  ctx.fillRect(-0.8, -3.6, 1.2, 7.2);
  fillCircle(ctx, 5, 0, 3.2, '#4f6070');
  fillEllipse(ctx, 3.4, 0, 1.6, 2.6, 0, '#5aa38a');
  fillCircle(ctx, 6.6, -1.3, 0.8, '#f2b51d');
  fillCircle(ctx, 6.6, 1.3, 0.8, '#f2b51d');
  ctx.fillStyle = '#e8b04a';
  ctx.beginPath();
  ctx.moveTo(8, -0.8);
  ctx.lineTo(10, 0);
  ctx.lineTo(8, 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** A passing shower: streaks over the street (never the lobby) and rings on the puddles. */
function drawRain(ctx, fx) {
  const rain = fx.weather.rain;
  if (rain < 0.02) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, FACADE_BOTTOM, CANVAS_WIDTH, CANVAS_HEIGHT - FACADE_BOTTOM);
  ctx.arc(DOOR_CENTER_X, DOOR_CENTER_Y, DOOR_RADIUS + 14, 0, Math.PI * 2);
  ctx.clip('evenodd');   // the street, minus the covered door
  // Slightly darker, wetter street
  ctx.fillStyle = `rgba(40, 60, 90, ${0.12 * rain})`;
  ctx.fillRect(0, FACADE_BOTTOM, CANVAS_WIDTH, CANVAS_HEIGHT - FACADE_BOTTOM);
  ctx.strokeStyle = `rgba(220, 235, 255, ${0.55 * rain})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  const drops = Math.floor(150 * rain);
  const height = CANVAS_HEIGHT - FACADE_BOTTOM + 40;
  for (let i = 0; i < drops; i++) {
    const x = (i * 97.3 + fx.time * 70) % (CANVAS_WIDTH + 40) - 20;
    const y = FACADE_BOTTOM - 20 + ((i * 53.7 + fx.time * 520) % height);
    ctx.moveTo(x, y);
    ctx.lineTo(x - 4, y + 11);
  }
  ctx.stroke();
  // Rings spreading on the puddles
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * rain})`;
  ctx.lineWidth = 1;
  for (const [px, py, rx, ry] of [[300, 392, 40, 12], [706, 488, 26, 8], [880, 380, 24, 7], [150, 520, 30, 9]]) {
    for (let k = 0; k < 3; k++) {
      const phase = (fx.time * 1.3 + k / 3 + px) % 1;
      const ringX = px + Math.sin(k * 7.1 + Math.floor(fx.time * 1.3 + k / 3) * 3.3) * rx * 0.5;
      ctx.globalAlpha = 1 - phase;
      ctx.beginPath();
      ctx.ellipse(ringX, py, 2 + phase * 9, 1 + phase * 3.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** A small dog trotting ahead of its owner on the sidewalk. */
function drawDog(ctx, x, y, facing, phase) {
  ctx.save();
  fillEllipse(ctx, x + 3, y - 2, 7, 4, 0, PALETTE.shadow);
  ctx.translate(x, y);
  ctx.rotate(facing);
  const step = Math.sin(phase * 1.6);
  ctx.fillStyle = '#3d2c22';
  for (const [lx, ly] of [[4, -3], [4, 3], [-4, -3], [-4, 3]]) fillEllipse(ctx, lx + step * (lx > 0 ? 1.5 : -1.5), ly * 1.2, 1.8, 1.2, 0, '#3d2c22');
  // Wagging tail
  ctx.strokeStyle = '#b07a48';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(-10, Math.sin(phase * 5) * 3);
  ctx.stroke();
  fillEllipse(ctx, 0, 0, 7, 3.8, 0, '#c48a52');
  fillCircle(ctx, 7, 0, 3.4, '#c48a52');
  fillEllipse(ctx, 6.5, -2.8, 1.8, 1.2, 0.4, '#7a4b2c');
  fillEllipse(ctx, 6.5, 2.8, 1.8, 1.2, -0.4, '#7a4b2c');
  fillCircle(ctx, 10, 0, 1, '#1f2430');
  ctx.restore();
}

/** The last five seconds: big numbers popping over the lobby. */
function drawFinalCountdown(ctx, game) {
  if (game.phase !== 'playing') return;
  const remaining = ROUND_DURATION_SECONDS - game.secondsElapsed;
  if (remaining > 5 || remaining <= 0) return;
  const number = Math.ceil(remaining);
  const intoSecond = number - remaining;
  const pop = easeOutBack(intoSecond / 0.25);
  ctx.save();
  ctx.translate(CANVAS_WIDTH / 2, 150);
  ctx.scale(lerp(1.6, 1, pop), lerp(1.6, 1, pop));
  ctx.globalAlpha = clamp(1.2 - intoSecond, 0.15, 1);
  ctx.font = font(84, 'bold', FONT_DISPLAY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText(String(number), 0, 0);
  ctx.fillStyle = PALETTE.danger;
  ctx.fillText(String(number), 0, 0);
  ctx.restore();
}

/** Extra bounce for people: a happy hop when leaving, and everyone jumping at 9:00. */
function celebrationScale(fx, visual, personId) {
  let scale = 1;
  if (visual.hopAge < 0.4) scale += 0.18 * Math.sin((visual.hopAge / 0.4) * Math.PI);
  if (fx.cheerAge < 3) scale += 0.16 * Math.abs(Math.sin(fx.cheerAge * 9 + personId)) * (1 - fx.cheerAge / 3);
  return scale;
}
