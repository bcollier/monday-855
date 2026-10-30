# Monday, 8:55 — The Dream Version: Build Plan

Goal: take the Phase 1 prototype to a version that meets all 31 acceptance criteria in SPEC.md and looks and feels like a finished, polished indie game. Budget: about 10 hours of building, in 7 phases. Each phase ends with a commit and a playable game.

---

## 0. Ground rules

**Stay inside the spec.** Everything below works within SPEC §5 (out of scope) and §6 (technical constraints):

- plain HTML, CSS and JS
- one `<canvas>`
- no libraries, build step or image assets
- the game opens from `file://`

All art is drawn in code. Nothing in §5 gets added: no sound, no levels, no high scores, no touch controls. If you want to break one of those rules on purpose, see §9.

**No new mechanics.** The spec author says that extra time should go into tuning, not features. The game should get better through *feel*, *readability* and *tuning*, not through new systems. Every addition below is one of:
- a way to *see* a rule the game already has, or
- a reaction to something that already happens.

**Visuals can't break acceptance criteria.** Specifically:

| Criterion | What must stay true |
|---|---|
| #21 | No slow motion and no hint pauses during a round. The clock must still take 180 real seconds (±2 s). |
| #2 | The 4 wings, the glass walls and the two openings must stay obvious under the art. |
| #1 | No console errors. |
| #12 / #13 | You can still count how many people are in each compartment. |

**Get spec-complete before making it beautiful.** Phase 1 ends with every criterion met using plain visuals. If the build stops early, the game is still complete.

---

## 1. Art direction: "flat editorial illustration, Monday morning"

SPEC §2.8 asks for "simple flat shapes". The goal is flat shapes done with taste, like a magazine illustration: a limited palette, flat offset shadows, no realistic detail.

**Palette.** Warm cream and terrazzo lobby, wet slate street, a brass door, and saturated character colors that stand out against both.
- Morning sun comes from the lower left, so every object casts the same long flat shadow up and to the right. That one rule makes the whole scene feel lit and coherent.

**Lobby (top half).**
- Terrazzo floor, generated once and cached on an offscreen canvas.
- A brass inlay ring around the door.
- The edge of a reception desk, two potted plants and an elevator bank. People leaving into the lobby walk toward the elevators.

**Street (bottom half).**
- Sidewalk slabs, a curb, and a strip of road with a crosswalk.
- Puddles from overnight rain, with a slow highlight drifting across them.
- An ambient crowd that hurries past along the sidewalk and gets denser after 8:59. These walkers are scenery only and never join the queue.

**The door** is the hero of the screen.
- Brass rim, glass walls with a sweeping reflection, glass wings edged in brass with push bars.
- A floor mat with a made-up company logo (e.g. *Consolidated Holdings*).
- Above about 120 °/s the wings leave faint motion trails, so speed is something you feel, not just read off the meter.

