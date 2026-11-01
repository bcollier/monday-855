// rules_test.js
// Checks the game rules without a browser. Run from the repo root:
//   node tests/rules_test.js
// It loads the rule files through tools/load_rules.js (not input/render/main,
// which need a browser), then drives Game.update() directly.
// Each check names the acceptance criterion (AC #) from SPEC.md it covers.
// If you change a rule on purpose, update the matching check here too.
const { loadRules } = require('../tools/load_rules');
const { Game, Door, Person, PERSON_TYPES, angleDistance, pickPersonTypeKey, sharedComfortRange, FINAL_MINUTE_STARTS_AT, PERKS, EARN_BACK_STREAK, JOB_KINDS, JOB_REWARD_TIPS } = loadRules();

let failures = 0;
function check(name, cond, extra = '') { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); if (!cond) failures++; }
const DT = 1 / 60;
const none = { isPushingDoor: false, isStreetGateHeld: false, isLobbyGateHeld: false };
const push = { ...none, isPushingDoor: true };
function run(game, seconds, controls) { for (let i = 0; i < Math.round(seconds / DT); i++) game.update(DT, controls); }
// A game where every arrival (street and lobby) is the given type. Tests that need a
// specific type use this instead of a magic random number, so adding a type can't
// silently change what they test.
function gameWithOnly(typeKey) { const g = new Game(); g.pickTypeKey = () => typeKey; return g; }
function clearQueues(g) { g.streetQueue.people.length = 0; g.lobbyQueue.people.length = 0; }

// AC3: 90 deg/s after ~1s
{ const d = new Door(); for (let i = 0; i < 60; i++) d.update(DT, true); check('AC3 speed ~90 after 1s', Math.abs(d.speed - 90) < 1, d.speed.toFixed(2)); }
// AC4: slows to stop, never backwards
{ const d = new Door(); for (let i = 0; i < 60; i++) d.update(DT, true); let prev = d.angle, back = false, total = 0;
  for (let i = 0; i < 600; i++) { d.update(DT, false); let delta = (d.angle - prev + 360) % 360; if (delta > 180) back = true; prev = d.angle; }
  check('AC4 stops and never reverses', d.speed === 0 && !back, 'speed ' + d.speed); }
// AC5: max 200
{ const d = new Door(); for (let i = 0; i < 60 * 10; i++) d.update(DT, true); check('AC5 capped at 200', d.speed === 200); }
// alignment geometry
{ const d = new Door(); check('start: nothing aligned with street', d.findAlignedCompartment(270) === -1);
  d.angle = 135; check('angle 135 -> compartment 1 center at 270 (street)', d.findAlignedCompartment(270) === 1 && angleDistance(d.compartmentCenterAngle(1), 270) === 0); }

// AC7 + AC10 + AC11: enter, ride, exit, delivered
{ const g = gameWithOnly('intern');
  run(g, 0.1, none);
  check('a person spawns at start', g.streetQueue.length === 1);
  // slow constant push to ~40 deg/s (intern-comfortable), then coast-hold by toggling
  let entered = false, delivered = false, complaints = 0;
  for (let i = 0; i < 60 * 20; i++) {
    const c = g.door.speed < 40 ? push : none;
    g.update(DT, c);
    if (g.door.allRiders().length) entered = true;
    if (g.deliveredCount > 0) { delivered = true; break; }
  }
  check('AC7 front person enters automatically', entered);
  check('AC11 rider delivered at lobby', delivered, 'delivered ' + g.deliveredCount);
  check('intern kept comfortable at ~40 deg/s -> no complaint', g.complaintCount === 0, 'complaints ' + g.complaintCount);
  check('exiting person walks off', g.exitingPeople.length >= 1);
  run(g, 4, { ...none, isStreetGateHeld: false });
}

// AC8: holding down prevents entry
{ const g = gameWithOnly('intern');
  for (let i = 0; i < 60 * 10; i++) g.update(DT, { ...(g.door.speed < 40 ? push : none), isStreetGateHeld: true });
  check('AC8 gate held -> nobody enters', g.door.allRiders().length === 0 && g.deliveredCount === 0, 'queue ' + g.streetQueue.length);
  for (let i = 0; i < 60 * 5; i++) g.update(DT, g.door.speed < 40 ? push : none);
  check('AC8 release -> people enter again', g.door.allRiders().length + g.deliveredCount > 0); }

