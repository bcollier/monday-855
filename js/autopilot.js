// autopilot.js
// A simulated player. It reads the game the way a human would (with perfect
// eyesight but a reaction delay) and returns the same `controls` object the
// keyboard produces. Used by:
//   - tools/sim.js, to measure how hard the game is when tuning numbers
//   - index.html#scenario=play&bot, to watch a round play itself
// It never changes the game.
//
// Strategy of the careful player:
//   1. Aim for the middle of everyone's shared comfort range (the meter's SAFE ZONE).
//      With nobody inside, idle at a gentle speed so people can step in.
//   2. If no speed works for everyone (NO SAFE SPEED), stay just under the lowest
//      top speed: a slow complaint takes 1.5 s, a fast one is instant.
//   3. Hold a gate when the next person would make NO SAFE SPEED, unless that line
//      is about to gridlock.

const AUTOPILOT_STYLES = {
  careful: { reactionSeconds: 0.25, usesGates: true, idleSpeed: 50, gridlockMargin: 2 },
  sloppy: { reactionSeconds: 0.6, usesGates: false, idleSpeed: 80, gridlockMargin: 0 },
};

function createAutopilot(styleName = 'careful') {
  return {
    style: AUTOPILOT_STYLES[styleName],
    secondsUntilDecision: 0,
    targetSpeed: 0,
    holdStreet: false,
    holdLobby: false,
  };
}

function autopilotControls(game, pilot, dt) {
  pilot.secondsUntilDecision -= dt;
  if (pilot.secondsUntilDecision <= 0) {
    pilot.secondsUntilDecision = pilot.style.reactionSeconds;
    decideAutopilot(game, pilot);
  }
  return {
    isPushingDoor: game.door.speed < pilot.targetSpeed,
    isStreetGateHeld: pilot.holdStreet,
    isLobbyGateHeld: pilot.holdLobby,
  };
}

function decideAutopilot(game, pilot) {
  const riders = game.door.allRiders();
  const calmRiders = riders.filter((rider) => !rider.hasComplained);
  const shared = sharedComfortRange(calmRiders);
  if (!shared) {
    pilot.targetSpeed = pilot.style.idleSpeed;
  } else if (!shared.isEmpty) {
    pilot.targetSpeed = (shared.min + shared.max) / 2;
  } else {
    pilot.targetSpeed = Math.min(...calmRiders.map((rider) => rider.type.comfortMaxSpeed)) - 6;
  }

  const wouldConflict = (person) => person && sharedComfortRange([...calmRiders, person]).isEmpty;
  const nearGridlock = (queue) => queue.length >= MAX_QUEUE_LENGTH - pilot.style.gridlockMargin;
  pilot.holdStreet = pilot.style.usesGates && wouldConflict(game.streetQueue.people[0]) && !nearGridlock(game.streetQueue);
  pilot.holdLobby = pilot.style.usesGates && wouldConflict(game.lobbyQueue.people[0]) && !nearGridlock(game.lobbyQueue);
}
