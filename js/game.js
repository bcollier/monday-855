// game.js
// The rules of one round: clock, spawning, entering/exiting, complaints,
// winning and losing. Owns the Door and both Queues.
//
// Game never reads the keyboard or draws anything. It gets a `controls` object
// (see readControls() in input.js) and render.js reads its fields afterwards.
// That split means you can drive a whole round from code in a test:
//   const game = new Game(); game.update(0.016, { isPushingDoor: true, ... });
//
// Anything that happens (someone spawns, steps in, complains...) is also pushed
// onto `game.events`. The visual layer (fx.js) drains them with takeEvents() to
// start animations. The rules never wait on, or read back from, the visuals.

class Game {
  /**
   * @param {() => number} randomSource  defaults to Math.random; pass a seeded one in tests
   * @param {'classic'|'rush'|'tutorial'} mode
   *   classic  - exactly SPEC.md
   *   rush     - classic plus troublemakers, tips, jobs and perks (SPEC.md "Additions", rush.js)
   *   tutorial - practice: no clock, no automatic arrivals, strikes don't count,
   *              the round never ends. tutorial.js decides who arrives.
   */
  constructor(randomSource = Math.random, mode = 'classic') {
    this.randomSource = randomSource;
    this.mode = mode;
    this.reset();
  }

  /** Starts a fresh round in the given mode (title screen choices). */
  startMode(mode) {
    this.mode = mode;
    this.reset();
  }

  /** Starts a fresh round at 8:55. Also used by the R key on the end screen. */
  reset() {
    this.door = new Door();
    this.streetQueue = new Queue('street');
    this.lobbyQueue = new Queue('lobby');
    this.exitingPeople = [];        // people walking off screen after leaving the door
    this.secondsElapsed = 0;
    this.complaintCount = 0;
    this.deliveredCount = 0;
    // Starting the countdown at 0 makes the first person appear on the first frame.
    this.secondsUntilStreetSpawn = 0;
    this.secondsUntilLobbySpawn = LOBBY_FIRST_SPAWN_SECONDS;
    this.secondsUntilTroublemaker = TROUBLEMAKER_FIRST_SECONDS;
    this.phase = 'playing';         // 'title' | 'playing' | 'paused' | 'ended'
    this.endReason = null;          // 'fired' | 'gridlock' | 'madeIt' once the round ends
    this.events = [];
    // Facts for the end-of-round report card. Counted here because they are game facts.
    this.stats = {
      deliveredByType: {},
      complaintsByType: {},
      secondsSinceComplaint: 0,
      longestCalmSeconds: 0,
      keptOut: 0,      // troublemakers turned away (Rush)
      breaches: 0,     // troublemakers who got in (Rush)
      tipsEarned: 0,   // Rush, before spending
      vipsDelivered: 0,
      strikesEarnedBack: 0,
      jobsDone: 0,
      perksUsed: 0,
    };
    // Rush extras (rush.js). Unused in Classic and practice.
    this.tips = 0;                  // dollars in pocket, to spend on perks
    this.happyStreak = 0;           // happy deliveries in a row since the last strike
    this.earnBackProgress = 0;      // happy deliveries in a row while a strike is on the board
    this.freeCoffees = 0;           // coffee breaks won from jobs
    this.perkSecondsLeft = { coffee: 0, music: 0 };
    this.job = null;                // { kind, text, target, progress, secondsLeft, ... } while one is running
    this.secondsUntilJob = JOB_FIRST_SECONDS;
    this.emit({ type: 'roundStarted' });
  }

  /** Resets to a round that is waiting on the title screen. Space calls start(). */
  showTitle() {
    this.reset();
    this.phase = 'title';
  }

  start() {
    if (this.phase === 'title') this.phase = 'playing';
  }

  /** P key. Only a running round can be paused. */
  togglePause() {
    if (this.phase === 'playing') this.phase = 'paused';
    else if (this.phase === 'paused') this.phase = 'playing';
  }

  emit(event) {
    this.events.push(event);
  }