// AC9: lobby gate (lobby queue manually filled)
{ const g = gameWithOnly('intern'); g.lobbyQueue.add(new Person('intern', 'lobby'));
  for (let i = 0; i < 60 * 6; i++) g.update(DT, { ...(g.door.speed < 40 ? push : none), isLobbyGateHeld: true, isStreetGateHeld: true });
  check('AC9 lobby gate held -> lobby person stays', g.lobbyQueue.length === 1);
  let reachedStreet = false;
  for (let i = 0; i < 60 * 10; i++) { g.update(DT, { ...(g.door.speed < 40 ? push : none), isStreetGateHeld: true }); if (g.exitingPeople.some(p => p.fromSide === 'lobby')) reachedStreet = true; }
  check('AC9 released lobby person rides out to street', reachedStreet); }

// AC16: too fast -> immediate complaint (intern max 60)
{ const p = new Person('intern', 'street'); check('AC16 above range complains immediately', p.updateComfort(61, DT) === true); }
// AC17: too slow > 1.5s complains; < 1.5s then back in range does not
{ const p = new Person('manager', 'street'); let fired = false;
  for (let i = 0; i < 80; i++) fired = p.updateComfort(50, DT) || fired; // 1.33s
  for (let i = 0; i < 10; i++) fired = p.updateComfort(100, DT) || fired;
  for (let i = 0; i < 80; i++) fired = p.updateComfort(50, DT) || fired; // 1.33s again, timer was reset
  check('AC17 short dips do not complain', !fired);
  for (let i = 0; i < 20; i++) fired = p.updateComfort(50, DT) || fired;
  check('AC17 > 1.5s too slow complains', fired);
  check('only once (AC18 rule)', p.updateComfort(10, 5) === false && p.updateComfort(300, DT) === false); }

// AC14: ranges do not overlap
{ const m = PERSON_TYPES.manager, i = PERSON_TYPES.intern; let any = false;
  for (let s = 0; s <= 200; s++) if (s >= m.comfortMinSpeed && s <= m.comfortMaxSpeed && s >= i.comfortMinSpeed && s <= i.comfortMaxSpeed) any = true;
  check('AC14 no speed satisfies both', !any);
  // Sample the street spawn picker directly so the check doesn't depend on one round's luck.
  const counts = {};
  for (let k = 0; k < 1000; k++) { const key = pickPersonTypeKey('street', Math.random()); counts[key] = (counts[key] || 0) + 1; }
  check('AC14 both conflict types spawn on the street', counts.manager > 0 && counts.intern > 0, JSON.stringify(counts));
  check('AC15 all four types spawn on the street', ['officeWorker', 'manager', 'intern', 'courier'].every((k) => counts[k] > 0), JSON.stringify(counts));
  check('AC15 office workers are the most common', counts.officeWorker > counts.manager && counts.officeWorker > counts.intern && counts.officeWorker > counts.courier); }

// AC24: third complaint -> fired
{ const g = gameWithOnly('intern'); for (let i = 0; i < 60 * 60 && g.phase === 'playing'; i++) g.update(DT, push);
  check('AC24 full speed with interns -> fired', g.endReason === 'fired', g.endReason + ' complaints ' + g.complaintCount); }

// AC25: hold down -> gridlock before 9:00
{ const g = new Game(); let t = 0; while (g.phase === 'playing') { g.update(DT, { ...none, isStreetGateHeld: true }); t += DT; }
  check('AC25 holding down -> gridlock', g.endReason === 'gridlock', 'at ' + t.toFixed(1) + 's, queue ' + g.streetQueue.length); }

