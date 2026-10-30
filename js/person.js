// person.js
// Passenger types (data) and the Person class (one passenger's state).
//
// To add a passenger type, add an entry to PERSON_TYPES. Nothing else needs to
// change: spawning reads the weights, Door reads takesWholeCompartment, and
// complaints read the comfort range.

const PERSON_TYPES = {
  // The office worker is the most common type and is comfortable at almost any
  // speed (30–120). Without them, every arrival is a manager or an intern and
  // the game is far harder than designed (simulated careful player: 4/40 rounds
  // survived with only managers and interns, 30/40 with this mix).
  officeWorker: {
    displayName: 'Office worker',
    label: 'W',
    color: '#5f6b7a',
    comfortMinSpeed: 30,
    comfortMaxSpeed: 120,
    streetSpawnWeight: 55,
    lobbySpawnWeight: 70,
    takesWholeCompartment: false,
    complaintLines: {
      tooFast: ['WATCH IT!', 'MY PHONE!', 'I JUST GOT THIS SHIRT!'],
      tooSlow: ['ANY DAY NOW...', 'I HAVE A STANDUP!', 'IS IT BROKEN?'],
    },
  },
  // The Late manager and the Coffee intern are the CORE CONFLICT of the game (SPEC 2.5):
  // their comfort ranges do not overlap, so no door speed keeps both of them happy.
  manager: {
    displayName: 'Late manager',
    label: 'M',
    color: '#2f4b8f',
    comfortMinSpeed: 70,    // °/s
    comfortMaxSpeed: 170,
    streetSpawnWeight: 20,  // relative weights, not percentages; only the ratio matters
    lobbySpawnWeight: 0,
    takesWholeCompartment: false,
    complaintLines: {
      tooFast: ['MY HAIR!', 'DO YOU KNOW WHO I AM?', 'THIS SUIT IS ITALIAN!'],
      tooSlow: ['I HAVE A 9 AM!', 'TIME IS MONEY!', 'IS THIS DOOR UNIONIZED?'],
    },
  },
  intern: {
    displayName: 'Coffee intern',
    label: 'I',
    color: '#d9a12b',
    comfortMinSpeed: 20,
    comfortMaxSpeed: 60,
    streetSpawnWeight: 15,
    lobbySpawnWeight: 0,
    takesWholeCompartment: false,
    complaintLines: {
      tooFast: ['MY LATTE!', 'THAT WAS SIX ORDERS!', 'OAT MILK EVERYWHERE!'],
      tooSlow: ['THE FOAM IS DYING!', "THEY'RE GETTING COLD!", 'MY BOSS IS WAITING!'],
    },
  },
  // The courier's cart fills a whole compartment (SPEC 2.4). A courier at the front
  // of a queue waits for an EMPTY compartment, and so does everyone behind them.
  courier: {
    displayName: 'Courier',
    label: 'C',
    color: '#d2502e',
    comfortMinSpeed: 15,
    comfortMaxSpeed: 70,
    streetSpawnWeight: 10,
    lobbySpawnWeight: 30,
    takesWholeCompartment: true,
    complaintLines: {
      tooFast: ['MY PACKAGES!', 'THAT SAID FRAGILE!', 'SIGN FOR THAT, I DARE YOU'],
      tooSlow: ["I'M PAID PER STOP!", 'COME ON, COME ON...', "I'M DOUBLE-PARKED!"],
    },
  },
  // Rush mode only (not in the original spec): someone who should NOT get in.
  // Hold ↓ while they're at the front of the street line and they give up and
  // leave. If one steps into the door it's a security strike. Any speed suits
  // them, so they never complain about the door and never narrow the SAFE ZONE.
  troublemaker: {
    displayName: 'Troublemaker',
    label: 'X',
    color: '#8a3fc2',
    comfortMinSpeed: 0,
    comfortMaxSpeed: DOOR_MAX_SPEED,
    streetSpawnWeight: 0,   // never picked by the normal spawner; Rush adds them separately
    lobbySpawnWeight: 0,
    takesWholeCompartment: false,
    isTroublemaker: true,
    complaintLines: { tooFast: ['WHEEE!'], tooSlow: ['...'] },   // unused: every speed suits them
  },
};

/**
 * Picks a random type key for the given side, using the spawn weights.
 * mix (optional): { typeKey: weight } to use instead of the types' own weights,
 * e.g. a part of the round's streetMix from STREET_SPAWN_RAMP.
 */
