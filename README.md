# Monday, 8:55

You are the doorman of an office building's revolving door during the five minutes before 9:00 on a Monday. Push the door, decide who gets to step in, and keep everyone's ride at a speed they can stand.

**The full design is in [SPEC.md](SPEC.md).** This README covers what exists now (the v2 build, see [PLAN.md](PLAN.md)), how the code is organized, and how to check and tune it.

---

## 1. Running the game

No install and no build step.

1. Download or clone this repository.
2. Open `index.html` in a current desktop browser (Chrome, Firefox or Safari). Double-clicking the file works.

If your browser blocks local files for some reason, serve the folder instead:

```
python3 -m http.server 8000
```
and open http://localhost:8000.

### Tests and the balancing tool (Node.js 18 or newer)

```
node tests/rules_test.js     # rules tests, each labeled with the acceptance criterion (AC #) it covers
node tools/sim.js            # plays 200 rounds each with a careful and a sloppy simulated player
```

Run the tests after every rule change. Run the sim before and after changing any number in `js/constants.js` or `PERSON_TYPES`.

### Jumping to a moment (for checking by eye or screenshots)

Add a hash to the URL:

| Hash | Shows |
|---|---|
| `#scenario=tutorial` / `#scenario=rushMode` | start the tutorial / a Rush round |
| `#scenario=play` | skips the title screen |
| `#scenario=conflict` | a manager and an intern riding together: NO SAFE SPEED |
| `#scenario=rush` | 8:59, long lines, a full door |
| `#scenario=paused`, `#scenario=title` | those screens |
| `#scenario=fired` / `gridlock` / `madeIt` | the end screens |

Extra flags: `&critter` switches to the Critter look, `&hold` freezes the rules (animations keep going), `&debug` opens the debug overlay, `&bot` lets the simulated player play, `&advance=60` fast-forwards 60 seconds before the first frame. Example: `index.html#scenario=play&bot&advance=150` shows 8:59 of a round the bot is playing.

---

## 2. How to play

**Three ways to play** (chosen on the title screen):

| Key | Mode | What it is |
|---|---|---|
| **T** | Tutorial | Seven short steps, about a minute. No clock, no strikes. Esc leaves. |
| **Space** | Classic | SPEC.md, with the numbers tuned as logged in its "Tuning changes" section. This is the mode the acceptance criteria describe. |
| **R** | Rush | Classic plus **troublemakers**: a pushy salesperson, a pickpocket and a kid who just wants to spin join the street line about every 15 s (none after about 8:59:20). Hold **↓** while one is at the front and after 2.5 s they give up. Let one in and it's a strike. |

**Critter look:** press **C** at any time to switch the whole cast and scenery to cozy animals: commuter bunnies, cats, bears, frogs and mice; a late fox; a coffee squirrel; a duck pushing a stroller of ducklings; a raccoon, a mole and a puppy as the troublemakers. It's only a different look: same rules, same comfort ranges, same criteria.

| Key | Action |
|---|---|
| **Space** (hold) | Push the door. It speeds up while held and coasts to a stop when released. |
| **↓** (hold) | Street line waits: a belt closes and nobody from the street steps in. |
| **↑** (hold) | Lobby line waits. |
| **P** or **Esc** | Pause / unpause. Leaving the browser tab also pauses. |
| **R** | New round in the same mode from the end screen (**Space** works too, after a moment). **Esc** goes back to the menu. |
| **C** | Switch between the office look and the Critter look. |
| **D** | Debug overlay. While it's open, **1–4** add a worker / manager / intern / courier to the street line (hold **Shift** for the lobby line). |

**Goal:** survive from 8:55 to 9:00 (3 real minutes) and deliver as many people as you can.