// AC21/26: 180s -> made it, clock text
{ const g = new Game(); check('clock 8:55 at start', g.clockText() === '8:55');
  // keep the door still and people out: no riders, no complaints; queue would gridlock, so clear it each frame
  let t = 0; while (g.phase === 'playing') { clearQueues(g); g.update(DT, none); t += DT; }
  check('AC21/26 round ends madeIt at 180s', g.endReason === 'madeIt' && Math.abs(t - 180) < 0.1, t.toFixed(2) + 's ' + g.clockText());
  check('clock shows 9:00 at end', g.clockText() === '9:00');
  g.reset(); check('reset -> playing, 8:55, counters zero', g.phase === 'playing' && g.clockText() === '8:55' && g.complaintCount === 0 && g.deliveredCount === 0); }

// AC12-ish: capacity never > 2 under random play
{ const g = new Game(); let maxIn = 0;
  for (let i = 0; i < 60 * 120 && g.phase === 'playing'; i++) { g.update(DT, Math.random() < 0.5 ? push : none); for (const c of g.door.compartments) maxIn = Math.max(maxIn, c.length); }
  check('capacity never exceeds 2', maxIn <= 2, 'max ' + maxIn); }

{ const g = gameWithOnly('intern'); g.secondsUntilStreetSpawn = 999; g.streetQueue.add(new Person('intern','street')); g.streetQueue.add(new Person('intern','street'));
  g.door.angle = 135; run(g, 0.5, none);
  check('two people share a stopped, aligned compartment (AC12)', g.door.compartments[1].length === 2 && g.streetQueue.length === 0);
  g.streetQueue.add(new Person('manager','street')); run(g, 0.5, none);
  check('third person waits: compartment full', g.streetQueue.length === 1); }
// AC13: a courier only enters an empty compartment, and blocks the line behind them
{ const g = new Game(); g.secondsUntilStreetSpawn = 999; g.secondsUntilLobbySpawn = 999; g.door.angle = 135;
  g.addToQueue('street', 'officeWorker'); g.addToQueue('street', 'courier'); g.addToQueue('street', 'officeWorker');
  run(g, 1, none);
  check('AC13 courier waits while the aligned compartment has someone in it', g.door.compartments[1].length === 1 && g.streetQueue.people[0].typeKey === 'courier');
  check('AC13 everyone behind the courier waits too', g.streetQueue.length === 2); }
{ const g = new Game(); g.secondsUntilStreetSpawn = 999; g.secondsUntilLobbySpawn = 999; g.door.angle = 135;
  g.addToQueue('street', 'courier'); g.addToQueue('street', 'officeWorker');
  run(g, 1, none);
  check('AC13 courier takes an empty compartment', g.door.compartments[1].length === 1 && g.door.compartments[1][0].typeKey === 'courier');
  check('AC13 nobody joins a courier', g.streetQueue.length === 1); }

// AC22: street arrivals ramp up at 8:57 and 8:59 (8:59 tuned from 1.5 s to 1.2 s, SPEC "Tuning changes")
{ const g = new Game(); const at = (s) => { g.secondsElapsed = s; return g.currentStreetSpawnInterval(); };
  check('AC22 ramp 4 / 2.5 / 1.2 s', at(0) === 4 && at(71.9) === 4 && at(72) === 2.5 && at(143.9) === 2.5 && at(144) === 1.2 && at(179) === 1.2); }
{ const g = new Game(); const spawnTimes = [];
  let t = 0; while (t < 179) { for (const e of g.takeEvents()) if (e.type === 'spawned' && e.person.fromSide === 'street') spawnTimes.push(t);
    clearQueues(g); g.update(DT, none); t += DT; }
  const gapsIn = (from, to) => { const ts = spawnTimes.filter((s) => s >= from && s < to); return (ts[ts.length - 1] - ts[0]) / (ts.length - 1); };
  check('AC22 measured gaps in a real round', Math.abs(gapsIn(0, 72) - 4) < 0.05 && Math.abs(gapsIn(76, 144) - 2.5) < 0.05 && Math.abs(gapsIn(147, 179) - 1.2) < 0.05,
    [gapsIn(0, 72), gapsIn(76, 144), gapsIn(147, 179)].map((x) => x.toFixed(2)).join(' / ')); }

