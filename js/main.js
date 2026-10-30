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
const ui = { showDebug: false, framesPerSecond: 60, areRulesFrozen: false, autopilot: null, tutorial: null };
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
    updateVisuals(frameSeconds);
  }
}

/** Hands this frame's rule events to the tutorial (if running) and the visual layer. */
function updateVisuals(frameSeconds) {
  const events = game.takeEvents();
  ui.tutorial?.update(frameSeconds, game, events);
  fx.update(frameSeconds, game, events, currentControls(0));
}

function startTutorial() {
  game.startMode('tutorial');
  ui.tutorial = new Tutorial(game);
}

function backToTitle() {
  ui.tutorial = null;
  game.showTitle();
}

const DEBUG_SPAWN_KEYS = { Digit1: 'officeWorker', Digit2: 'manager', Digit3: 'intern', Digit4: 'courier' };

function handleOneShotKeys() {
  if (wasKeyPressed('KeyD')) ui.showDebug = !ui.showDebug;
  if (wasKeyPressed('KeyC')) toggleTheme();

  const isPractice = game.mode === 'tutorial' && game.phase !== 'title';
  if (game.phase === 'title') {
    // Space starts a Classic round (AC #30); R is Rush; T is the tutorial.
    if (wasKeyPressed('Space')) {
      game.mode = 'classic';
      game.start();
    } else if (wasKeyPressed('KeyR')) {
      game.startMode('rush');
    } else if (wasKeyPressed('KeyT')) {
      startTutorial();
    }
  } else if (isPractice && wasKeyPressed('Escape')) {
    backToTitle();
  } else if (isPractice && ui.tutorial?.isFinished && (wasKeyPressed('Space') || wasKeyPressed('KeyR'))) {
    ui.tutorial = null;
    game.startMode(wasKeyPressed('KeyR') ? 'rush' : 'classic');
  } else if (game.phase === 'ended') {
    // R restarts in the same mode (AC #26). Space does too once the end screen has
    // had a moment, so a still-mashed Space can't skip the results. Esc: menu.
    if (wasKeyPressed('KeyR') || (wasKeyPressed('Space') && fx.endScreenAge > 1.2)) game.reset();
    else if (wasKeyPressed('Escape')) backToTitle();
  } else if (wasKeyPressed('KeyP') || wasKeyPressed('Escape')) {
    game.togglePause();
  }

  // Rush perks: 1 / 2 / 3 (with the debug overlay open, those keys add people instead)
  if (game.mode === 'rush' && game.phase === 'playing' && !ui.showDebug) {
    for (const [name, perk] of Object.entries(PERKS)) {
      if (wasKeyPressed(perk.key)) game.usePerk(name);
    }
  }

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
  updateVisuals(frameSeconds);
  drawGame(ctx, game, fx, ui, pixelRatio);
  endInputFrame();

  requestAnimationFrame(runFrame);
}

// Leaving the tab mid-round pauses it, so nobody gets fired while reading email.
window.addEventListener('blur', () => {
  if (game.phase === 'playing') game.togglePause();
});

requestAnimationFrame(runFrame);
