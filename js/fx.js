// fx.js
// The visual-only layer: everything that moves on screen but is not a rule.
// People walking up to their place in line, gliding into the door, walking off;
// speech bubbles, coffee splashes, screen shake, the gate belts, hints, and the
// street life in the background.
//
// Fx reads the game and the events it emits (game.takeEvents()) and keeps its
// OWN state. It never changes the game, so the rules (and the tests) behave the
// same with or without it. render/*.js reads both the game and this object.

const ENTER_GLIDE_SECONDS = 0.18;       // queue spot -> compartment
const QUEUE_WALK_SPEED = 260;           // px/s while catching up to a place in line
const EXIT_WALK_SPEED_FX = 125;         // px/s walking away from the door
const BUBBLE_SECONDS = 1.9;
const HINT_SECONDS = 4.8;
const MAX_PARTICLES = 320;
const MAX_DECALS = 24;

class Fx {
  constructor() {
    this.time = 0;
    this.hintsShown = new Set();   // once per page load; never saved (SPEC §5: no saving)
    this.reducedMotion = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
    this.ambientPeople = [];
    this.cars = [];
    this.secondsUntilPedestrian = 0;
    this.secondsUntilCar = 0.5;
    this.titleDoorAngle = 18;
    // Kept across rounds for this page load only (SPEC §5: nothing is saved).
    this.bestDelivered = 0;
    this.sightingsEver = new Set();
    this.pigeon = createPigeon();
    this.resetRound();
  }

  /** Clears everything that belongs to one round. Street life keeps going. */
  resetRound() {
    this.visuals = new Map();          // person.id -> that person's visual state
    this.walkers = [];                 // people walking away from the door
    this.particles = [];
    this.decals = [];                  // coffee stains etc. that stay for the round
    this.bubbles = [];
    this.shake = 0;
    this.strikesStamped = 0;
    this.strikeStampAge = [Infinity, Infinity, Infinity];
    this.strikeNote = null;            // { entry, number, age }: why the latest strike happened
    this.deliveredBounce = 0;
    this.gateAmount = { street: 0, lobby: 0 };   // 0 = belt open, 1 = closed
    this.endScreenAge = 0;
    this.roundAge = 0;
    this.clockFlip = { age: Infinity, fromText: '8:55' };
    this.lastClockText = '8:55';
    this.hint = null;
    this.floaters = [];                // little words drifting up ("+1", "LATTES INTACT!")
    this.banner = null;                // top-of-screen announcement (rare sighting, rain)
    this.happyStreak = 0;              // happy deliveries since the last complaint
    this.streakCallout = null;
    this.complaintLog = [];            // for the strike log on the end screen
    this.sightings = [];               // rare characters seen this round
    this.lastComplaintAge = Infinity;
    this.cheerAge = Infinity;          // everyone bounces when the clock hits 9:00
    this.isNewBest = false;
    this.weather = createWeather();
    this.hasAnnouncedTrouble = false;
  }

  /** Per-person look and motion. Created the first time a person is seen. */
  visualOf(person) {
    let visual = this.visuals.get(person.id);
    if (!visual) {
      const random = seededRandom(person.id * 7919 + 13);
      visual = {
        x: DOOR_CENTER_X,
        y: DOOR_CENTER_Y,
        facing: 0,
        look: {
          ...makeLook(random),
          rare: pickRareLook(person.typeKey, random),
          trouble: person.type.isTroublemaker ? pickTroubleKind(random) : null,
        },
        walkPhase: random() * 10,
        spinAge: Infinity,             // a rider who gets hit spins round once
        hopAge: Infinity,              // a happy leaver hops
        isWalking: false,
        queueDistance: null,
        enterAge: Infinity,
        enterFrom: null,
        distanceFactor: null,
        alpha: 1,
      };
      this.visuals.set(person.id, visual);
    }
    return visual;
  }