// Tuning: the street mix starts calm and gets harder; office workers stay the most common (AC15)
{ const g = new Game(); const mixAt = (seconds) => { g.secondsElapsed = seconds; const counts = {};
    for (let k = 0; k < 2000; k++) { const key = g.pickTypeKey('street'); counts[key] = (counts[key] || 0) + 1; } return counts; };
  const share = (c, key) => (c[key] || 0) / 2000;
  const early = mixAt(10), middle = mixAt(100), final = mixAt(160);
  check('tuning: fewer managers and interns at 8:55 than at 8:59', share(early, 'manager') + share(early, 'intern') < share(final, 'manager') + share(final, 'intern') - 0.15);
  check('tuning: all four types still arrive at 8:55', ['officeWorker', 'manager', 'intern', 'courier'].every((k) => early[k] > 0), JSON.stringify(early));
  check('tuning: office workers most common in every part', [early, middle, final].every((c) => ['manager', 'intern', 'courier'].every((k) => c.officeWorker > (c[k] || 0)))); }
{ const g = gameWithOnly('officeWorker'); g.secondsElapsed = FINAL_MINUTE_STARTS_AT; g.secondsUntilLobbySpawn = 0; let lobbySpawns = 0;
  for (let t = 0; t < 30; t += DT) { for (const e of g.takeEvents()) if (e.type === 'spawned' && e.person.fromSide === 'lobby') lobbySpawns++;
    clearQueues(g); g.update(DT, none); }
  check('tuning: lobby arrivals every 6 s during 8:59', lobbySpawns === 5, 'spawns ' + lobbySpawns); }

// AC23: lobby arrivals every 10 s, only office workers and couriers, and they ride out to the street
{ const g = new Game(); let lobbySpawns = 0;
  for (let t = 0; t < 31; t += DT) { for (const e of g.takeEvents()) if (e.type === 'spawned' && e.person.fromSide === 'lobby') lobbySpawns++;
    g.streetQueue.people.length = 0; g.update(DT, { ...none, isLobbyGateHeld: true }); }
  check('AC23 one lobby arrival every 10 s', lobbySpawns === 3, 'spawns ' + lobbySpawns);
  const counts = {}; for (let k = 0; k < 1000; k++) { const key = pickPersonTypeKey('lobby', Math.random()); counts[key] = (counts[key] || 0) + 1; }
  check('AC23 lobby: only workers (~70%) and couriers (~30%)', Object.keys(counts).sort().join() === 'courier,officeWorker' && counts.officeWorker > 600 && counts.officeWorker < 800, JSON.stringify(counts)); }
{ const g = gameWithOnly('officeWorker'); g.secondsUntilStreetSpawn = 999; g.secondsUntilLobbySpawn = 0; let reachedStreet = false;
  for (let i = 0; i < 60 * 12; i++) { g.update(DT, g.door.speed < 60 ? push : none); if (g.exitingPeople.some((p) => p.fromSide === 'lobby')) reachedStreet = true; }
  check('AC23 a spawned lobby person rides out to the street', reachedStreet); }

// AC30 / AC31: nothing moves on the title screen or while paused
{ const g = new Game(); g.showTitle(); run(g, 2, push);
  check('AC30 title screen: clock and door wait', g.phase === 'title' && g.secondsElapsed === 0 && g.door.speed === 0);
  g.start(); run(g, 1, push); check('AC30 start() begins the round', g.phase === 'playing' && g.secondsElapsed > 0.9);
  g.togglePause(); const speed = g.door.speed, angle = g.door.angle, seconds = g.secondsElapsed; run(g, 2, push);
  check('AC31 paused: clock and door stop', g.phase === 'paused' && g.door.speed === speed && g.door.angle === angle && g.secondsElapsed === seconds);
  g.togglePause(); run(g, 0.5, push); check('AC31 unpause resumes', g.phase === 'playing' && g.secondsElapsed > seconds); }