  /** Returns everything that happened since the last call, and forgets it. */
  takeEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }

  /**
   * Advances the round by dt seconds. The ORDER of steps matters:
   * exits run before entries so a compartment empties before new people step in (SPEC 2.4).
   */
  update(dt, controls) {
    if (this.phase !== 'playing') return;
    const isPractice = this.mode === 'tutorial';
    if (this.mode === 'rush') dt = this.updatePerks(dt);   // a coffee break slows everything down

    if (!isPractice) this.secondsElapsed = Math.min(ROUND_DURATION_SECONDS, this.secondsElapsed + dt);
    this.door.update(dt, controls.isPushingDoor);

    this.letRidersExit();
    this.letQueueEnter(this.streetQueue, dt, controls.isStreetGateHeld);
    this.letQueueEnter(this.lobbyQueue, dt, controls.isLobbyGateHeld);
    if (this.mode !== 'classic') this.updateTroublemakers(dt, controls);
    this.updateRiderComfort(dt);
    if (!isPractice) this.spawnPeople(dt);
    this.moveExitingPeople(dt);
    if (this.mode === 'rush') this.updateJob(dt);
    if (!isPractice) this.checkForEndOfRound();
  }

  /** Riders whose compartment reached the opposite opening step out and count as delivered. */
  letRidersExit() {
    for (const openingAngle of [LOBBY_OPENING_ANGLE, STREET_OPENING_ANGLE]) {
      const compartmentIndex = this.door.findAlignedCompartment(openingAngle);
      if (compartmentIndex === -1) continue;

      // Copy the list: removeRider() changes the array we would be looping over.
      const riders = [...this.door.compartments[compartmentIndex]];
      for (const rider of riders) {
        if (rider.exitOpeningAngle !== openingAngle) continue;
        this.door.removeRider(rider);
        rider.state = 'exiting';
        const direction = openingAngle === LOBBY_OPENING_ANGLE ? -1 : 1;
        rider.x = DOOR_CENTER_X + EXIT_LANE_OFFSET_X;
        rider.y = DOOR_CENTER_Y + direction * DOOR_RADIUS;
        this.exitingPeople.push(rider);
        if (!rider.type.isTroublemaker) {   // a troublemaker reaching the lobby is not a delivery
          this.deliveredCount += 1;
          this.stats.deliveredByType[rider.typeKey] = (this.stats.deliveredByType[rider.typeKey] || 0) + 1;
        }
        this.emit({ type: 'exited', person: rider, compartmentIndex });
        if (this.mode === 'rush' && !rider.type.isTroublemaker && !rider.hasComplained) this.rewardHappyDelivery(rider);
      }
    }
  }

  letQueueEnter(queue, dt, isGateHeld) {
    const person = queue.update(dt, this.door, isGateHeld);
    if (!person) return;
    this.emit({ type: 'entered', person, compartmentIndex: person.compartmentIndex });
    if (person.type.isTroublemaker) this.recordBreach(person);
  }

  /**
   * Rush: a troublemaker held at the front of the street line (↓ held, finished
   * walking up) loses patience, and after TROUBLEMAKER_PATIENCE_SECONDS gives up.
   */
  updateTroublemakers(dt, controls) {
    const front = this.streetQueue.people[0];
    if (!front || !front.type.isTroublemaker || front.secondsUntilReady > 0 || !controls.isStreetGateHeld) return;
    front.patienceLeft -= dt;
    if (front.patienceLeft > 0) return;
    this.streetQueue.people.shift();
    front.state = 'leaving';
    this.stats.keptOut += 1;
    this.emit({ type: 'turnedAway', person: front });
    this.progressJob({ type: 'keptOut', person: front });
  }

  /** A troublemaker got into the door: a security strike (not counted in practice). */
  recordBreach(person) {
    if (this.mode !== 'tutorial') this.complaintCount += 1;
    this.onStrike();
    this.stats.breaches += 1;
    this.stats.secondsSinceComplaint = 0;
    this.emit({ type: 'breach', person });
  }

  updateRiderComfort(dt) {
    this.stats.secondsSinceComplaint += dt;
    this.stats.longestCalmSeconds = Math.max(this.stats.longestCalmSeconds, this.stats.secondsSinceComplaint);
    // Rush perk: while the elevator music plays, riders stay calm (their timers wait too).
    if (this.perkSecondsLeft.music > 0) return;
    for (const rider of this.door.allRiders()) {
      if (rider.updateComfort(this.door.speed, dt)) this.recordComplaint(rider);
      if (rider.mood === 'impatient') rider.wasImpatient = true;   // a VIP's ride is no longer perfect
    }
  }

  recordComplaint(person) {
    if (this.mode !== 'tutorial') this.complaintCount += 1;
    this.onStrike();
    this.stats.complaintsByType[person.typeKey] = (this.stats.complaintsByType[person.typeKey] || 0) + 1;
    this.stats.secondsSinceComplaint = 0;
    this.emit({ type: 'complained', person, reason: person.complaintReason });
  }

  spawnPeople(dt) {
    this.secondsUntilStreetSpawn -= dt;
    if (this.secondsUntilStreetSpawn <= 0) {
      this.addToQueue('street', this.pickTypeKey('street'), ARRIVAL_WALK_SECONDS);
      this.secondsUntilStreetSpawn += this.currentStreetSpawnInterval();
    }
    // SPEC 2.5: only office workers (70%) and couriers (30%) leave from the lobby.
    this.secondsUntilLobbySpawn -= dt;
    if (this.secondsUntilLobbySpawn <= 0) {
      this.addToQueue('lobby', this.pickTypeKey('lobby'), ARRIVAL_WALK_SECONDS);
      this.secondsUntilLobbySpawn += this.secondsElapsed >= FINAL_MINUTE_STARTS_AT ? LOBBY_FINAL_MINUTE_SPAWN_INTERVAL : LOBBY_SPAWN_INTERVAL;
    }
    // No new troublemakers late in 8:59: the very end is about the crowd.
    if (this.mode === 'rush' && this.secondsElapsed < TROUBLEMAKER_LAST_SECONDS) {
      this.secondsUntilTroublemaker -= dt;
      if (this.secondsUntilTroublemaker <= 0) {
        this.addToQueue('street', 'troublemaker', ARRIVAL_WALK_SECONDS);
        this.secondsUntilTroublemaker += TROUBLEMAKER_INTERVAL_SECONDS * (0.7 + 0.6 * this.randomSource());
      }
    }
  }

  // ---- Rush extras (rush.js) ----

  /** A strike resets the tip streak and the earn-back count, and fails a "no strikes" job. */
  onStrike() {
    if (this.mode !== 'rush') return;
    this.happyStreak = 0;
    this.earnBackProgress = 0;
    if (this.job?.lasts) this.finishJob(false);
  }

  /** Tips, the streak, earning a strike back, and job progress for one happy delivery. */
  rewardHappyDelivery(person) {
    this.happyStreak += 1;
    const multiplier = person.isVip ? 1 : tipMultiplierFor(this.happyStreak);
    const amount = baseTipFor(person) * multiplier;
    this.tips += amount;
    this.stats.tipsEarned += amount;
    if (person.isVip) this.stats.vipsDelivered += 1;
    this.emit({ type: 'tipped', person, amount, multiplier, isVip: person.isVip });

    if (this.complaintCount > 0) {
      this.earnBackProgress += 1;
      if (this.earnBackProgress >= EARN_BACK_STREAK) {
        this.earnBackProgress = 0;
        this.complaintCount -= 1;
        this.stats.strikesEarnedBack += 1;
        this.emit({ type: 'strikeEarnedBack' });
      }
    }
    this.progressJob({ type: 'happy', person });
  }

  /** Starts a job every JOB_INTERVAL_SECONDS, and runs down the current one's time. */
  updateJob(dt) {
    if (this.job) {
      this.job.secondsLeft -= dt;
      if (this.job.secondsLeft <= 0) this.finishJob(this.job.lasts === true);
    }
    this.secondsUntilJob -= dt;
    if (this.secondsUntilJob > 0 || this.job) return;
    this.secondsUntilJob = JOB_INTERVAL_SECONDS;
    if (this.secondsElapsed + JOB_SECONDS > ROUND_DURATION_SECONDS) return;   // no time to finish one
    const troublemakersComing = this.secondsElapsed + 10 < TROUBLEMAKER_LAST_SECONDS;
    const choices = JOB_KINDS.filter((kind) => !kind.needsTroublemakers || troublemakersComing);
    const kind = choices[Math.floor(this.randomSource() * choices.length)];
    this.job = { ...kind, progress: 0, secondsLeft: JOB_SECONDS };
    this.emit({ type: 'jobStarted', job: this.job });
  }

  progressJob(event) {
    if (!this.job || !this.job.counts(event)) return;
    this.job.progress += 1;
    if (this.job.progress >= this.job.target) this.finishJob(true);
  }

  finishJob(isDone) {
    const job = this.job;
    this.job = null;
    if (isDone) {
      this.tips += JOB_REWARD_TIPS;
      this.stats.tipsEarned += JOB_REWARD_TIPS;
      this.freeCoffees += 1;
      this.stats.jobsDone += 1;
    }
    this.emit({ type: isDone ? 'jobDone' : 'jobFailed', job });
  }

  /** What a perk would cost right now (a won coffee break is free), or null if it can't be used. */
  perkPrice(name) {
    const perk = PERKS[name];
    if (this.mode !== 'rush' || this.phase !== 'playing' || !perk) return null;
    if (this.perkSecondsLeft[name] > 0) return null;   // already running
    if (name === 'security' && !this.streetQueue.people.some((p) => p.type.isTroublemaker)) return null;
    return name === 'coffee' && this.freeCoffees > 0 ? 0 : perk.cost;
  }

  /** Keys 1 / 2 / 3 in Rush. Returns true if the perk was used. */
  usePerk(name) {
    const price = this.perkPrice(name);
    if (price === null || price > this.tips) return false;
    if (name === 'coffee' && price === 0) this.freeCoffees -= 1;
    this.tips -= price;
    this.stats.perksUsed += 1;
    if (name === 'security') {
      for (const person of this.streetQueue.people.filter((p) => p.type.isTroublemaker)) {
        this.streetQueue.people.splice(this.streetQueue.people.indexOf(person), 1);
        person.state = 'leaving';
        this.stats.keptOut += 1;
        this.emit({ type: 'turnedAway', person, bySecurity: true });
      }
    } else {
      this.perkSecondsLeft[name] = PERKS[name].seconds;
    }
    this.emit({ type: 'perkUsed', name });
    return true;
  }

  /** Runs perk timers in real seconds; returns the dt the rules should use this step. */
  updatePerks(dt) {
    const isCoffeeBreak = this.perkSecondsLeft.coffee > 0;
    for (const name of Object.keys(this.perkSecondsLeft)) {
      this.perkSecondsLeft[name] = Math.max(0, this.perkSecondsLeft[name] - dt);
    }
    return isCoffeeBreak ? dt * COFFEE_TIME_SCALE : dt;
  }

  /** Random passenger type for a side. Tests replace this to spawn one type only. */
  pickTypeKey(side) {
    const mix = side === 'street' ? this.currentRampStep().streetMix : undefined;
    return pickPersonTypeKey(side, this.randomSource(), mix);
  }

  /**
   * Puts a new person at the back of a queue. Also used by debug keys and scenarios.
   * walkSeconds: how long until they can step in (0 = already standing in line).
   */
  addToQueue(side, typeKey, walkSeconds = 0) {
    const person = new Person(typeKey, side);
    person.secondsUntilReady = walkSeconds;
    // Rush: now and then a street arrival is a VIP who tips big for a smooth ride.
    if (this.mode === 'rush' && side === 'street' && walkSeconds > 0 && !person.type.isTroublemaker) {
      person.isVip = this.randomSource() < VIP_CHANCE;
    }
    (side === 'street' ? this.streetQueue : this.lobbyQueue).add(person);
    this.emit({ type: 'spawned', person });
    return person;
  }

  /** The part of STREET_SPAWN_RAMP the round is in right now (SPEC 2.7). */
  currentRampStep() {
    let current = STREET_SPAWN_RAMP[0];
    for (const step of STREET_SPAWN_RAMP) {
      if (this.secondsElapsed >= step.fromSecond) current = step;
    }
    return current;
  }

  /** Seconds between street arrivals right now. */
  currentStreetSpawnInterval() {
    return this.currentRampStep().intervalSeconds;
  }

  moveExitingPeople(dt) {
    for (const person of this.exitingPeople) {
      const direction = person.fromSide === 'street' ? -1 : 1;   // street people walk up into the lobby
      person.y += direction * EXIT_WALK_SPEED * dt;
    }
    this.exitingPeople = this.exitingPeople.filter(
      (person) => person.y > -PERSON_RADIUS && person.y < CANVAS_HEIGHT + PERSON_RADIUS,
    );
  }

  /** Losing is checked before winning, so a third complaint at exactly 9:00 still loses. */
  checkForEndOfRound() {
    if (this.complaintCount >= MAX_COMPLAINTS) {
      this.endRound('fired');
    } else if (this.streetQueue.length > MAX_QUEUE_LENGTH || this.lobbyQueue.length > MAX_QUEUE_LENGTH) {
      this.endRound('gridlock');
    } else if (this.secondsElapsed >= ROUND_DURATION_SECONDS) {
      this.endRound('madeIt');
    }
  }

  endRound(reason) {
    this.phase = 'ended';
    this.endReason = reason;
    this.emit({ type: 'roundEnded', reason });
  }

  /** Game-clock time as { hours, minutes, seconds }. 8:55:00 at the start, 9:00:00 at the end. */
  clockTime() {
    const gameSecondsPerRealSecond = (ROUND_GAME_MINUTES * 60) / ROUND_DURATION_SECONDS;
    const totalSeconds = Math.floor(ROUND_START_MINUTES * 60 + this.secondsElapsed * gameSecondsPerRealSecond + 1e-6);
    return {
      hours: Math.floor(totalSeconds / 3600),
      minutes: Math.floor(totalSeconds / 60) % 60,
      seconds: totalSeconds % 60,
    };
  }

  /** Clock text like "8:57". Shows 9:00 only when the round is over. */
  clockText() {
    const { hours, minutes } = this.clockTime();
    return `${hours}:${String(minutes).padStart(2, '0')}`;
  }
}
