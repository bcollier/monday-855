// surprises.js
// The little things that make a round feel alive, and a bit silly: rare
// characters, streak call-outs, a doorman rank, a pigeon that rides the door,
// and the odd rain shower. Everything here is VISUAL. None of it changes a rule:
// a CEO is still a Late manager (70–170 °/s), the pigeon weighs nothing, and the
// rain never gets anyone wet in a way the game cares about.
// fx.js calls into this file; render/extras.js draws it.

// ---- Rare characters ----
// Each arriving person has a small chance to be a rare version of their type.
const RARE_LOOK_CHANCE = 0.07;
const RARE_LOOKS = {
  officeWorker: [
    { key: 'dino', name: 'someone in a dinosaur onesie', lines: { tooFast: ['RAWR!!', 'EXTINCTION EVENT!'], tooSlow: ['RAWR. (IMPATIENTLY)', 'I EVOLVED WAITING HERE'] } },
    { key: 'cake', name: 'the birthday cake', lines: { tooFast: ['THE CAKE!!', 'NOT THE FROSTING!'], tooSlow: ['THE CANDLES ARE MELTING!'] } },
    { key: 'plant', name: 'a very large ficus', lines: { tooFast: ['MY FICUS!', 'LEAVES! EVERYWHERE!'], tooSlow: ['IT NEEDS SUNLIGHT!'] } },
  ],
  manager: [
    { key: 'ceo', name: 'the CEO', lines: { tooFast: ["YOU'RE FIRED! ...OH WAIT", 'I OWN THIS DOOR!'], tooSlow: ['DO YOU KNOW MY SALARY?', 'I BOUGHT THIS DOOR!'] } },
  ],
  intern: [
    { key: 'twelve', name: 'the twelve-coffee intern', lines: { tooFast: ['TWELVE ORDERS!!', 'DOUBLE TRAY DOWN!'], tooSlow: ['TWELVE LATTES GOING COLD!'] } },
  ],
  courier: [
    { key: 'cat', name: 'a courier with a cat', lines: { tooFast: ['MRRROW?!', 'THE CAT IS FINE. THE CAT IS FINE.'], tooSlow: ['THE CAT IS JUDGING YOU'] } },
  ],
};

function pickRareLook(typeKey, random) {
  const options = RARE_LOOKS[typeKey];
  if (!options || random() >= RARE_LOOK_CHANCE) return null;
  return options[Math.floor(random() * options.length)];
}

// ---- Streaks and praise ----

const STREAK_CALLOUTS = {
  5: 'SMOOTH!',
  10: 'BUTTERY!',
  15: 'SILKY SPIN!',
  20: 'DOOR WHISPERER!',
  30: 'ONE WITH THE DOOR',
  40: 'LEGENDARY!',
};

/** Big call-out for a run of happy deliveries, or null. Past 40, every 10 more. */
function streakCallout(streak) {
  if (STREAK_CALLOUTS[streak]) return STREAK_CALLOUTS[streak];
  if (streak > 40 && streak % 10 === 0) return `UNSTOPPABLE ×${streak}`;
  return null;
}

// Small line floating up from someone who leaves happy (sometimes).
const HAPPY_LINES = {
  officeWorker: ['THANKS!', 'SMOOTH.', 'NICE SPIN'],
  manager: ['ON TIME!', 'ACCEPTABLE.', 'SYNERGY!'],
  intern: ['LATTES INTACT!', 'NOT ONE DROP!', 'PHEW!'],
  courier: ['SIGNED FOR!', 'DELIVERED!', 'NEAT.'],
};

// ---- Doorman rank on the end screen ----

function doormanRank(game) {
  const delivered = game.deliveredCount;
  if (game.endReason === 'madeIt') {
    if (game.complaintCount === 0 && delivered >= 60) return 'DOORMAN OF THE MONTH';
    if (delivered >= 75) return 'LORD OF THE LOBBY';
    if (delivered >= 55) return 'SPIN DOCTOR';
    return 'SURVIVOR OF MONDAY';
  }
  if (delivered < 10) return 'HUMAN DOORSTOP';
  if (delivered < 25) return 'REVOLVING ROOKIE';
  if (delivered < 45) return 'HINGE APPRENTICE';
  return 'SPIN DOCTOR (FORMER)';
}

/** "Intern · too fast · 64 °/s (max 60)" for the strike log on the end screen. */
function describeComplaint(entry) {
  const type = PERSON_TYPES[entry.typeKey];
  const who = entry.rareName ? entry.rareName.replace(/^./, (c) => c.toUpperCase()) : displayNameFor(entry.typeKey);
  if (entry.reason === 'breach') return [who, 'got into the lobby'];
  if (entry.reason === 'tooFast') return [who, `too fast: ${Math.round(entry.speed)} °/s (max ${type.comfortMaxSpeed})`];
  return [who, `too slow: under ${type.comfortMinSpeed} °/s for 1.5 s`];
}

// ---- The pigeon ----
// Every so often a pigeon lands on the tip of a wing and rides the door around.
// Spin above PIGEON_PANIC_SPEED and it flaps off in a cloud of feathers.

const PIGEON_PANIC_SPEED = 95;

function createPigeon() {
  return { state: 'away', timer: 14 + Math.random() * 16, x: -30, y: 80, wing: 0, age: 0, facing: 0 };
}