**The queues.** Brass posts with belt barriers mark out each line.
- Floor markers show the 8 legal queue spots, and a red line marks the 9th spot: **gridlock**. The losing condition is drawn on the floor.
- The **WAIT barrier (#29)** is a belt that snaps shut across the line's entrance with a "PLEASE WAIT" sign while you hold ↓ or ↑.

**Text.** System fonts only, since external fonts are off-limits. The main clock is a hand-drawn flip clock.

**Sharp on Retina screens.** The game stays 960×640 logically, but the canvas draws at `devicePixelRatio` so lines stay crisp.

---

## 2. Characters (original designs, seen top-down)

You recognise each type by its **silhouette** first, then its color, then a small letter badge. The letter is kept for color-blind players and for checking criteria.

| Type | Silhouette | Warning before they complain | Complaint reaction |
|---|---|---|---|
| **Office worker** | Shoulders in one of 5 muted shirt colors, varied hair, lanyard, phone glow | Glances at their phone | Phone spins out of their hand |
| **Late manager** | Navy suit, red tie tip, briefcase. Walks fast | Taps their watch when the door is too slow, faster as the 1.5 s timer runs | Papers burst out of the briefcase |
| **Coffee intern** | Arms out holding a tray of 6 lidded cups | Cups wobble more as the door nears 60 °/s | Cups fly out, and a **brown splash stays on the floor for the rest of the round** |
| **Courier** | Bike helmet, cart stacked with taped boxes; fills a whole compartment | Boxes slide as the door nears 70 °/s | Boxes tumble off the cart |

The warning signs matter most. They tell the player a complaint is coming *before* the meter does, on the character they're looking at.

**Speech bubbles (#19, Tier 3 "funny lines").** Each type gets a pool of original lines for "too fast" and another for "too slow". For example:
- **Intern, too fast:** "MY LATTE!", "THAT WAS SIX ORDERS!"
- **Intern, too slow:** "THE FOAM IS DYING"
- **Manager, too slow:** "I HAVE A 9 AM!", "ANY DAY NOW!", "IS THIS DOOR UNIONIZED?"
- **Manager, too fast:** "MY HAIR!"
- **Courier:** "SIGN FOR THIS, I DARE YOU"

Bubbles pop in with a squash and slight overshoot, wobble while visible, and stay readable for about 1.6 s.

**Mood rings (#18, #20).** Every rider has a ring around them:
- **Green:** comfortable.
- **Yellow:** too slow. The ring drains like a pie chart over the 1.5 s grace period, so the player sees exactly how long they have.
- **Red:** has complained. Red riders also get a small angry-cloud icon, so mood never depends on color alone.

---

## 3. Readability: making the shared-speed problem visible

This is where the game becomes fun. The spec's core idea is "one speed, many people", so the player should *see* that conflict.

**Speed meter (#28)** at the bottom center, about 560 px wide:
- Ticks from 0 to 200 °/s, with a brass needle for the current speed.
- Each rider gets their own row showing their comfort range as a band, with a small portrait at its end.
- The overlap of all bands is highlighted as a glowing **SAFE ZONE**.
- When there is no overlap, a red striped **NO SAFE SPEED** stamp appears. This is the manager-plus-intern moment the README says the player must see.
- **Planned: preview bands.** The person at the front of each queue shows as a faint dashed band. The player can see "if I let this intern in, there will be no safe speed" and hold ↓ in time. This is the one feature that makes the trade-off a decision instead of a surprise.

**Other on-screen information:**
- **Strike icons (#19):** three pink slips at the top right. A complaint stamps one red and shakes the screen a little.
- **Delivered counter:** at the top left. The number ticks up and bounces.
- **Queue pressure:** the floor markers light up amber at 6 people and red at 8.

**Clock tension.** At 8:59:
- the flip clock turns red and pulses like a heartbeat
- the edges of the screen darken slightly
- the background crowd gets denser

The clock never changes speed.

---

## 4. Animation and polish

Phase 1 teleports people into the door. In the new version, everything moves smoothly.

- **Arrivals:** people walk in from off-screen to their spot in line. People behind them shuffle forward when the line moves.
- **Stepping in:** about a 0.15 s glide from the queue spot to the compartment.
  - The *rule* still treats the person as having entered instantly, so no criterion changes.
  - Riders slide smoothly into place, which fixes the README's "other rider jumps to the middle" issue.
- **Leaving:** the person walks out toward the elevators or the street.
- **Waiting in line:** people fidget slightly in place. Managers turn to look at the clock.
- **Complaints:** a small screen shake, a burst of particles specific to the type, and the floor stain for interns. Shake is turned off when the system's reduced-motion setting is on.
- **The door:** the brass glints as it turns, the wings blur at high speed, and the floor mat rotates with it.

---

## 5. Screens and onboarding

**Title screen (#30).**
- The real scene, idling: the door turns slowly and a few people walk past.
- The flip clock shows 8:54:59.
- Title "Monday, 8:55", the one-line premise, and a controls card drawn as a sign on a brass post.
- "Press SPACE to start". The clock flips to 8:55 and the round begins without a cut.

**Pause (#31).**
- P pauses and dims the screen, freezing the clock and the door.
- The game also pauses itself when the browser tab loses focus, which goes well with the existing key-release handling on blur.

**Hints in the first round.** Short tips appear once per page load (not saved, since saving is out of scope):
- "Hold SPACE to push"
- "The intern hates speed"
- "NO SAFE SPEED: hold ↓ to keep them apart"

They're drawn on top and never pause the game, because of criterion #21.

**End screens (#24–26).** They must show the result, delivered count, complaints, and "Press R".

| Ending | Animation | Joke line |
|---|---|---|
| **YOU'RE FIRED** | A pink slip slides in and gets stamped | *"HR would like a word."* |
| **LOBBY GRIDLOCK** | The crowd spills past the red line | *"The fire marshal has questions."* |
| **MADE IT** | The clock strikes 9:00 and the door coasts to a stop | *"Nobody will ever thank you."* |

Below that, a short report card: lattes saved, longest run without a complaint, and who you hit.

---

## 6. Code changes

The existing architecture is good, so the plan keeps it and extends it.

**Kept and extended:**
- `constants.js`, `door.js`, `person.js`, `queue.js` and `game.js` keep the rules.
- `Game` still never draws, and drawing still never changes the rules.

**New pieces:**
- **Events from the rules.** `Game` records events each frame (`spawned`, `entered`, `exited`, `complained`, `roundEnded`). Other code reads them; rules never wait on visuals.
- **`fx.js`, the visual-only layer.** It turns events into tweens, particles, speech bubbles, screen shake and floor stains. It has its own state, so `render.js` can stay read-only.
- **Game phases.** `Game.phase` becomes `'title' | 'playing' | 'paused' | 'ended'`. Tests can then check that the clock doesn't advance on the title screen or while paused.
- **Fixed timestep.** The rules update in steps of exactly 1/120 s, with leftover time carried to the next frame. The same inputs always give the same result, which makes tests and the balancing bot reliable. The existing 0.1 s cap on frame time stays.
- **Drawing split into files** under `js/render/`: `art.js`, `scene.js`, `door.js`, `people.js`, `hud.js`, `meter.js`, `screens.js`. They load in order from `index.html` as plain scripts, not modules (README pitfall).
- **Debug tools, on with D (#27).**
  - The overlay shows exact speed, real seconds, frame rate, the current spawn interval and queue lengths.
  - While it's on, keys 1–4 add a worker, manager, intern or courier to the street queue, so #12–#14 can be checked by eye in seconds.
  - Loading `index.html#scenario=conflict` starts with a manager and an intern already riding.
- **Tests.**
  - Fix the `() => 0.99` problem from the earlier review. Tests that need a specific type should place that person by hand.
  - Add tests for the courier blocking the line, the arrival ramp at 72 s and 144 s, lobby arrivals every 10 s split 70/30, pause, title, and the events list.
- **`tools/sim.js`, a balancing bot.** It brings back the author's simulated player as a script in the repo, in a "careful" version and a "sloppy" version, so tuning decisions rest on numbers.

---

## 7. Phases

| # | Phase | Hours | Done when |
|---|---|---|---|
| 0 | **Foundations:** fixed timestep, events, phases, sharp Retina canvas, split drawing files, fix fragile tests | 1.0 | Old tests pass, the game looks exactly as it did before, no console errors |
| 1 | **Spec-complete with plain visuals:** courier, arrival ramp, lobby arrivals, D overlay and debug spawns, P pause, simple title, simple meter/rings/barrier/strikes/bubbles | 1.25 | **All 31 criteria met.** README status table updated. Commit and tag `spec-complete` |
| 2 | **Readability:** full speed meter with safe zone, NO SAFE SPEED and preview bands; pie-timer mood rings; queue floor markers and gridlock line | 1.5 | A new player can explain why they got a complaint. The bot is rerun |
| 3 | **Art:** scene, door and the four characters, all in the art direction above | 2.5 | Screenshot review: every criterion is still readable under the art |
| 4 | **Animation:** walking, stepping in, fidgeting, complaint reactions, floor stains, shake, door glint and blur, 8:59 tension | 1.75 | 60 fps steady with a full screen. Reduced-motion setting respected |
| 5 | **Screens and onboarding:** full title, end screens with report card, first-round hints, pause screen | 1.0 | Pressing R gets you back to playing in under a second |
| 6 | **Balance and finish:** bot tuning, a "Tuning changes" section at the bottom of SPEC.md (as SPEC §2.7 asks), README rewrite, prompt_log, check in Chrome, Firefox and Safari | 1.0 | Balance targets below are met |
| | **Total** | **≈ 10** | |

**Balance targets (Phase 6):**
- The careful bot survives about 65–75% of rounds.
- The sloppy bot (reacts every 0.6 s, never uses the gates) loses most rounds, mostly by getting fired.
- The street queue averages 4–6 people during 8:59. That's the "crowded and slightly out of control" feel from SPEC §1.

Every changed number gets recorded in SPEC.md, not just in `constants.js`.

**Checking the work.** After each phase:
- run `node tests/rules_test.js`
- check `index.html` in a browser by taking screenshots of fixed moments (`#scenario=` makes these repeatable)

Running Node and a browser here needs your permission. Your settings blocked the test run earlier.

**Commits.** One commit per phase, listing the criteria it touches. README and prompt_log are updated as I go, matching how the original author worked.

---

## 8. Risks

- **The art hides the rules.** In Phase 3, the wings, riders and band colors must read at a glance. The fix is to keep wings high-contrast and keep the letter badges.
- **Animation vs. rules.** Gliding into the compartment is visual only, but the gridlock count and capacity are based on rule state, so a person still walking toward the line already counts toward gridlock. Arrival walks are kept short (under about 0.5 s) so the two never noticeably disagree.
- **Performance.** Static layers are cached on offscreen canvases. Particles are capped at about 300.
- **Too easy after the readability work.** The preview bands make the game much fairer. If the bot wins over 85%, tighten the arrival ramp, not the comfort ranges, which are the spec's core conflict.

---

## 9. Decisions for you

1. **Sound.** SPEC §5 rules it out, but it's the biggest single boost to "fun" not in this plan: the door whoosh, a coffee splash, a rising murmur at 8:59. Recommendation: keep to the spec. If you want it anyway, it can be added after Phase 6 as optional, off by default, using browser audio generated in code with no audio files.
2. **Everything else in SPEC §5** (levels, saved scores, touch controls) stays out unless you say otherwise.
