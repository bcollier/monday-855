// rush.js
// Rush-only extras (SPEC.md "Additions"): tips, VIPs, earning a strike back,
// jobs and perks. Rules data only; Game applies them, and Classic never does,
// so Classic stays the game the spec describes.
//
//   Tips     - every happy delivery tips $1, or $2 once you have 5 happy
//              deliveries in a row. A VIP tips $10 for a perfect ride (never
//              yellow), $5 otherwise; the streak doesn't double that.
//   Earn back - with a strike on the board, 10 happy deliveries in a row erase
//              one. Any new strike starts the count again.
//   Jobs     - every so often a 30 s job appears ("deliver 2 interns without a
//              spill"). Finishing it pays tips and a free coffee break.
//   Perks    - spend tips with 1 / 2 / 3 (see PERKS).

const TIP_PER_DELIVERY = 1;
const TIP_STREAK_STEP = 5;           // the multiplier goes up every 5 happy deliveries in a row...
const TIP_MAX_MULTIPLIER = 2;        // ...to at most x2
const VIP_CHANCE = 0.08;             // chance a street arrival (not a troublemaker) is a VIP
const VIP_TIP_PERFECT = 10;
const VIP_TIP_OK = 5;
const EARN_BACK_STREAK = 10;         // happy deliveries in a row that erase one strike

const JOB_FIRST_SECONDS = 25;
const JOB_INTERVAL_SECONDS = 40;     // from one job's start to the next
const JOB_SECONDS = 30;              // time to finish a job
const JOB_REWARD_TIPS = 8;           // plus one free coffee break

/**
 * Jobs. `counts(event)` says whether a happy delivery or a kept-out troublemaker
 * moves the job on. A job with `lasts: true` is done if its time runs out
 * without it failing (only "no strikes" works that way).
 */
const JOB_KINDS = [
  { kind: 'interns', text: 'Deliver 2 interns without a spill', target: 2, counts: (e) => e.type === 'happy' && e.person.typeKey === 'intern' },
  { kind: 'managers', text: 'Get 2 managers in, happy', target: 2, counts: (e) => e.type === 'happy' && e.person.typeKey === 'manager' },
  { kind: 'courier', text: 'Deliver a courier without a dent', target: 1, counts: (e) => e.type === 'happy' && e.person.typeKey === 'courier' },
  { kind: 'happy', text: '6 happy deliveries', target: 6, counts: (e) => e.type === 'happy' },
  { kind: 'keepOut', text: 'Keep a troublemaker out', target: 1, counts: (e) => e.type === 'keptOut', needsTroublemakers: true },
  { kind: 'noStrikes', text: 'No strikes for 30 seconds', target: 1, counts: () => false, lasts: true },
];

/**
 * Perks, bought with tips. Keys 1 / 2 / 3 during a Rush round.
 *   coffee   - 5 s of slow motion: the door, the clock and arrivals all run at half speed
 *   security - a guard walks every troublemaker in the street line away
 *   music    - 6 s of elevator music: riders stay calm, nobody complains
 */
const PERKS = {
  coffee: { key: 'Digit1', name: 'Coffee break', cost: 50, seconds: 5 },
  security: { key: 'Digit2', name: 'Security', cost: 30, seconds: 0 },
  music: { key: 'Digit3', name: 'Elevator music', cost: 40, seconds: 6 },
};
const COFFEE_TIME_SCALE = 0.5;

/** Tip for one happy delivery, before the streak multiplier. */
function baseTipFor(person) {
  if (!person.isVip) return TIP_PER_DELIVERY;
  return person.wasImpatient ? VIP_TIP_OK : VIP_TIP_PERFECT;
}

/** x1, or x2 from TIP_STREAK_STEP happy deliveries in a row (counting this one). */
function tipMultiplierFor(streak) {
  return Math.min(TIP_MAX_MULTIPLIER, 1 + Math.floor(streak / TIP_STREAK_STEP));
}