  update(dt, game, events, controls) {
    this.time += dt;
    for (const event of events) this.handleEvent(event, game);
    if (game.phase === 'paused') return;   // the whole picture holds still while paused

    this.roundAge += dt;
    if (game.phase === 'ended') this.endScreenAge += dt;
    if (game.phase === 'title') this.titleDoorAngle = (this.titleDoorAngle + 24 * dt) % 360;

    this.updateQueues(dt, game);
    this.updateRiders(dt, game);
    this.updateWalkers(dt);
    this.updateParticles(dt);
    this.updateAmbient(dt, game);

    this.bubbles = this.bubbles.filter((bubble) => (bubble.age += dt) < BUBBLE_SECONDS);
    this.shake *= Math.exp(-9 * dt);
    this.deliveredBounce = Math.max(0, this.deliveredBounce - dt * 3);
    for (let i = 0; i < 3; i++) this.strikeStampAge[i] += dt;
    if (this.strikeNote) this.strikeNote.age += dt;

    for (const side of ['street', 'lobby']) {
      const isHeld = game.phase === 'playing' && (side === 'street' ? controls.isStreetGateHeld : controls.isLobbyGateHeld);
      const target = isHeld ? 1 : 0;
      this.gateAmount[side] += (target - this.gateAmount[side]) * Math.min(1, dt * 14);
    }

    const clockText = game.clockText();
    if (clockText !== this.lastClockText) {
      this.clockFlip = { age: 0, fromText: this.lastClockText };
      this.lastClockText = clockText;
    }
    this.clockFlip.age += dt;

    this.updateHints(dt, game);
    this.updateFlourishes(dt, game);
  }

  /** Floaters, banners, streak call-outs, the pigeon and the weather. */
  updateFlourishes(dt, game) {
    for (const floater of this.floaters) {
      floater.age += dt;
      floater.y -= 26 * dt;
    }
    this.floaters = this.floaters.filter((floater) => floater.age < floater.life);
    if (this.banner && (this.banner.age += dt) > 3) this.banner = null;
    if (this.streakCallout && (this.streakCallout.age += dt) > 1.8) this.streakCallout = null;
    this.lastComplaintAge += dt;
    this.cheerAge += dt;

    const isTitle = game.phase === 'title';
    const doorAngle = isTitle ? this.titleDoorAngle : game.door.angle;
    const doorSpeed = isTitle ? 24 : game.door.speed;
    updatePigeon(this, this.pigeon, dt, doorAngle, doorSpeed, isTitle || game.phase === 'playing');
    updateWeather(this, this.weather, dt, game);
  }

  addFloater(text, x, y, options = {}) {
    this.floaters.push({ text, x, y, age: 0, life: options.life ?? 1.2, color: options.color ?? PALETTE.safe, size: options.size ?? 12 });
  }

  showBanner(title, subtitle, color) {
    this.banner = { title, subtitle, color, age: 0 };
  }

