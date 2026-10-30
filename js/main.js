// main.js
// Entry point: creates the game, the visual layer and the frame loop. Keep this file thin.
// Each frame: handle one-shot keys -> advance the rules in fixed steps -> animate -> draw.

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Draw at the screen's real pixel density so lines stay crisp on Retina displays.
// The game still thinks in 960 x 640; drawGame() scales everything.
const pixelRatio = Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1)));
canvas.width = CANVAS_WIDTH * pixelRatio;
canvas.height = CANVAS_HEIGHT * pixelRatio;

const game = new Game();
const fx = new Fx();
const ui = { showDebug: false, framesPerSecond: 60, areRulesFrozen: false, autopilot: null };
let previousTimestamp = null;
let unsimulatedSeconds = 0;

// index.html#scenario=conflict etc. jumps straight to a prepared moment (see scenarios.js).
const scenario = readScenarioFromHash();
if (scenario) {
  applyScenario(game, ui, scenario);
  fastForward(scenario.advanceSeconds);
} else {
  game.showTitle();
}

/** Runs the game and its animations for some seconds without drawing (for screenshots). */
function fastForward(seconds) {
  const frameSeconds = 1 / 60;
  for (let t = 0; t < seconds; t += frameSeconds) {
    stepRules(frameSeconds);
    fx.update(frameSeconds, game, game.takeEvents(), currentControls(0));
  }
}

const DEBUG_SPAWN_KEYS = { Digit1: 'officeWorker', Digit2: 'manager', Digit3: 'intern', Digit4: 'courier' };

function handleOneShotKeys() {
  if (wasKeyPressed('KeyD')) ui.showDebug = !ui.showDebug;

  if (game.phase === 'title' && wasKeyPressed('Space')) game.start();
  else if (game.phase === 'ended' && wasKeyPressed('KeyR')) game.reset();
  else if (wasKeyPressed('KeyP') || wasKeyPressed('Escape')) game.togglePause();

  if (ui.showDebug && game.phase === 'playing') {
    const side = isKeyHeld('ShiftLeft') || isKeyHeld('ShiftRight') ? 'lobby' : 'street';
    for (const [code, typeKey] of Object.entries(DEBUG_SPAWN_KEYS)) {
      if (wasKeyPressed(code)) game.addToQueue(side, typeKey, ARRIVAL_WALK_SECONDS);
    }
  }
}

/** Keyboard controls, or the autopilot's when it is playing. */
function currentControls(dt) {
  if (ui.autopilot && game.phase === 'playing') return autopilotControls(game, ui.autopilot, dt);
  return readControls();
}

/** The rules always advance in exact SIMULATION_STEP slices; leftover time waits for the next frame. */
function stepRules(frameSeconds) {
  if (ui.areRulesFrozen) return;
  unsimulatedSeconds += frameSeconds;
  while (unsimulatedSeconds >= SIMULATION_STEP) {
    game.update(SIMULATION_STEP, currentControls(SIMULATION_STEP));
    unsimulatedSeconds -= SIMULATION_STEP;
  }
}

function runFrame(timestamp) {
  // Real seconds since the last frame. The first frame moves nothing. Capped so a
  // background tab doesn't come back and jump the door hundreds of degrees.
  const frameSeconds = previousTimestamp === null
    ? 0
    : Math.min((timestamp - previousTimestamp) / 1000, MAX_FRAME_SECONDS);
  previousTimestamp = timestamp;
  if (frameSeconds > 0) ui.framesPerSecond = lerp(ui.framesPerSecond, 1 / frameSeconds, 0.05);

  handleOneShotKeys();

  stepRules(frameSeconds);
  fx.update(frameSeconds, game, game.takeEvents(), currentControls(0));
  drawGame(ctx, game, fx, ui, pixelRatio);
  endInputFrame();

  requestAnimationFrame(runFrame);
}

// Leaving the tab mid-round pauses it, so nobody gets fired while reading email.
window.addEventListener('blur', () => {
  if (game.phase === 'playing') game.togglePause();
});

requestAnimationFrame(runFrame);
