// constants.js
// Every tunable number in the game lives in this file, so balancing never means
// digging through game logic. Values come from SPEC.md sections 2.2–2.7.
// If you change one while tuning, record it in a clearly marked section at the
// bottom of SPEC.md (the spec asks for this instead of rewriting the original).

// ---- Canvas & layout (pixels) ----
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 640;
const DOOR_CENTER_X = 480;
const DOOR_CENTER_Y = 320;
const DOOR_RADIUS = 110;
const PERSON_RADIUS = 9;
const QUEUE_SPACING = 28;          // center-to-center gap between people in a queue
const QUEUE_GAP_FROM_DOOR = 30;    // the front person stands this far outside the door circle
const QUEUE_TURN_AFTER_SPOTS = 3;  // each line runs straight out of its opening for 3 spots, then turns
                                   // sideways (street line to the right, lobby line to the left)
const EXIT_LANE_OFFSET_X = 34;     // exiting people walk beside the queue, not through it
const EXIT_WALK_SPEED = 120;       // px/s for people walking away after they leave the door

// ---- Angles (degrees) ----
// Convention used EVERYWHERE in the code (SPEC 2.1): as seen on screen,
// 0° = right, 90° = up (lobby), 180° = left, 270° = down (street).
// Angles grow COUNTERCLOCKWISE. Canvas y points down, so render.js flips the sign.
const LOBBY_OPENING_ANGLE = 90;
const STREET_OPENING_ANGLE = 270;
const ALIGNMENT_TOLERANCE = 20;    // a compartment center within ±20° of an opening counts as "aligned"
const HOUSING_HALF_WIDTH = 45;     // glass walls cover ±45° around 0° and 180°, leaving 90°-wide openings

// ---- Door physics ----
const DOOR_ACCELERATION = 90;      // °/s² while Space is held -> reaches 90 °/s after ~1 s (AC #3)
const DOOR_FRICTION = 45;          // °/s² slowdown when Space is released; half the push rate so the door "coasts"
const DOOR_MAX_SPEED = 200;        // °/s hard cap (AC #5)

// ---- Compartments ----
const WING_COUNT = 4;
const COMPARTMENT_CAPACITY = 2;
const ARRIVAL_WALK_SECONDS = 2;    // a new arrival takes this long to walk up before they can step in.
                                   // Without it, someone arriving while a compartment is lined up steps
                                   // straight into a fast door with no chance for the player to react.
                                   // They count toward gridlock from the moment they arrive.
const ENTRY_INTERVAL = 0.3;        // s between two people stepping in from the same queue;
                                   // this is what lets a slow door take 2 people and a fast door only 1

// ---- Complaints & losing ----
const TOO_SLOW_GRACE_SECONDS = 1.5;
const MAX_COMPLAINTS = 3;
const MAX_QUEUE_LENGTH = 8;        // MORE than this many people waiting on one side = gridlock

// ---- Round clock ----
const ROUND_DURATION_SECONDS = 180;        // real seconds for 8:55 -> 9:00
const ROUND_START_MINUTES = 8 * 60 + 55;   // 8:55 expressed in minutes after midnight
const ROUND_GAME_MINUTES = 5;
const FINAL_MINUTE_STARTS_AT = ROUND_DURATION_SECONDS * (ROUND_GAME_MINUTES - 1) / ROUND_GAME_MINUTES;  // 8:59 = 144 s

// ---- Spawning ----
// Street arrivals speed up as 9:00 approaches (SPEC 2.7). One game minute = 36 real
// seconds, so 8:57 is at 72 s and 8:59 at 144 s.
// streetMix: relative spawn weights for that part of the round (SPEC "Tuning
// changes"). It starts calm (mostly office workers, who are fine at almost any
// speed) so a new player learns the door before the manager/intern conflict
// arrives in numbers with the crowd. Office workers stay the most common type in
// every part (AC #15). The last part is the SPEC 2.5 table, which is also each
// type's own weight in PERSON_TYPES.
const STREET_SPAWN_RAMP = [
  { fromSecond: 0, intervalSeconds: 4,     // 8:55–8:57
    streetMix: { officeWorker: 85, manager: 6, intern: 6, courier: 3 } },
  { fromSecond: 72, intervalSeconds: 2.5,  // 8:57–8:59
    streetMix: { officeWorker: 70, manager: 13, intern: 10, courier: 7 } },
  { fromSecond: 144, intervalSeconds: 1.2, // 8:59–9:00 (SPEC said 1.5; see "Tuning changes")
    streetMix: { officeWorker: 55, manager: 20, intern: 15, courier: 10 } },
];
const LOBBY_SPAWN_INTERVAL = 10;               // s, until 8:59
const LOBBY_FINAL_MINUTE_SPAWN_INTERVAL = 6;   // s, during 8:59: the morning rush hits both sides
const LOBBY_FIRST_SPAWN_SECONDS = 10;  // the first lobby person appears one interval in

// ---- Rush mode: troublemakers ----
// Not in the original spec: Rush is an extra mode (see SPEC.md "Additions"). Classic
// never spawns troublemakers, so it plays exactly as specified.
const TROUBLEMAKER_FIRST_SECONDS = 20;     // first one arrives at about 8:55:33
const TROUBLEMAKER_INTERVAL_SECONDS = 15;  // average gap; each gap is 70–130% of this
const TROUBLEMAKER_LAST_SECONDS = 156;    // none arrive after about 8:59:20, so the end is about the crowd (SPEC "Tuning changes")
const TROUBLEMAKER_PATIENCE_SECONDS = 2.5; // held at the front of the street line this long, they give up

// ---- Main loop ----
const SIMULATION_STEP = 1 / 120;   // s. Rules always advance in exactly this step, so a round
                                   // plays out the same way at 60 Hz, 120 Hz or in a test
const MAX_FRAME_SECONDS = 0.1;     // browsers pause requestAnimationFrame in background tabs; without
                                   // this cap the door would jump hundreds of degrees on return