**You lose if** 3 people complain (**YOU'RE FIRED**) or more than 8 people are waiting in one line (**LOBBY GRIDLOCK**).

| Who | Looks like | Comfortable at |
|---|---|---|
| Office worker | muted shirt, phone in hand | 30–120 °/s |
| Late manager | navy suit, red tie, briefcase | 70–170 °/s |
| Coffee intern | holding a tray of six coffees | 20–60 °/s |
| Courier | orange helmet, pushing a cart; needs an empty compartment | 15–70 °/s |

A rider complains **immediately** if the door is faster than their range, and after **1.5 seconds** if it stays slower. Managers and interns can never both be comfortable.

**Reading the screen:**
- **Speed meter (bottom left).** The needle is the door's speed. Each type has a lane showing its range: solid when someone of that type is riding, with one dot per rider in their mood color; dashed **NEXT** when they're at the front of a line; faint otherwise. The green **SAFE ZONE** is the speed that suits everyone riding. Red stripes and **NO SAFE SPEED** mean there isn't one.
- **Rings around riders.** Green: fine. Yellow: too slow, and the ring drains over the 1.5 s before they snap. Red with a storm cloud: has complained.
- **Warning signs.** The intern's cups wobble as the door nears 60 °/s, the courier's boxes slide near 70, the manager taps their watch when it's too slow, and anyone near their top speed sweats.
- **SLOWER / FASTER tags** over a rider who is about to complain: red ▼ SLOWER within 12 °/s of their top speed, amber ▲ FASTER while their too-slow timer runs.
- **When a strike happens**, the complaint bubble is stamped TOO FAST, TOO SLOW or GOT IN, and a card under the STRIKES counter says who, why (their range against the door's speed) and what to do instead.
- **Floor spots** in each line turn amber at 6 people and red at 8. The red dashed line is where the 9th person would stand: gridlock.
- **The door's face.** The hub dozes when nothing's happening, smiles when everyone is comfortable, looks worried while someone's too-slow timer runs, goes wide-eyed (and the rim glows red) when you're about to smack someone, and gets dizzy above 150 °/s.

**Little things to look for** (all visual; none of them change the rules):
- Happy leavers hop and float a "+1". Runs of happy deliveries get call-outs: SMOOTH!, BUTTERY!, … DOOR WHISPERER! Pull back from someone's top speed just in time for a "CLOSE ONE!".
- About 1 in 14 arrivals is a rare version of their type: someone in a dinosaur onesie, the birthday cake, a giant ficus, the CEO, the twelve-coffee intern, a courier with a cat. Same comfort range, different complaints.
- A pigeon sometimes lands on a wing and rides the door. Go above 95 °/s and it leaves in a cloud of feathers.
- Some rounds get a passing shower. The lobby stays dry.
- The last five seconds count down, and everyone bounces at 9:00.
- The end screen gives you a doorman rank and your best this session (kept in memory only; SPEC §5 rules out saving). If you were fired, it lists what each strike was for.

---

## 3. Acceptance criteria status

All 31 criteria in SPEC.md §3 are met in **Classic** mode (Space on the title screen); Rush and the tutorial are additions on top (SPEC.md, "Additions"). "Tested" means a check in `tests/rules_test.js`; "seen" means checked in the running game (headless Chrome screenshots and a browser harness that sends real key events; Firefox rendering checked headless).

| # | Status | How it was checked / notes |
|---|---|---|
| 1 | Met | Opens from `file://` with no console errors in Chrome (headless, full rounds drawn frame by frame) and Firefox (headless). Safari was not re-checked for v2. |
| 2 | Met | Seen. Brass-framed glass walls left and right, openings top and bottom, 4 wings. |
| 3 | Met | Tested, and seen in the browser harness: 90.0 °/s after 1 s of Space. |
| 4 | Met | Tested. Friction to 0, never reverses. |
| 5 | Met | Tested. Capped at 200 °/s. |
| 6 | Met | Seen. Street line forms below the door and turns right after 3 spots. |
| 7 | Met | Tested. |
| 8 | Met | Tested; WAIT belt seen. |
| 9 | Met | Tested; lobby people now spawn (#23), so it's visible in play. |
| 10 | Met | Tested/seen. Riders turn with their compartment. |
| 11 | Met | Tested/seen. Leavers walk off (street people to the elevators, lobby people along the sidewalk); Delivered ticks up. |
| 12 | Met | Tested. Never more than 2. |
| 13 | Met | Tested. Courier waits for an empty compartment, and the line behind them waits too. |
| 14 | Met | Tested. Ranges never overlap; both spawn on the street. |
| 15 | Met | Tested (all four spawn) and seen (distinct silhouettes). |
| 16 | Met | Tested. |
| 17 | Met | Tested. |
| 18 | Met | Tested (once only) and seen (red ring + cloud). |
| 19 | Met | Seen. Speech bubble with a line per type and cause, stamped TOO FAST / TOO SLOW; a pink slip gets stamped, and a card explains the strike. |
| 20 | Met | Seen. Green ring, yellow draining ring. |
| 21 | Met | Tested (180.00 s). A full round in the browser harness was 10,800 frames at 60 fps. |
| 22 | Met (amended) | Tested, measured in a real round: 4.00 / 2.50 / 1.20 s. The 8:59 interval was tuned from 1.5 s to 1.2 s (SPEC.md, "Tuning changes"). |
| 23 | Met | Tested. One every 10 s (every 6 s during 8:59, a tuning change), 70% workers / 30% couriers, they ride out to the street. |
| 24 | Met | Tested/seen. |
| 25 | Met | Tested. Holding ↓ from the start gridlocks at about 32 s. |
| 26 | Met | Tested/seen. All end screens show delivered and complaints; R restarts. |
| 27 | Met | Seen. D shows exact speed, real seconds, game clock, spawn interval, line lengths, frame rate. |
| 28 | Met | Seen. See "Reading the screen" above. |
| 29 | Met | Seen. Belt snaps across the line plus a red WAIT sign. |
| 30 | Met | Seen. Name, premise, controls, the four people; Space starts. |
| 31 | Met | Tested (clock and door stop) and seen. |

**One rule addition (see SPEC.md, "Tuning changes"):** new arrivals take 2 s to walk up before they can step in.

---

## 4. Code structure

```
index.html            the canvas, plus <script> tags in load order
js/constants.js       every gameplay number (speeds, timings, layout)
js/input.js           keyboard state -> readControls() / wasKeyPressed()
js/door.js            Door: rotation with inertia, compartments, who rides where
js/person.js          PERSON_TYPES table, sharedComfortRange(), Person: one passenger's state and complaint rules
js/queue.js           Queue: one line of waiting people and the rules for stepping in
js/game.js            Game: one round's rules, clock, spawning, exits, complaints, win/lose; emits events
js/autopilot.js       a simulated player (used by tools/sim.js and #scenario=...&bot)
js/tutorial.js        the guided practice: steps, checks, kind retries
js/scenarios.js       the #scenario= moments
js/surprises.js       visual-only flourishes: rare looks, streaks, rank, the pigeon, rain
js/fx.js              the visual-only layer: walking, gliding, particles, bubbles, hints, street life
js/render/art.js      palette, fonts, drawing helpers
js/render/layout.js   game state -> pixels (door angles, queue paths, exit paths)
js/render/scene.js    lobby, facade, street (cached), queue lanes, WAIT belts, cars
js/render/doorway.js  the door: floor, wings, glass housing
js/render/characters.js  the four passenger types, mood rings, warning signs
js/render/effects.js  floor stains, particles, speech bubbles
js/render/extras.js   floaters, banners, streak call-outs, pigeon, rain, dogs, countdown, HOLD sign
js/render/critters.js the Critter look's cast (and the look switch)
js/render/critter_scene.js  the Critter look's lobby, meadow and lane
js/render/lessons.js  the tutorial card and focus ring
js/render/meter.js    the speed meter
js/render/hud.js      delivered, flip clock, strikes, tips, debug overlay
js/render/screens.js  title, pause, end screens
js/render/frame.js    drawGame(): all layers, back to front
js/main.js            frame loop: one-shot keys -> rules in fixed steps -> fx -> draw
tests/rules_test.js   rules tests (Node, no browser)
tools/sim.js          balancing: plays many rounds with the autopilot
```

### How a frame flows

```
main.js runFrame()
  ├─ handleOneShotKeys()                  Space on title, P, R, D, debug spawns
  ├─ stepRules()                          game.update() in exact 1/120 s steps (SIMULATION_STEP)
  │    1. door.update()                   speed and angle
  │    2. letRidersExit()                 BEFORE entries, so compartments empty first
  │    3. letQueueEnter() street, lobby   people step in
  │    4. updateRiderComfort()            person.updateComfort() -> recordComplaint()
  │    5. spawnPeople()
  │    6. moveExitingPeople()
  │    7. checkForEndOfRound()            loses are checked before the win
  ├─ fx.update(events)                    animations react to game.takeEvents()
  └─ drawGame(ctx, game, fx, ui)          render/frame.js
```

### Key ideas

- **Three layers, one direction.** Rules (`game.js` and friends) never read keys or draw. `fx.js` reacts to rule events and keeps its own animation state; it never changes the game. `render/*.js` only reads both. So the tests and the sim run the real rules with no browser and no visuals.
- **Events.** `Game` pushes `spawned`, `entered`, `exited`, `complained` and `roundEnded` onto `game.events`; `main.js` hands them to `fx` every frame. To add a reaction to something, handle its event in `Fx.handleEvent()`.
- **Angles, not coordinates.** All angles are degrees, **counterclockwise, 0° = right, 90° = up (lobby), 270° = down (street)** (SPEC 2.1). Compartment `i` is centered at `door.angle + i*90 + 45`. `render/layout.js` is the only place angles become pixels.
- **Person lifecycle:** `'queued'` (in a `Queue.people` array; walking up for `secondsUntilReady`) → `'riding'` (in `door.compartments[i]`) → `'exiting'` → removed.
- **Passenger types are data.** A new type is one entry in `PERSON_TYPES`. Spawning, capacity, complaints, the meter and the bubbles read from that table. Its look goes in `render/characters.js`.
- **All gameplay numbers live in `constants.js`.** If you tune one, record it in "Tuning changes" at the bottom of SPEC.md.

### Where to change things

| You want to… | Go to |
|---|---|
| add or tune a passenger type | `PERSON_TYPES` in `person.js` (+ a `draw…()` in `render/characters.js`) |
| change door feel (push, friction, max) | `constants.js` |
| change who may step in, and when | `Queue.update()`, `Door.canAccept()` |
| change complaint rules | `Person.updateComfort()` |
| change arrival rates or the arrival mix | `STREET_SPAWN_RAMP` (intervals and `streetMix`), `LOBBY_SPAWN_INTERVAL`, `LOBBY_FINAL_MINUTE_SPAWN_INTERVAL` in `constants.js` |
| change complaint lines | `complaintLines` in `PERSON_TYPES` |
| change a tip | `HINTS` at the bottom of `fx.js` |
| add a rare look | `RARE_LOOKS` in `surprises.js` + drawing in `render/characters.js` |
| change what the door's face does | `doorMood()` / `drawDoorFace()` in `render/doorway.js` |
| change colors or fonts | `render/art.js` |
| add a key | `GAME_KEY_CODES` + `readControls()` in `input.js`, one-shot keys in `main.js` |

---

## 5. Balance

`node tools/sim.js 500` (500 rounds each, current numbers):

| Player | Classic | Rush | Notes |
|---|---|---|---|
| Careful (sees everything, reacts every 0.25 s, uses the gates) | 79% made it | 70% | Usually makes it with a strike or two to spare. Losses come in the 8:59 crowd. |
| Sloppy (reacts every 0.6 s, never uses the gates) | 10% made it, 85% reach 8:59 | 0% | Gets through the calm opening, then is fired in the rush. |

The target was "tense but fair": a skilled player usually makes it, but narrowly, and a new player sees the 8:59 climax. The arrival mix starts calm and gets harder, 8:59 is busier on both sides, and the street line averages 3.4 people during 8:59 with peaks of 6–7. SPEC.md, "Tuning changes", has the numbers before and after, and what was tried. A human sits between the two bots. The careful bot has perfect information, so its numbers say little about how a person will do; play-testing should have the final say.

---|---|---|
| Careful (sees everything, reacts every 0.25 s, uses the gates) | ~98% | Delivers ~83 people. Complaints mostly managers kept too slow. |
| Sloppy (reacts every 0.6 s, never uses the gates) | 5–10% | Fired, mostly couriers and interns hit by a fast door. |

A human sits between the two. The careful bot has perfect information, so 98% for it doesn't mean the game is easy for a person. The street line averages about 2.3–2.4 people during 8:59. That's less crowded than SPEC §1 imagines. Cutting the 8:59 arrival interval from 1.5 s to 1.2 s gives about 3.3 people and an 80% careful-bot survival rate, but AC #22 names 1.5 s, so it's left as a decision (see SPEC.md, "Tuning changes").

---

## 6. Known issues and pitfalls

- **Plain `<script>` tags, not ES modules, on purpose.** Modules are blocked when `index.html` is opened from disk, which would break AC #1. Files share one global scope; **load order in `index.html` matters** for anything used at load time.
- **Canvas y points down, game angles point up.** Use `pointAroundDoor()` / `canvasRotationForGameAngle()` in `render/layout.js`.
- **Exits must run before entries** in `Game.update()` (SPEC 2.4).
- **There is no brake.** Dropping from manager speed (~120) to intern speed (≤60) takes over a second of friction. Intended (SPEC 2.2); it's why the NEXT bands matter.
- **Frame time is capped at 0.1 s** (`MAX_FRAME_SECONDS`): a lagging tab runs in slow motion instead of jumping.
- **Headless browsers barely run animation frames.** For screenshots use `&advance=`; for scripted checks call `runFrame()` yourself with `requestAnimationFrame` stubbed out.
- **Long walks for lobby arrivals.** Lobby people come out of the elevators on the far left, so their walk-up is long. The animation is timed to the 2 s rule, so they walk briskly.

---

## How AI was used

The Phase 1 code was written with an AI assistant (Claude), see [prompt_log.md](prompt_log.md). The v2 build (all of PLAN.md) was written by Claude (Claude Code, Opus 5.5) working through PLAN.md unattended overnight. The log has the details.