  handleEvent(event, game) {
    switch (event.type) {
      case 'roundStarted':
        this.resetRound();
        break;
      case 'spawned': {
        const visual = this.visualOf(event.person);
        visual.queueDistance = queueArrivalDistance(event.person.fromSide);
        // Walk so they reach the front spot just as the rules let them step in.
        visual.arrivalSpeed = event.person.secondsUntilReady > 0
          ? visual.queueDistance / event.person.secondsUntilReady
          : QUEUE_WALK_SPEED;
        const start = pointOnQueuePath(event.person.fromSide, visual.queueDistance);
        visual.x = start.x;
        visual.y = start.y;
        if (event.person.type.isTroublemaker && !this.hasAnnouncedTrouble) {
          this.hasAnnouncedTrouble = true;
          this.showBanner('TROUBLE INCOMING', 'Hold \u2193 while they\u2019re at the front of the line.', '#8a3fc2');
        }
        const rare = visual.look.rare;
        if (rare) {
          this.sightings.push(rare.name);
          const isFirstEver = !this.sightingsEver.has(rare.key);
          this.sightingsEver.add(rare.key);
          this.showBanner(isFirstEver ? 'RARE SIGHTING!' : 'LOOK WHO IT IS', `Here comes ${rare.name}.`, PALETTE.brass);
        }
        break;
      }
      case 'entered': {
        const visual = this.visualOf(event.person);
        visual.enterFrom = { x: visual.x, y: visual.y };
        visual.enterAge = 0;
        visual.distanceFactor = null;
        break;
      }
      case 'exited': {
        const visual = this.visualOf(event.person);
        this.walkers.push({
          person: event.person,
          visual,
          path: exitPathFrom({ x: visual.x, y: visual.y }, event.person.fromSide),
          segment: 0,
          speed: EXIT_WALK_SPEED_FX * (event.person.typeKey === 'manager' ? 1.35 : 1),
        });
        if (event.person.type.isTroublemaker) {
          this.addFloater('uh oh...', visual.x, visual.y - 18, { color: '#8a3fc2', size: 12 });
          break;
        }
        this.deliveredBounce = 1;
        if (!event.person.hasComplained) this.onHappyDelivery(event.person, visual);
        break;
      }
      case 'complained':
        this.complaintLog.push({ typeKey: event.person.typeKey, reason: event.reason, speed: game.door.speed, rareName: this.visualOf(event.person).look.rare?.name });
        this.onComplaint(event.person, event.reason);
        this.noteStrike(game);
        break;
      case 'breach':
        this.onBreach(event.person);
        this.noteStrike(game);
        break;
      case 'turnedAway': {
        const visual = this.visualOf(event.person);
        const kind = TROUBLE_KINDS[visual.look.trouble];
        this.bubbles.push({ person: event.person, visual, text: randomLine(kind.turnedAway), age: 0, tone: 'calm' });
        this.addFloater('KEPT OUT!', visual.x + 40, visual.y - 50, { color: '#8a3fc2', size: 15, life: 1.4 });
        for (let i = 0; i < 14; i++) {
          this.addParticle('confetti', visual.x, visual.y, 140, { life: 0.9, size: 3, color: i % 2 ? '#8a3fc2' : PALETTE.brass });
        }
        // They step over the belt and stomp off along the sidewalk.
        this.walkers.push({
          person: event.person,
          visual,
          path: [{ x: visual.x, y: visual.y }, { x: visual.x + 50, y: visual.y + 16 }, { x: CANVAS_WIDTH + 30, y: visual.y + 16 }],
          segment: 0,
          speed: 110,
        });
        break;
      }
      case 'roundEnded':
        this.endScreenAge = 0;
        this.isNewBest = game.deliveredCount > this.bestDelivered && this.bestDelivered > 0;
        this.bestDelivered = Math.max(this.bestDelivered, game.deliveredCount);
        if (event.reason === 'madeIt') {
          this.burstConfetti();
          this.cheerAge = 0;
        }
        break;
    }
  }

  // ---- People ----

  updateQueues(dt, game) {
    for (const queue of [game.streetQueue, game.lobbyQueue]) {
      let previousDistance = -Infinity;
      queue.people.forEach((person, placeInLine) => {
        const visual = this.visualOf(person);
        const target = placeInLine * QUEUE_SPACING;
        if (visual.queueDistance === null) visual.queueDistance = target;
        const gap = visual.queueDistance - target;
        let moved = 0;
        if (gap > 0) {
          const speed = gap > 50 ? (visual.arrivalSpeed ?? QUEUE_WALK_SPEED) : 40 + gap * 4.4;
          moved = Math.min(gap, speed * dt);
          visual.queueDistance -= moved;
        }
        // Never walk into the person ahead (a fast arrival can catch up with a slow one).
        visual.queueDistance = Math.max(visual.queueDistance, previousDistance + QUEUE_SPACING * 0.85);
        previousDistance = visual.queueDistance;

        visual.isWalking = moved > 0.05;
        if (visual.isWalking) visual.walkPhase += dt * 13;
        const point = pointOnQueuePath(queue.side, visual.queueDistance);
        visual.x = point.x;
        visual.y = point.y;
        // Fidget: waiting people shift their weight a little.
        const fidget = visual.isWalking ? 0 : Math.sin(this.time * 0.9 + person.id * 1.7) * 0.12;
        visual.facing = point.heading + fidget;
      });
    }
  }