// Events the visual layer depends on
{ const g = gameWithOnly('intern'); const seen = new Set();
  for (let i = 0; i < 60 * 60 && g.phase === 'playing'; i++) { g.update(DT, push); for (const e of g.takeEvents()) seen.add(e.type); }
  check('events: spawned, entered, complained, roundEnded', ['spawned', 'entered', 'complained', 'roundEnded'].every((t) => seen.has(t)), [...seen].join(',')); }
{ const g = gameWithOnly('officeWorker'); const seen = new Set();
  for (let i = 0; i < 60 * 20; i++) { g.update(DT, g.door.speed < 60 ? push : none); for (const e of g.takeEvents()) seen.add(e.type); }
  check('events: exited', seen.has('exited')); }
{ const p = new Person('intern', 'street'); p.updateComfort(100, DT); const q = new Person('manager', 'street'); for (let i = 0; i < 100; i++) q.updateComfort(0, DT);
  check('complaint reasons recorded', p.complaintReason === 'tooFast' && q.complaintReason === 'tooSlow'); }

// Arrivals walk up for ARRIVAL_WALK_SECONDS before they can step in
{ const g = new Game(); g.secondsUntilStreetSpawn = 999; g.secondsUntilLobbySpawn = 999; g.door.angle = 135;
  g.addToQueue('street', 'officeWorker', 2); run(g, 1.9, none);
  check('a new arrival cannot step in while still walking up', g.streetQueue.length === 1 && g.door.allRiders().length === 0);
  run(g, 0.3, none); check('...and steps in once they arrive', g.streetQueue.length === 0 && g.door.compartments[1].length === 1); }
{ const g = new Game(); g.door.angle = 135; g.secondsUntilLobbySpawn = 999; run(g, 0.05, none);
  check('spawned people count toward the line immediately', g.streetQueue.length === 1 && g.streetQueue.people[0].secondsUntilReady > 1.9); }

// Modes: Classic is the spec; Rush adds troublemakers; tutorial is practice
{ const g = new Game(); let troublemakers = 0;
  while (g.phase === 'playing') { for (const e of g.takeEvents()) if (e.type === 'spawned' && e.person.type.isTroublemaker) troublemakers++; clearQueues(g); g.update(DT, none); }
  check('classic: no troublemakers in a whole round', troublemakers === 0); }
{ const g = new Game(Math.random, 'rush'); let troublemakers = 0;
  while (g.phase === 'playing') { for (const e of g.takeEvents()) if (e.type === 'spawned' && e.person.type.isTroublemaker) troublemakers++; clearQueues(g); g.update(DT, none); }
  check('rush: troublemakers arrive (about every 15 s from 20 s)', troublemakers >= 7 && troublemakers <= 14, 'count ' + troublemakers); }
{ const g = new Game(Math.random, 'rush'); g.secondsUntilStreetSpawn = 999; g.secondsUntilLobbySpawn = 999; g.secondsUntilTroublemaker = 999;
  g.door.angle = 135; g.addToQueue('street', 'troublemaker'); g.addToQueue('street', 'officeWorker');
  const held = { ...none, isStreetGateHeld: true }; run(g, 2.4, held);
  check('rush: a held troublemaker waits at the front', g.streetQueue.people[0].type.isTroublemaker && g.complaintCount === 0);
  const seen = []; run(g, 0.2, held); for (const e of g.takeEvents()) seen.push(e.type);
  check('rush: ...and gives up after 2.5 s', seen.includes('turnedAway') && g.streetQueue.length === 1 && g.stats.keptOut === 1 && g.complaintCount === 0); }
{ const g = new Game(Math.random, 'rush'); g.secondsUntilStreetSpawn = 999; g.secondsUntilLobbySpawn = 999; g.secondsUntilTroublemaker = 999;
  g.door.angle = 135; g.addToQueue('street', 'troublemaker'); run(g, 0.5, none);
  check('rush: a troublemaker who gets in is a strike', g.complaintCount === 1 && g.stats.breaches === 1 && g.takeEvents().some((e) => e.type === 'breach'));
  for (let i = 0; i < 60 * 10; i++) g.update(DT, g.door.speed < 60 ? push : none);
  check('rush: troublemakers never complain about speed and are not counted as delivered', g.complaintCount === 1 && g.deliveredCount === 0); }
{ const g = new Game(Math.random, 'tutorial'); g.addToQueue('street', 'intern'); g.door.angle = 135; run(g, 0.5, none);
  for (let i = 0; i < 60 * 30; i++) g.update(DT, push);
  check('tutorial: no clock, no arrivals, strikes do not count, never ends', g.secondsElapsed === 0 && g.phase === 'playing' && g.complaintCount === 0 && g.streetQueue.length === 0); }
{ const g = new Game(); g.startMode('rush'); check('startMode switches mode and starts a round', g.mode === 'rush' && g.phase === 'playing'); g.reset(); check('reset keeps the mode', g.mode === 'rush'); }

