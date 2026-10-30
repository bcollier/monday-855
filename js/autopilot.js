// autopilot.js
// A simulated player. It reads the game the way a human would (with perfect
// eyesight but a reaction delay) and returns the same `controls` object the
// keyboard produces. Used by:
//   - tools/sim.js, to measure how hard the game is when tuning numbers
//   - index.html#scenario=play&bot, to watch a round play itself
// It never changes the game.
//
// Strategy of the careful player:
//   1. Plan around everyone riding AND whoever is next in line: aim a little below
//      the middle of their shared comfort range (the meter's SAFE ZONE). With
//      nobody around, idle at a gentle speed so people can step in.
//   2. If no speed works for everyone (NO SAFE SPEED), stay just under the lowest
//      top speed: a slow complaint takes 1.5 s, a fast one is instant.
//   3. Hold a gate when the next person would make NO SAFE SPEED, or when the door
//      is still too fast for them to step in safely, unless that line is about to
//      gridlock.

const AUTOPILOT_STYLES = {
  careful: { reactionSeconds: 0.25, usesGates: true, idleSpeed: 45, gridlockMargin: 2, aimWithinRange: 0.4 },
  sloppy: { reactionSeconds: 0.6, usesGates: false, idleSpeed: 80, gridlockMargin: 0, aimWithinRange: 0.5 },
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
  const speed = game.door.speed;
  const calmRiders = game.door.allRiders().filter((rider) => !rider.hasComplained);
  const fronts = [game.streetQueue.people[0], game.lobbyQueue.people[0]].filter(Boolean);
  const nearGridlock = (queue) => queue.length >= MAX_QUEUE_LENGTH - pilot.style.gridlockMargin;

  // A shared range narrower than this is as good as none: the door can't hold that steady.
  const isWorkable = (range) => range && range.max - range.min >= 10;

  // Who should the door suit right now? Riders, plus next-up people who fit with them.
  const planFor = [...calmRiders];
  for (const person of fronts) {
    if (isWorkable(sharedComfortRange([...planFor, person]))) planFor.push(person);
  }
  const shared = sharedComfortRange(planFor);
  if (!shared) {
    pilot.targetSpeed = pilot.style.idleSpeed;
  } else if (!shared.isEmpty) {
    const aim = shared.min + (shared.max - shared.min) * pilot.style.aimWithinRange;
    pilot.targetSpeed = clampSpeed(aim, shared.min + 4, shared.max - 6);
  } else {
    pilot.targetSpeed = Math.min(...calmRiders.map((rider) => rider.type.comfortMaxSpeed)) - 6;
  }

  const shouldHold = (queue) => {
    const person = queue.people[0];
    if (!pilot.style.usesGates || !person || nearGridlock(queue)) return false;
    const wouldConflict = !isWorkable(sharedComfortRange([...calmRiders, person]));
    const tooFastToStepIn = speed > person.type.comfortMaxSpeed - 4;
    return wouldConflict || tooFastToStepIn;
  };
  pilot.holdStreet = shouldHold(game.streetQueue);
  pilot.holdLobby = shouldHold(game.lobbyQueue);
}

function clampSpeed(speed, min, max) {
  return max < min ? (min + max) / 2 : Math.max(min, Math.min(max, speed));
}