  updateRiders(dt, game) {
    const door = game.door;
    door.compartments.forEach((riders, compartmentIndex) => {
      const centerAngle = door.compartmentCenterAngle(compartmentIndex);
      riders.forEach((person, placeInCompartment) => {
        const visual = this.visualOf(person);
        const targetFactor = riderDistanceFactor(riders.length, placeInCompartment, person);
        // When one of two riders leaves, the other slides over instead of jumping.
        visual.distanceFactor = visual.distanceFactor === null
          ? targetFactor
          : lerp(visual.distanceFactor, targetFactor, Math.min(1, dt * 9));
        const seat = pointAroundDoor(centerAngle, DOOR_RADIUS * visual.distanceFactor);
        if (visual.enterAge < ENTER_GLIDE_SECONDS && visual.enterFrom) {
          const t = easeInOutCubic(visual.enterAge / ENTER_GLIDE_SECONDS);
          visual.x = lerp(visual.enterFrom.x, seat.x, t);
          visual.y = lerp(visual.enterFrom.y, seat.y, t);
          visual.isWalking = true;
          visual.walkPhase += dt * 14;
        } else {
          visual.x = seat.x;
          visual.y = seat.y;
          visual.isWalking = door.speed > 8;
          visual.walkPhase += dt * door.speed * 0.09;
        }
        visual.enterAge += dt;
        // Riders face the way the door turns (counterclockwise = +90° from their angle).
        visual.facing = canvasRotationForGameAngle(centerAngle + 90);
        if (visual.spinAge < 0.6) visual.facing += easeOutCubic(visual.spinAge / 0.6) * Math.PI * 2;
        visual.spinAge += dt;
        // Near miss: the door came within a hair of their top speed and backed off in time.
        const topSpeed = person.type.comfortMaxSpeed;
        if (!person.hasComplained && !visual.hadCloseCall) {
          if (door.speed > topSpeed - 3) visual.isCloseCall = true;
          else if (visual.isCloseCall && door.speed < topSpeed - 12) {
            visual.hadCloseCall = true;
            this.addFloater('CLOSE ONE!', visual.x, visual.y - 22, { color: '#d98a12', size: 13, life: 1.3 });
          }
        }
      });
    });
  }