// Shared comfort range (drives the meter's SAFE ZONE / NO SAFE SPEED)
{ const r = (...keys) => sharedComfortRange(keys.map((k) => new Person(k, 'street')));
  check('shared range: nobody -> null', sharedComfortRange([]) === null);
  check('shared range: worker + intern = 30-60', r('officeWorker', 'intern').min === 30 && r('officeWorker', 'intern').max === 60 && !r('officeWorker', 'intern').isEmpty);
  check('shared range: manager + intern is empty (AC14)', r('manager', 'intern').isEmpty); }

// Clock seconds and stats
// Rush extras (rush.js): tips, VIPs, earning a strike back, jobs, perks. Classic has none of them.
function quietRush() { const g = new Game(Math.random, 'rush'); g.secondsUntilStreetSpawn = 999; g.secondsUntilLobbySpawn = 999; g.secondsUntilTroublemaker = 999; g.secondsUntilJob = 999; return g; }
const happyWorker = () => new Person('officeWorker', 'street');
{ const g = quietRush(); g.door.angle = 270; g.addToQueue('street', 'officeWorker'); let tipped = null;
  for (let i = 0; i < 60 * 8 && !tipped; i++) { g.update(DT, g.door.speed < 50 ? push : none); for (const e of g.takeEvents()) if (e.type === 'tipped') tipped = e; }
  check('rush: a happy delivery tips $1', tipped && tipped.amount === 1 && g.tips === 1 && g.deliveredCount === 1); }
{ const g = new Game(); g.secondsUntilStreetSpawn = 999; g.secondsUntilLobbySpawn = 999; g.door.angle = 270; g.addToQueue('street', 'officeWorker');
  for (let i = 0; i < 60 * 8; i++) g.update(DT, g.door.speed < 50 ? push : none);
  check('classic: no tips, jobs or VIPs', g.deliveredCount === 1 && g.tips === 0 && g.job === null && !g.takeEvents().some((e) => e.type === 'tipped')); }
{ const g = quietRush(); const amounts = [];
  for (let i = 0; i < 11; i++) { g.rewardHappyDelivery(happyWorker()); }
  for (const e of g.takeEvents()) if (e.type === 'tipped') amounts.push(e.amount);
  check('rush: streak doubles tips from 5 in a row', amounts.join() === '1,1,1,1,2,2,2,2,2,2,2', amounts.join()); }
{ const g = quietRush(); const vip = new Person('manager', 'street'); vip.isVip = true; g.rewardHappyDelivery(vip);
  const late = new Person('manager', 'street'); late.isVip = true; late.wasImpatient = true; g.rewardHappyDelivery(late);
  check('rush: VIP tips $10 for a perfect ride, $5 if they went yellow', g.tips === 15 && g.stats.vipsDelivered === 2); }
{ const g = quietRush(); g.complaintCount = 2;
  for (let i = 0; i < EARN_BACK_STREAK - 1; i++) g.rewardHappyDelivery(happyWorker());
  const before = g.complaintCount; g.rewardHappyDelivery(happyWorker());
  check('rush: 10 happy deliveries in a row earn a strike back', before === 2 && g.complaintCount === 1 && g.stats.strikesEarnedBack === 1 && g.earnBackProgress === 0);
  for (let i = 0; i < 5; i++) g.rewardHappyDelivery(happyWorker());
  g.recordComplaint(new Person('intern', 'street'));
  check('rush: a strike resets the streak and the earn-back count', g.happyStreak === 0 && g.earnBackProgress === 0 && g.complaintCount === 2); }
{ const g = quietRush(); for (let i = 0; i < EARN_BACK_STREAK; i++) g.rewardHappyDelivery(happyWorker());
  check('rush: no strikes = nothing to earn back (no banking)', g.complaintCount === 0 && g.earnBackProgress === 0); }
{ const g = quietRush(); g.secondsUntilJob = 0; g.randomSource = () => 0;   // first job kind: 2 interns
  run(g, DT, none); const job = g.job;
  check('rush: a job starts', job && job.kind === JOB_KINDS[0].kind && job.progress === 0);
  g.rewardHappyDelivery(new Person('intern', 'street')); g.rewardHappyDelivery(happyWorker()); g.rewardHappyDelivery(new Person('intern', 'street'));
  check('rush: finishing a job pays tips and a free coffee break', g.job === null && g.stats.jobsDone === 1 && g.freeCoffees === 1 && g.tips === 1 + 1 + 1 + JOB_REWARD_TIPS); }
{ const g = quietRush(); g.secondsUntilJob = 0; g.randomSource = () => 0; run(g, DT, none); g.secondsUntilJob = 999;
  const seen = []; run(g, 31, none); for (const e of g.takeEvents()) seen.push(e.type);
  check('rush: a job runs out after 30 s with no penalty', g.job === null && seen.includes('jobFailed') && g.complaintCount === 0 && g.tips === 0); }
{ const g = quietRush(); g.secondsUntilJob = 0; g.randomSource = () => 0.99; run(g, DT, none); g.secondsUntilJob = 999;
  const isNoStrikes = g.job?.kind === 'noStrikes'; run(g, 31, none);
  check('rush: "no strikes" job pays out when time runs out', isNoStrikes && g.stats.jobsDone === 1);
  g.secondsUntilJob = 0; g.randomSource = () => 0.99; run(g, DT, none); g.recordComplaint(new Person('intern', 'street'));
  check('rush: ...and fails on a strike', g.job === null && g.stats.jobsDone === 1); }
{ const g = quietRush(); g.tips = 5;
  check('rush: a perk you can\'t afford does nothing', !g.usePerk('coffee') && g.tips === 5);
  g.tips = PERKS.coffee.cost + 10; const before = g.secondsElapsed; check('rush: coffee break costs its price', g.usePerk('coffee') && g.tips === 10);
  run(g, 1, none); check('rush: coffee break runs the rules at half speed', Math.abs(g.secondsElapsed - before - 0.5) < 0.02, (g.secondsElapsed - before).toFixed(3));
  check('rush: can\'t stack the same perk', !g.usePerk('coffee'));
  run(g, 5, none); g.freeCoffees = 1; check('rush: a won coffee break is free', g.usePerk('coffee') && g.tips === 10 && g.freeCoffees === 0); }
{ const g = quietRush(); g.tips = 50; check('rush: security needs a troublemaker in line', !g.usePerk('security'));
  g.addToQueue('street', 'officeWorker'); g.addToQueue('street', 'troublemaker'); g.addToQueue('street', 'troublemaker');
  check('rush: security walks every troublemaker away', g.usePerk('security') && g.streetQueue.length === 1 && g.stats.keptOut === 2 && g.tips === 50 - PERKS.security.cost); }
{ const g = quietRush(); g.tips = 50; const intern = new Person('intern', 'street'); intern.state = 'riding'; g.door.angle = 200; g.door.addRider(0, intern); g.door.speed = 150;
  g.usePerk('music'); run(g, 0.3, push);
  check('rush: elevator music: nobody complains', g.complaintCount === 0 && !intern.hasComplained);
  g.perkSecondsLeft.music = 0; run(g, DT, push); check('rush: ...until it stops', intern.hasComplained); }
{ const g = new Game(); g.tips = 100; check('classic: perks do nothing', !g.usePerk('coffee') && g.tips === 100); }
{ let vips = 0; for (let i = 0; i < 2000; i++) { const g = quietRush(); if (g.addToQueue('street', 'manager', 2).isVip) vips++; }
  check('rush: about 8% of street arrivals are VIPs', vips > 100 && vips < 220, String(vips)); }

{ const g = new Game(); g.secondsElapsed = 90; const c = g.clockTime();
  check('clock at 90 s is 8:57:30', c.hours === 8 && c.minutes === 57 && c.seconds === 30, JSON.stringify(c)); }

console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
