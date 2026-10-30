// render/rush_hud.js
// Rush extras on screen (rules in rush.js): the tips counter, the current job,
// the perk shelf (keys 1 / 2 / 3), progress toward earning a strike back, VIP
// stars, and the coffee-break and elevator-music effects. Only reads game and fx.

const TIP_GOLD = '#d9a12b';
const VIP_GOLD = '#f2c230';

function drawRushHud(ctx, game, fx) {
  drawTipsCounter(ctx, game, fx);
  drawJobCard(ctx, game, fx);
  drawEarnBack(ctx, game);
  drawPerkShelf(ctx, game, fx);
}

/** Top left, under DELIVERED: dollars in pocket and the streak that doubles tips. */
function drawTipsCounter(ctx, game, fx) {
  const x = 16;
  const y = 70;
  const width = 150;
  const bounce = 1 + 0.12 * fx.tipBounce;
  ctx.save();
  drawCard(ctx, x, y, width, 28, { radius: 10 });
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.inkSoft;
  ctx.font = font(8, 'bold', FONT_DISPLAY);
  fillSpacedText(ctx, 'TIPS', x + 10, y + 14.5, 1.4);
  ctx.save();
  ctx.translate(x + 40, y + 15);
  ctx.scale(bounce, bounce);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = font(16, 'bold', FONT_DISPLAY);
  ctx.fillText(`$${game.tips}`, 0, 0);
  ctx.restore();

  // Streak chip: counts up to 5, then shows x2 in gold
  const multiplier = tipMultiplierFor(game.happyStreak);
  const chipText = multiplier > 1 ? `x${multiplier} STREAK` : `STREAK ${game.happyStreak}/${TIP_STREAK_STEP}`;
  ctx.font = font(8, 'bold', FONT_DISPLAY);
  const chipWidth = ctx.measureText(chipText).width + 12;
  fillRoundRect(ctx, x + width - chipWidth - 6, y + 7, chipWidth, 14, 7, multiplier > 1 ? TIP_GOLD : 'rgba(31, 36, 48, 0.1)');
  ctx.fillStyle = multiplier > 1 ? '#ffffff' : PALETTE.inkSoft;
  ctx.textAlign = 'center';
  ctx.fillText(chipText, x + width - chipWidth / 2 - 6, y + 14.5);
  ctx.restore();
}

/** Top left, under the tips: the current job, its time left and progress. */
function drawJobCard(ctx, game, fx) {
  const job = game.job;
  const recent = fx.lastJob && fx.lastJob.age < 1.6 ? fx.lastJob : null;
  if (!job && !recent) return;
  const shown = job || recent.job;
  const x = 16;
  const y = 104;
  const width = 250;
  const height = 60;
  const pop = job ? easeOutBack(clamp(fx.jobAge / 0.35, 0, 1)) : 1;
  const fade = job ? 1 : clamp((1.6 - recent.age) / 0.4, 0, 1);

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(x, y);
  ctx.scale(1, pop);
  drawCard(ctx, 0, 0, width, height, { radius: 12, fill: '#fffdf7' });
  fillRoundRect(ctx, 0, 0, 6, height, 3, PALETTE.brass);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.brassDark;
  ctx.font = font(9, 'bold', FONT_DISPLAY);
  fillSpacedText(ctx, 'JOB', 16, 14, 1.6);
  ctx.textAlign = 'right';
  ctx.fillText(`+$${JOB_REWARD_TIPS} & FREE COFFEE`, width - 12, 14);
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.ink;
  ctx.font = font(13, 'bold');
  ctx.fillText(shown.text, 16, 33);

  if (job) {
    // Time left as a draining bar, progress as dots (or a ticking bar for "no strikes")
    const barWidth = width - 90;
    const left = clamp(job.secondsLeft / JOB_SECONDS, 0, 1);
    fillRoundRect(ctx, 16, 47, barWidth, 5, 2.5, 'rgba(31, 36, 48, 0.1)');
    fillRoundRect(ctx, 16, 47, Math.max(5, barWidth * left), 5, 2.5, left < 0.25 ? PALETTE.danger : PALETTE.brass);
    ctx.fillStyle = PALETTE.inkSoft;
    ctx.font = font(10, 'bold');
    ctx.textAlign = 'right';
    ctx.fillText(job.lasts ? `${Math.ceil(job.secondsLeft)} s` : `${job.progress} / ${job.target}`, width - 12, 50);
  } else {
    // Stamp: DONE! or MISSED
    const stamp = easeOutBack(clamp(recent.age / 0.25, 0, 1));
    ctx.translate(width - 52, 32);
    ctx.rotate(-0.14);
    ctx.scale(stamp, stamp);
    ctx.strokeStyle = recent.isDone ? PALETTE.safe : PALETTE.inkSoft;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 2.5;
    roundRectPath(ctx, -38, -13, 76, 26, 6);
    ctx.stroke();
    ctx.font = font(13, 'bold', FONT_DISPLAY);
    ctx.textAlign = 'center';
    fillSpacedText(ctx, recent.isDone ? 'DONE!' : 'MISSED', 0, 1, 2);
  }
  ctx.restore();
}