  updateWalkers(dt) {
    for (const walker of this.walkers) {
      let distanceLeft = walker.speed * dt;
      const visual = walker.visual;
      while (distanceLeft > 0 && walker.segment < walker.path.length - 1) {
        const target = walker.path[walker.segment + 1];
        const dx = target.x - visual.x;
        const dy = target.y - visual.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 0.01) visual.facing = Math.atan2(dy, dx);
        if (distance <= distanceLeft) {
          visual.x = target.x;
          visual.y = target.y;
          distanceLeft -= distance;
          walker.segment += 1;
        } else {
          visual.x += (dx / distance) * distanceLeft;
          visual.y += (dy / distance) * distanceLeft;
          distanceLeft = 0;
        }
      }
      visual.isWalking = true;
      visual.walkPhase += dt * 12;
      visual.hopAge += dt;
    }
    this.walkers = this.walkers.filter((walker) => walker.segment < walker.path.length - 1);
  }

  // ---- Happy deliveries ----

  onHappyDelivery(person, visual) {
    visual.hopAge = 0;
    this.happyStreak += 1;
    this.addFloater('+1', visual.x, visual.y - 16, { color: PALETTE.safe, size: 15 });
    for (let i = 0; i < 2; i++) this.addParticle('heart', visual.x, visual.y - 10, 30, { life: 1.1, size: 4 });
    if (Math.random() < 0.3) {
      const lines = HAPPY_LINES[person.typeKey];
      this.addFloater(lines[Math.floor(Math.random() * lines.length)], visual.x, visual.y - 32, { color: PALETTE.inkSoft, size: 10, life: 1.4 });
    }
    const callout = streakCallout(this.happyStreak);
    if (callout) this.streakCallout = { text: callout, streak: this.happyStreak, age: 0 };
  }

  /** A troublemaker got into the door. Treated like a complaint: strike, shake, bubble. */
  onBreach(person) {
    const visual = this.visualOf(person);
    const kind = TROUBLE_KINDS[visual.look.trouble];
    this.complaintLog.push({ typeKey: 'troublemaker', reason: 'breach', speed: 0, rareName: kind.name });
    this.bubbles.push({ person, visual, text: randomLine(kind.breach), age: 0 });
    this.showBanner('SECURITY!', `${kind.name.replace(/^./, (c) => c.toUpperCase())} got in.`, PALETTE.danger);
    this.happyStreak = 0;
    this.lastComplaintAge = 0;
    if (!this.reducedMotion) this.shake = Math.max(this.shake, 6);
    if (this.strikesStamped < 3) this.strikeStampAge[this.strikesStamped] = 0;
    this.strikesStamped += 1;
  }

  // ---- Complaints ----

  /** Shows why the strike that was just logged happened (not in practice, where strikes don't count). */
  noteStrike(game) {
    if (game.mode === 'tutorial') return;
    const entry = this.complaintLog[this.complaintLog.length - 1];
    this.strikeNote = { entry, number: Math.min(game.complaintCount, MAX_COMPLAINTS), age: 0 };
  }

  onComplaint(person, reason) {
    const visual = this.visualOf(person);
    const rareLines = visual.look.rare?.lines?.[reason];
    const critterLines = isCritterLook() ? CRITTER_LINES[person.typeKey]?.[reason] : null;
    const lines = rareLines ?? critterLines ?? person.type.complaintLines[reason] ?? person.type.complaintLines.tooFast;
    this.bubbles.push({ person, visual, text: lines[Math.floor(Math.random() * lines.length)], age: 0 });
    this.happyStreak = 0;
    this.lastComplaintAge = 0;
    if (reason === 'tooFast') visual.spinAge = 0;

    if (!this.reducedMotion) this.shake = Math.max(this.shake, reason === 'tooFast' ? 7 : 4);
    if (this.strikesStamped < 3) this.strikeStampAge[this.strikesStamped] = 0;
    this.strikesStamped += 1;

    const { x, y } = visual;
    if (reason === 'tooSlow') {
      // Too slow: a puff of steam out of their ears.
      for (let i = 0; i < 10; i++) this.addParticle('puff', x, y - 6, 40, { size: 4 + Math.random() * 4, life: 0.9 });
      return;
    }
    switch (person.typeKey) {
      case 'intern':
        for (let i = 0; i < 6; i++) this.addParticle('cup', x, y, 150, { life: 1.4, size: 4 });
        for (let i = 0; i < 26; i++) this.addParticle('drop', x, y, 190, { life: 0.7 + Math.random() * 0.5, size: 1.5 + Math.random() * 2.5 });
        this.addDecal('coffee', x, y);
        break;
      case 'manager':
        for (let i = 0; i < 12; i++) this.addParticle('paper', x, y, 130, { life: 1.6, size: 6 });
        break;
      case 'courier':
        for (let i = 0; i < 5; i++) this.addParticle('box', x, y, 120, { life: 1.5, size: 6 + Math.random() * 3 });
        break;
      default:
        this.addParticle('phone', x, y, 170, { life: 1.2, size: 5 });
        for (let i = 0; i < 6; i++) this.addParticle('spark', x, y, 120, { life: 0.4, size: 5 });
    }
  }

  addParticle(kind, x, y, speed, options = {}) {
    if (this.particles.length >= MAX_PARTICLES) return;
    const angle = Math.random() * Math.PI * 2;
    const velocity = speed * (0.35 + Math.random() * 0.65);
    this.particles.push({
      kind,
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 12,
      age: 0,
      life: options.life ?? 1,
      size: options.size ?? 4,
      color: options.color,
    });
  }

  addDecal(kind, x, y) {
    const random = seededRandom(Math.floor(x * 31 + y * 17 + this.time * 1000));
    const blobs = [];
    for (let i = 0; i < 9; i++) {
      const angle = random() * Math.PI * 2;
      const distance = random() * 13;
      blobs.push({ x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, r: 3 + random() * 7 });
    }
    this.decals.push({ kind, x, y, blobs, age: 0 });
    if (this.decals.length > MAX_DECALS) this.decals.shift();
  }

  burstConfetti() {
    const colors = [PALETTE.brass, PALETTE.safe, '#5b8de0', '#e25c8a', PALETTE.warning];
    for (let i = 0; i < 120; i++) {
      this.addParticle('confetti', CANVAS_WIDTH / 2 + (Math.random() - 0.5) * 300, 40, 260, {
        life: 2.4 + Math.random(),
        size: 4 + Math.random() * 3,
        color: colors[i % colors.length],
      });
    }
  }

  updateParticles(dt) {
    for (const particle of this.particles) {
      particle.age += dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      const drag = particle.kind === 'confetti' ? 1.2 : 3.2;
      particle.vx *= Math.exp(-drag * dt);
      particle.vy *= Math.exp(-drag * dt);
      if (particle.kind === 'confetti') particle.vy += 60 * dt;   // the one thing that "falls" in a top-down world
      if (particle.kind === 'puff') particle.vy -= 30 * dt;
      if (particle.kind === 'feather') particle.rotation += Math.sin(particle.age * 6) * dt * 3;
      particle.rotation += particle.spin * dt * Math.exp(-particle.age * 2);
    }
    this.particles = this.particles.filter((particle) => particle.age < particle.life);
    for (const decal of this.decals) decal.age += dt;
  }

  // ---- Street life (scenery only; these people never join a queue) ----

  updateAmbient(dt, game) {
    const isRush = game.phase === 'playing' && game.secondsElapsed >= FINAL_MINUTE_STARTS_AT;
    this.secondsUntilPedestrian -= dt;
    if (this.secondsUntilPedestrian <= 0) {
      const direction = Math.random() < 0.5 ? 1 : -1;
      const random = seededRandom(Math.floor(Math.random() * 1e9));
      this.ambientPeople.push({
        x: direction > 0 ? -20 : CANVAS_WIDTH + 20,
        y: 575 + Math.random() * 8,
        direction,
        speed: (isRush ? 75 : 48) + Math.random() * 30,
        look: makeLook(random),
        walkPhase: Math.random() * 10,
        hasUmbrella: Math.random() < 0.12,
        opensUmbrellaInRain: Math.random() < 0.75,
        hasDog: Math.random() < 0.1,
        umbrellaColor: ['#2f4b8f', '#e2453c', '#1f2430', '#f2b51d', '#36b368'][Math.floor(Math.random() * 5)],
      });
      this.secondsUntilPedestrian = (isRush ? 0.55 : 2.1) * (0.6 + Math.random() * 0.8);
    }
    for (const walker of this.ambientPeople) {
      walker.x += walker.direction * walker.speed * dt;
      walker.walkPhase += dt * walker.speed * 0.17;
    }
    this.ambientPeople = this.ambientPeople.filter((walker) => walker.x > -40 && walker.x < CANVAS_WIDTH + 40);

    this.secondsUntilCar -= dt;
    if (this.secondsUntilCar <= 0) {
      const direction = Math.random() < 0.5 ? 1 : -1;
      this.cars.push({
        x: direction > 0 ? -60 : CANVAS_WIDTH + 60,
        y: direction > 0 ? 607 : 629,
        direction,
        speed: 170 + Math.random() * 90,
        color: Math.random() < 0.35 ? '#f2c230' : ['#c8ccd2', '#3f5a85', '#8e2f2f', '#2e2f33', '#e8e4dc'][Math.floor(Math.random() * 5)],
        length: 40 + Math.random() * 8,
      });
      this.secondsUntilCar = 2.2 + Math.random() * 3.5;
    }
    for (const car of this.cars) car.x += car.direction * car.speed * dt;
    this.cars = this.cars.filter((car) => car.x > -80 && car.x < CANVAS_WIDTH + 80);
  }

  // ---- Hints (first round of a page load) ----

  updateHints(dt, game) {
    if (game.mode === 'tutorial') {   // the tutorial does its own teaching
      this.hint = null;
      return;
    }
    if (this.hint) {
      this.hint.age += dt;
      const isDone = this.hint.age > HINT_SECONDS || (this.hint.key === 'push' && game.door.speed > 45);
      if (isDone) this.hint = null;
      return;
    }
    if (game.phase !== 'playing') return;
    for (const hint of HINTS) {
      if (this.hintsShown.has(hint.key)) continue;
      if (!hint.when(game, this)) continue;
      this.hintsShown.add(hint.key);
      this.hint = { key: hint.key, text: hint.text, age: 0 };
      return;
    }
  }
}

