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
  /** @param {() => number} randomSource  defaults to Math.random; pass a seeded one in tests */
  constructor(randomSource = Math.random) {
    this.randomSource = randomSource;
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
    this.phase = 'playing';         // 'title' | 'playing' | 'paused' | 'ended'
    this.endReason = null;          // 'fired' | 'gridlock' | 'madeIt' once the round ends
    this.events = [];
    // Facts for the end-of-round report card. Counted here because they are game facts.
    this.stats = {
      deliveredByType: {},
      complaintsByType: {},
      secondsSinceComplaint: 0,
      longestCalmSeconds: 0,
    };
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

    this.secondsElapsed = Math.min(ROUND_DURATION_SECONDS, this.secondsElapsed + dt);
    this.door.update(dt, controls.isPushingDoor);

    this.letRidersExit();
    this.letQueueEnter(this.streetQueue, dt, controls.isStreetGateHeld);
    this.letQueueEnter(this.lobbyQueue, dt, controls.isLobbyGateHeld);
    this.updateRiderComfort(dt);
    this.spawnPeople(dt);
    this.moveExitingPeople(dt);
    this.checkForEndOfRound();
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
        this.deliveredCount += 1;
        this.stats.deliveredByType[rider.typeKey] = (this.stats.deliveredByType[rider.typeKey] || 0) + 1;
        this.emit({ type: 'exited', person: rider, compartmentIndex });
      }
    }
  }

  letQueueEnter(queue, dt, isGateHeld) {
    const person = queue.update(dt, this.door, isGateHeld);
    if (person) this.emit({ type: 'entered', person, compartmentIndex: person.compartmentIndex });
  }

  updateRiderComfort(dt) {
    this.stats.secondsSinceComplaint += dt;
    this.stats.longestCalmSeconds = Math.max(this.stats.longestCalmSeconds, this.stats.secondsSinceComplaint);
    for (const rider of this.door.allRiders()) {
      if (rider.updateComfort(this.door.speed, dt)) this.recordComplaint(rider);
    }
  }

  recordComplaint(person) {
    this.complaintCount += 1;
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
      this.secondsUntilLobbySpawn += LOBBY_SPAWN_INTERVAL;
    }
  }

  /** Random passenger type for a side. Tests replace this to spawn one type only. */
  pickTypeKey(side) {
    return pickPersonTypeKey(side, this.randomSource());
  }

  /**
   * Puts a new person at the back of a queue. Also used by debug keys and scenarios.
   * walkSeconds: how long until they can step in (0 = already standing in line).
   */
  addToQueue(side, typeKey, walkSeconds = 0) {
    const person = new Person(typeKey, side);
    person.secondsUntilReady = walkSeconds;
    (side === 'street' ? this.streetQueue : this.lobbyQueue).add(person);
    this.emit({ type: 'spawned', person });
    return person;
  }

  /** Seconds between street arrivals right now: the ramp in SPEC 2.7. */
  currentStreetSpawnInterval() {
    let interval = STREET_SPAWN_RAMP[0].intervalSeconds;
    for (const step of STREET_SPAWN_RAMP) {
      if (this.secondsElapsed >= step.fromSecond) interval = step.intervalSeconds;
    }
    return interval;
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