/** Under the strike counter while a strike is on the board: 10 happy deliveries in a row earn it back. */
function drawEarnBack(ctx, game) {
  if (game.complaintCount === 0 || game.phase === 'ended') return;
  const dots = EARN_BACK_STREAK;
  const width = 172;
  const x = CANVAS_WIDTH - 16 - width;
  const y = 94;   // under the Rush badge
  ctx.save();
  fillRoundRect(ctx, x, y, width, 20, 10, 'rgba(255, 253, 247, 0.92)');
  ctx.fillStyle = PALETTE.safe;
  ctx.font = font(8, 'bold', FONT_DISPLAY);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  fillSpacedText(ctx, 'EARN BACK', x + 10, y + 10.5, 1.2);
  for (let i = 0; i < dots; i++) {
    fillCircle(ctx, x + 76 + i * 9, y + 10, 3.2, i < game.earnBackProgress ? PALETTE.safe : 'rgba(31, 36, 48, 0.15)');
  }
  ctx.restore();
}

/** Bottom right, above the controls legend: the three perks, their keys and prices. */
function drawPerkShelf(ctx, game, fx) {
  const names = Object.keys(PERKS);
  const slotWidth = 100;
  const gap = 6;
  const height = 38;
  const totalWidth = names.length * slotWidth + (names.length - 1) * gap;
  const y = CANVAS_HEIGHT - 26 - height;
  let x = CANVAS_WIDTH - 10 - totalWidth;
  ctx.save();
  for (const name of names) {
    const perk = PERKS[name];
    const price = game.perkPrice(name);
    const isRunning = (game.perkSecondsLeft[name] || 0) > 0;
    const canUse = price !== null && price <= game.tips;
    const flash = fx.perkFlash[name] || 0;
    ctx.globalAlpha = canUse || isRunning ? 1 : 0.55;
    drawCard(ctx, x, y, slotWidth, height, { radius: 10, fill: isRunning ? '#fff4d6' : canUse ? '#fffdf7' : '#e8e2d6' });
    if (flash > 0) fillRoundRect(ctx, x, y, slotWidth, height, 10, `rgba(242, 194, 48, ${0.5 * flash})`);
    drawKeyCap(ctx, x + 8, y + 9, 20, perk.key.replace('Digit', ''), { height: 20, fontSize: 11 });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.ink;
    ctx.font = font(11, 'bold');
    ctx.fillText(PERK_SHORT_NAMES[name], x + 34, y + 13);
    ctx.font = font(10, 'bold');
    if (isRunning) {
      const left = game.perkSecondsLeft[name] / perk.seconds;
      fillRoundRect(ctx, x + 34, y + 24, slotWidth - 44, 5, 2.5, 'rgba(31, 36, 48, 0.12)');
      fillRoundRect(ctx, x + 34, y + 24, Math.max(5, (slotWidth - 44) * left), 5, 2.5, TIP_GOLD);
    } else {
      const isFree = name === 'coffee' && game.freeCoffees > 0;
      ctx.fillStyle = isFree ? PALETTE.safe : canUse ? PALETTE.brassDark : PALETTE.inkSoft;
      const label = isFree ? `FREE x${game.freeCoffees}` : `$${perk.cost}`;
      ctx.fillText(label, x + 34, y + 27);
    }
    x += slotWidth + gap;
  }
  ctx.restore();
}

const PERK_SHORT_NAMES = { coffee: 'Coffee', security: 'Security', music: 'Music' };

/** A gold star and ring on VIPs, in line and riding. */
function drawVipMarks(ctx, game, fx) {
  const vips = [...game.streetQueue.people, ...game.door.allRiders()].filter((person) => person.isVip);
  for (const person of vips) {
    const visual = fx.visualOf(person);
    const pulse = 0.5 + 0.5 * Math.sin(fx.time * 4 + person.id);
    ctx.save();
    ctx.strokeStyle = `rgba(242, 194, 48, ${0.55 + 0.4 * pulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(visual.x, visual.y, 15, 0, Math.PI * 2);
    ctx.stroke();
    drawStar(ctx, visual.x + 12, visual.y - 12, 6.5, VIP_GOLD, person.wasImpatient ? 0.45 : 1);
    ctx.restore();
  }
}

function drawStar(ctx, x, y, radius, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#8a6a2f';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/** Coffee break: the whole screen goes warm and soft while everything runs at half speed. */
function drawCoffeeBreakTint(ctx, game) {
  const left = game.perkSecondsLeft?.coffee || 0;
  if (left <= 0) return;
  const strength = clamp(left / 0.5, 0, 1) * clamp((PERKS.coffee.seconds - left) / 0.3, 0, 1);
  ctx.save();
  ctx.fillStyle = `rgba(150, 95, 40, ${0.16 * strength})`;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.restore();
}

/** Elevator music: little notes drifting around the door. */
function drawMusicNotes(ctx, game, fx) {
  const left = game.perkSecondsLeft?.music || 0;
  if (left <= 0) return;
  const fade = clamp(left / 0.5, 0, 1);
  ctx.save();
  ctx.font = font(18, 'bold');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 8; i++) {
    const t = (fx.time * 0.35 + i / 8) % 1;
    const angle = (i / 8) * Math.PI * 2 + fx.time * 0.5;
    const radius = DOOR_RADIUS + 18 + t * 30;
    ctx.globalAlpha = fade * Math.sin(t * Math.PI);
    ctx.fillStyle = i % 2 ? '#7a5cc2' : '#3f8f8a';
    ctx.fillText(i % 3 === 0 ? '♫' : '♪', DOOR_CENTER_X + Math.cos(angle) * radius, DOOR_CENTER_Y + Math.sin(angle) * radius - t * 12);
  }
  ctx.restore();
}