/** Random-but-stable appearance for a person: shirt shade, hair, skin. */
function makeLook(random) {
  return {
    shirtIndex: Math.floor(random() * 5),
    hair: PALETTE.hairColors[Math.floor(random() * PALETTE.hairColors.length)],
    skin: PALETTE.skinTones[Math.floor(random() * PALETTE.skinTones.length)],
    accent: ['#d94b4b', '#3b6fd1', '#2f9e6f', '#e0a33a'][Math.floor(random() * 4)],
    hasBag: random() < 0.4,
  };
}

// Shown at most once per page load, in this priority order. [KEY] is drawn as a key cap.
const HINTS = [
  {
    key: 'push',
    text: 'Hold [SPACE] to push the door, let go to coast. Short pushes work best.',
    when: (game, fx) => fx.roundAge > 0.8 && game.door.speed < 5 && game.secondsElapsed < 30,
  },
  {
    key: 'safe',
    text: 'Someone stepped in! Keep the needle inside the green SAFE ZONE.',
    when: (game) => game.door.allRiders().length > 0,
  },
  {
    key: 'fast',
    text: 'Easy! Go past their top speed and the wing smacks them. Let go of [SPACE].',
    when: (game) => game.door.allRiders().some((rider) => !rider.hasComplained && game.door.speed > rider.type.comfortMaxSpeed - 12),
  },
  {
    key: 'trouble',
    text: 'Troublemaker! Hold [↓] while they\u2019re at the front of the line until they give up.',
    when: (game) => game.streetQueue.people.some((person) => person.type.isTroublemaker),
  },
  {
    key: 'conflict',
    text: 'NO SAFE SPEED! Someone will complain. Hold [↓] to stop more people stepping in.',
    when: (game) => sharedComfortRange(game.door.allRiders())?.isEmpty === true,
  },
  {
    key: 'slow',
    text: 'Too slow for someone: their ring is draining. Push [SPACE]!',
    when: (game) => game.door.allRiders().some((rider) => rider.mood === 'impatient'),
  },
  {
    key: 'courier',
    text: 'Couriers need an EMPTY compartment, and everyone behind them waits.',
    when: (game) => [game.streetQueue, game.lobbyQueue].some((q) => q.people[0]?.type.takesWholeCompartment),
  },
  {
    key: 'lobby',
    text: 'Lobby people are heading out to the street. Hold [↑] to make them wait.',
    when: (game) => game.lobbyQueue.length > 0,
  },
  {
    key: 'line',
    text: 'The line is backing up. More than 8 waiting = GRIDLOCK.',
    when: (game) => game.streetQueue.length >= 6 || game.lobbyQueue.length >= 6,
  },
];