function pickPersonTypeKey(side, randomNumber, mix) {
  const weightField = side === 'street' ? 'streetSpawnWeight' : 'lobbySpawnWeight';
  const weightOf = (key) => (mix ? mix[key] || 0 : PERSON_TYPES[key][weightField]);
  const typeKeys = Object.keys(PERSON_TYPES).filter((key) => weightOf(key) > 0);
  if (typeKeys.length === 0) {
    throw new Error(`No passenger type has ${weightField} > 0. Add one to PERSON_TYPES before spawning on the ${side} side.`);
  }
  const totalWeight = typeKeys.reduce((sum, key) => sum + weightOf(key), 0);
  let remaining = randomNumber * totalWeight;
  for (const key of typeKeys) {
    remaining -= weightOf(key);
    if (remaining < 0) return key;
  }
  return typeKeys[typeKeys.length - 1];
}

/**
 * The door speeds that keep EVERY one of these people comfortable: the overlap of
 * their comfort ranges, as { min, max }. Returns null when nobody is given, and
 * { min, max, isEmpty: true } when no speed works for all of them (e.g. a manager
 * and an intern). The speed meter's SAFE ZONE and NO SAFE SPEED come from this.
 */
function sharedComfortRange(people) {
  if (people.length === 0) return null;
  const min = Math.max(...people.map((p) => p.type.comfortMinSpeed));
  const max = Math.min(...people.map((p) => p.type.comfortMaxSpeed));
  return { min, max, isEmpty: min > max };
}

let nextPersonId = 1;

class Person {
  /**
   * @param {string} typeKey  a key of PERSON_TYPES
   * @param {'street'|'lobby'} fromSide  the side this person queued on
   */
  constructor(typeKey, fromSide) {
    this.id = nextPersonId++;
    this.typeKey = typeKey;
    this.type = PERSON_TYPES[typeKey];
    this.fromSide = fromSide;
    // Lifecycle: 'queued' -> 'riding' -> 'exiting' -> removed from the game.
    this.state = 'queued';
    this.compartmentIndex = null;   // set by Door.addRider while riding
    this.secondsUntilReady = 0;     // still walking up to the line; can't step in until 0
    this.secondsTooSlow = 0;        // how long the door has been below this person's range, in a row
    this.hasComplained = false;     // each person complains at most once (SPEC 2.6)
    this.complaintReason = null;    // 'tooFast' | 'tooSlow' once they have complained
    this.patienceLeft = TROUBLEMAKER_PATIENCE_SECONDS;   // troublemakers only: held at the front this long, they leave
    this.isVip = false;             // Rush: tips big for a smooth ride
    this.wasImpatient = false;      // Rush: went yellow at some point during the ride
    // Pixel position, ONLY used while 'exiting'. Queued and riding people are
    // positioned by their queue index / door angle at draw time instead.
    this.x = 0;
    this.y = 0;
  }

  /** The opening this person leaves through: the opposite one from where they came in. */
  get exitOpeningAngle() {
    return this.fromSide === 'street' ? LOBBY_OPENING_ANGLE : STREET_OPENING_ANGLE;
  }

  /**
   * Applies the complaint rules from SPEC 2.6 for one frame. Call only while riding.
   * Returns true on exactly the frame this person complains, false otherwise.
   */
  updateComfort(doorSpeed, dt) {
    if (this.hasComplained) return false;

    if (doorSpeed > this.type.comfortMaxSpeed) {
      // Too fast: the wing hits them, so the complaint is immediate.
      this.hasComplained = true;
      this.complaintReason = 'tooFast';
      return true;
    }
    if (doorSpeed < this.type.comfortMinSpeed) {
      this.secondsTooSlow += dt;
      if (this.secondsTooSlow > TOO_SLOW_GRACE_SECONDS) {
        this.hasComplained = true;
        this.complaintReason = 'tooSlow';
        return true;
      }
      return false;
    }
    this.secondsTooSlow = 0;   // back inside the range resets the "too slow" timer
    return false;
  }

  /** 'furious' (complained), 'impatient' (too-slow timer running) or 'comfortable'. Drives the mood ring. */
  get mood() {
    if (this.hasComplained) return 'furious';
    if (this.secondsTooSlow > 0) return 'impatient';
    return 'comfortable';
  }
}