function updatePigeon(fx, pigeon, dt, doorAngle, doorSpeed, canAppear) {
  pigeon.age += dt;
  pigeon.timer -= dt;
  const perch = pointAroundDoor(doorAngle + pigeon.wing * 90, DOOR_RADIUS * 0.8);
  switch (pigeon.state) {
    case 'away':
      if (pigeon.timer <= 0 && canAppear && doorSpeed < 70) {
        const fromLeft = Math.random() < 0.5;
        Object.assign(pigeon, { state: 'flyingIn', x: fromLeft ? -30 : CANVAS_WIDTH + 30, y: 40 + Math.random() * 200, wing: Math.floor(Math.random() * 4), age: 0 });
      }
      break;
    case 'flyingIn': {
      const speed = (170 + 110 * clamp(pigeon.age / 1.6, 0, 1)) * dt;
      const dx = perch.x - pigeon.x;
      const dy = perch.y - pigeon.y;
      const distance = Math.hypot(dx, dy);
      pigeon.facing = Math.atan2(dy, dx);
      if (distance < Math.max(4, speed)) {
        Object.assign(pigeon, { state: 'riding', age: 0, timer: 7 + Math.random() * 5 });
        fx.addFloater('coo.', perch.x + 10, perch.y - 14, { color: PALETTE.inkSoft, size: 11 });
      } else {
        pigeon.x += (dx / distance) * speed;
        pigeon.y += (dy / distance) * speed;
      }
      break;
    }
    case 'riding':
      pigeon.x = perch.x;
      pigeon.y = perch.y;
      pigeon.facing = canvasRotationForGameAngle(doorAngle + pigeon.wing * 90 + 90);
      if (doorSpeed > PIGEON_PANIC_SPEED || pigeon.timer <= 0) {
        const isPanic = doorSpeed > PIGEON_PANIC_SPEED;
        if (isPanic) {
          for (let i = 0; i < 8; i++) fx.addParticle('feather', pigeon.x, pigeon.y, 90, { life: 1.6, size: 4 });
          fx.addFloater('COO!!', pigeon.x, pigeon.y - 16, { color: PALETTE.danger, size: 13 });
        }
        const exitAngle = Math.random() * Math.PI * 2;
        Object.assign(pigeon, { state: 'flyingOff', age: 0, exitX: Math.cos(exitAngle), exitY: Math.sin(exitAngle) - 0.6, speed: isPanic ? 330 : 190 });
      }
      break;
    case 'flyingOff':
      pigeon.x += pigeon.exitX * pigeon.speed * dt;
      pigeon.y += pigeon.exitY * pigeon.speed * dt;
      pigeon.facing = Math.atan2(pigeon.exitY, pigeon.exitX);
      if (pigeon.x < -40 || pigeon.x > CANVAS_WIDTH + 40 || pigeon.y < -40 || pigeon.y > CANVAS_HEIGHT + 40) {
        Object.assign(pigeon, createPigeon(), { timer: 25 + Math.random() * 25 });
      }
      break;
  }
}

// ---- Weather ----
// Some rounds get a short passing shower in the middle. Umbrellas pop open on the
// street, puddles ripple. The lobby, being indoors, stays dry.

function createWeather() {
  const hasShower = Math.random() < 0.55;
  const start = 50 + Math.random() * 70;
  return { rain: 0, showerStart: hasShower ? start : Infinity, showerEnd: hasShower ? start + 10 + Math.random() * 6 : Infinity, announced: false };
}

function updateWeather(fx, weather, dt, game) {
  const t = game.secondsElapsed;
  const isRaining = game.phase === 'playing' && t >= weather.showerStart && t < weather.showerEnd;
  weather.rain += ((isRaining ? 1 : 0) - weather.rain) * Math.min(1, dt * 1.5);
  if (isRaining && !weather.announced) {
    weather.announced = true;
    fx.showBanner('A LITTLE RAIN', 'Of course. It’s Monday.', '#5b8de0');
  }
}

// ---- Troublemakers (Rush mode) ----
// Three flavors of the same rule: keep them out with ↓ until they give up.

const TROUBLE_KINDS = {
  salesperson: {
    name: 'a pushy salesperson',
    breach: ['GOT A MINUTE FOR SOLAR?', 'WHO’S IN CHARGE HERE?'],
    turnedAway: ['FINE. I’LL TRY THE BANK.', 'YOU’LL REGRET THIS DEAL!'],
  },
  pickpocket: {
    name: 'a pickpocket',
    breach: ['NICE LOBBY... NICE WALLETS.', 'DON’T MIND ME!'],
    turnedAway: ['WORTH A SHOT.', 'I WAS NEVER HERE.'],
  },
  kid: {
    name: 'a kid who just wants to spin',
    breach: ['WHEEEEE!', 'AGAIN! AGAIN!'],
    turnedAway: ['AWW, MOM!', 'BORING DOOR!'],
  },
};
const TROUBLE_KIND_KEYS = Object.keys(TROUBLE_KINDS);

function pickTroubleKind(random) {
  return TROUBLE_KIND_KEYS[Math.floor(random() * TROUBLE_KIND_KEYS.length)];
}

function randomLine(lines) {
  return lines[Math.floor(Math.random() * lines.length)];
}
