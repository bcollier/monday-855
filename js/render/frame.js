// render/frame.js
// drawGame(): puts one frame together, back to front. Reads the game and fx;
// changes neither. To change how something looks, edit the file for that layer.

function drawGame(ctx, game, fx, ui, pixelRatio) {
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  // ---- The world (shakes on a complaint) ----
  ctx.save();
  if (fx.shake > 0.2) ctx.translate(Math.sin(fx.time * 61) * fx.shake, Math.cos(fx.time * 47) * fx.shake);

  drawSceneBackground(ctx, pixelRatio);
  drawStreetShimmer(ctx, fx.time);
  drawCars(ctx, fx.cars);
  drawAmbientPeople(ctx, fx);
  drawQueueLane(ctx, game.streetQueue, fx.time);
  drawQueueLane(ctx, game.lobbyQueue, fx.time);

  drawDoorFloor(ctx);
  drawDecals(ctx, fx);
  const isTitle = game.phase === 'title';
  if (!isTitle) drawAlignedCompartmentGlow(ctx, game.door, fx.time);
  drawQueuedPeople(ctx, game, fx, ui);
  const mood = doorMood(game, fx);
  drawDoorWings(ctx, isTitle ? fx.titleDoorAngle : game.door.angle, isTitle ? 24 : game.door.speed, mood, fx.time);
  drawRiders(ctx, game, fx, ui);
  if (fx.pigeon.state === 'riding') drawPigeon(ctx, fx.pigeon, fx.time);
  drawDoorMoodGlow(ctx, mood, fx.time);
  drawDoorHousing(ctx, fx.time);
  drawWalkers(ctx, fx, ui);
  drawRain(ctx, fx);
  drawGateBarrier(ctx, 'street', fx.gateAmount.street);
  drawGateBarrier(ctx, 'lobby', fx.gateAmount.lobby);
  drawTroubleWarning(ctx, game, fx);
  drawParticles(ctx, fx);
  if (fx.pigeon.state !== 'riding') drawPigeon(ctx, fx.pigeon, fx.time);
  drawPeopleOverlays(ctx, game, fx);
  drawSpeechBubbles(ctx, fx);
  drawFloaters(ctx, fx);
  drawStreakCallout(ctx, fx);
  ctx.restore();

  drawFinalMinuteVignette(ctx, game, fx);

  // ---- Interface ----
  if (!isTitle) {
    drawHud(ctx, game, fx, ui);
    drawSpeedMeter(ctx, game, fx);
    drawBanner(ctx, fx);
    drawFinalCountdown(ctx, game);
  }
  if (ui.tutorial && game.mode === 'tutorial' && game.phase !== 'title') drawTutorial(ctx, ui.tutorial, fx);
  if (ui.showDebug) drawDebugOverlay(ctx, game, ui);

  if (isTitle) drawTitleScreen(ctx, fx);
  else if (game.phase === 'paused') drawPauseScreen(ctx);
  else if (game.phase === 'ended') drawEndScreen(ctx, game, fx);
}

/** From 8:59 the edges of the screen darken and breathe: it should feel crowded and late. */
function drawFinalMinuteVignette(ctx, game, fx) {
  if (game.phase !== 'playing' && game.phase !== 'paused') return;
  const intoFinalMinute = game.secondsElapsed - FINAL_MINUTE_STARTS_AT;
  if (intoFinalMinute <= 0) return;
  const strength = clamp(intoFinalMinute / 6, 0, 1) * (0.75 + 0.25 * Math.sin(fx.time * 4));
  const gradient = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 260, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 640);
  gradient.addColorStop(0, 'rgba(90, 10, 16, 0)');
  gradient.addColorStop(1, `rgba(90, 10, 16, ${0.38 * strength})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}
