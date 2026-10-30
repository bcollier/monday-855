# Monday, 8:55 — SPEC

A one-screen browser game about being the doorman of a revolving door during the worst five minutes of the week.

---

## 1. The Game

It is Monday, 8:55 AM. Everyone in the city is trying to get into the office building before 9:00, and every one of them has to go through **your revolving door**.

You push the door (hold **Space**) and decide who gets to step in (hold **↑ / ↓** to make a queue wait). The catch: **the door has one speed, but every person wants a different speed.** A manager late for a meeting wants it fast. An intern carrying a tray of six coffees wants it slow. If the door spins faster than someone can handle, the wing hits them. If it crawls for too long, they get furious. Either way they complain — and three complaints get you fired.

Because all four compartments share one rotation speed, you can't keep everyone happy at the same time. The interesting decisions are **who you let in together**: making the manager wait one turn so he doesn't share the door with the coffee intern, or speeding up to clear a queue and risking a collision.

### How it should feel

Tense and funny, like a sitcom cold open. The screen should feel crowded and slightly out of control by 8:59. Failure should be funny, not punishing — a complaint is a person yelling "MY LATTE!", not a sad sound. A round lasts about 3 minutes, and the player should immediately want to try again.

### What makes it different from existing games

It is not a traffic or crowd-routing game: the player never moves people, only the door's speed and two "wait" gates. The whole game is one circular object and the trade-off created by its shared speed.

---

## 2. Full Intended Feature Set

Everything below is the complete game I want. Phase 1 will not finish all of it — see **4. Priorities**.

### 2.1 Glossary

| Term | Meaning |
|---|---|
| **Door** | A circle with 4 wings at 90° to each other, rotating around its center. |
| **Compartment** | The space between two neighboring wings. There are 4. |
| **Street side / Lobby side** | Bottom of the screen = street (outside). Top = lobby (inside the building). |
| **Opening** | The door's housing is closed on the left and right (curved glass walls). It is open toward the street (straight down) and toward the lobby (straight up). |
| **Angle convention** | As seen on screen: 0° = right, 90° = up (lobby), 180° = left, 270° = down (street). Angles increase **counterclockwise**. |
| **Aligned** | A compartment is aligned with an opening when the compartment's center angle is within **±20°** of that opening (90° or 270°). |
| **Comfort range** | The door speeds (in degrees per second) a person is OK with, e.g. 30–120 °/s. |
| **Complaint** | A strike against the player. 3 complaints = game over. |
| **Delivered** | A person who has exited on the opposite side from where they entered. |

### 2.2 The door

- The door always rotates **counterclockwise**. It never rotates backwards.
- **Holding Space** accelerates the door at **90 °/s²**.
- **When Space is released**, friction slows the door at **45 °/s²** until it stops at 0.
- Maximum speed is **200 °/s**.
- The door has inertia: speed changes only through the two rates above, never instantly.

### 2.3 Queues and gates

- People arrive and line up in a **queue** outside each opening: one queue on the street side, one on the lobby side.
- By default, the person at the front of a queue **enters automatically** when a compartment is aligned with their opening and has room.
- **Holding ↓** stops the street queue from entering. **Holding ↑** stops the lobby queue from entering. People already inside the door are not affected.

### 2.4 Entering, riding, exiting

- **Capacity:** a compartment holds up to **2 people**, or **1 courier** (couriers take the whole compartment).
- **Entering:** while a compartment is aligned and has room, people step in one at a time, at least **0.3 s apart**. So a slow door lets two people into the same compartment; a fast door may only let one in. A courier at the front of the queue waits until an *empty* compartment is aligned, and everyone behind them waits too.
- **Riding:** while inside, a person moves with their compartment. Their position is just the compartment's angle (they do not walk independently).
- **Exiting:** when a compartment becomes aligned with the **opposite** opening, everyone in it who came from the other side steps out automatically and counts as **Delivered**. Exiting happens before entering in the same alignment, and cannot be blocked by the gate keys.

### 2.5 People

| Type | Comfort range (°/s) | Notes | Street spawn share | Lobby spawn share |
|---|---|---|---|---|
| Office worker | 30–120 | Most common | 55% | 70% |
| Late manager | 70–170 | Hates slow doors | 20% | 0% |
| Coffee intern | 20–60 | Narrow range, very easy to upset | 15% | 0% |
| Courier with cart | 15–70 | Takes a whole compartment | 10% | 30% |

Each type must be visually distinguishable at a glance (different color and/or a simple icon or letter).

**The Late manager and the Coffee intern are the core conflict of the game.** Their comfort ranges (70–170 and 20–60 °/s) do not overlap, so when both are riding at the same time, no door speed keeps both of them comfortable. These two types are required from the start (Tier 1). If only these two types exist yet, street spawns are 50% each. The Office worker and the Courier add variety and are Tier 2.

### 2.6 Complaints

- **Too fast:** if the door's speed goes **above** a rider's comfort range, that person complains **immediately**.
- **Too slow:** if the door's speed stays **below** a rider's comfort range for **more than 1.5 seconds in a row**, that person complains. The timer resets whenever the speed is back inside or above the range.
- Each person can complain **at most once**. After complaining they stay red ("furious") for the rest of their ride.
- People waiting in a queue never complain. Only riders do.
- A complaint shows a short speech bubble above the person (e.g. "MY LATTE!", "I HAVE A 9 AM!", "WATCH IT!") and fills one of the 3 strike icons.

### 2.7 Clock, spawning, winning and losing

- The game clock runs from **8:55:00 to 9:00:00** (5 game minutes) over **180 real seconds**.
- **Street spawns** get faster as 9:00 approaches:
  - 8:55–8:57: one person every **4 s**
  - 8:57–8:59: one person every **2.5 s**
  - 8:59–9:00: one person every **1.5 s**
- **Lobby spawns:** one person every **10 s** for the whole round.
- **Lose — "YOU'RE FIRED":** 3 complaints.
- **Lose — "LOBBY GRIDLOCK":** either queue has **more than 8** people waiting. This rule is required (Tier 1): without it, the player could win by holding ↓ for the whole round and never letting anyone in.
- **Win — "MADE IT":** the clock reaches 9:00 without losing.
- The end screen shows: result, number of people delivered, number of complaints, and "Press R to try again".

All numbers in this section are starting values. They should live as named constants in one place so they can be tuned. If tuning changes a number, update this SPEC in a clearly marked section at the bottom rather than rewriting the original.

### 2.8 Screen and feedback

- **Top-down view**, fixed canvas of **960 × 640 px**. The door is in the center, the street queue below it, the lobby queue above it.
- **Clock** at the top center (e.g. `8:57`).
- **3 strike icons** at the top right.
- **Delivered counter** at the top left.
- **Speed meter:** a horizontal bar showing the door's current speed from 0 to 200 °/s. The comfort ranges of everyone currently riding are drawn on the bar as colored bands, so the player can see where the "safe" speed is (or that there isn't one).
- **Mood on riders:** green = comfortable, yellow = too slow and the 1.5 s timer is running, red = has complained.
- **Gate feedback:** when ↑ or ↓ is held, show a visible barrier or "WAIT" sign in front of that queue.
- **Title screen:** game name, one-line premise, controls, "Press Space to start".
- Visual style: simple flat shapes, no image assets required.

### 2.9 Controls

| Key | Action |
|---|---|
| **Space** (hold) | Push the door — speeds it up |
| **↓** (hold) | Street queue waits |
| **↑** (hold) | Lobby queue waits |
| **R** | Restart (on the end screen) |
| **P** | Pause / unpause |

---

## 3. Acceptance Criteria

Each item should be checkable by playing the game (with the debug overlay in #27 where a number has to be read).

**Door**
1. The game runs by opening `index.html` in a current desktop browser (Chrome, Firefox or Safari) with no install step and no errors in the console.
2. A door with 4 wings is drawn at the center of a 960 × 640 canvas, with closed housing walls on the left and right and openings at the top and bottom.
3. Holding Space makes the door rotate counterclockwise and speed up gradually; it reaches 90 °/s after about 1 second of holding from a standstill.
4. Releasing Space makes the door slow down gradually and come to a full stop; it never rotates backwards.
5. The door's speed never exceeds 200 °/s, no matter how long Space is held.

**Queues, entering, exiting**
6. People appear on the street side and form a visible line below the door.
7. When a compartment becomes aligned with the street opening and has room, the front person of the street queue moves into it automatically.
8. While ↓ is held, no one from the street queue enters, even when a compartment is aligned; releasing ↓ lets them enter again at the next alignment.
9. ↑ does the same for the lobby queue.
10. A person inside the door rotates with their compartment and stays inside it.
11. When that compartment reaches the opposite opening, the person steps out, walks off screen, and the Delivered counter increases by 1.
12. With the door moving slowly (under about 60 °/s), two office workers can end up in the same compartment; no compartment ever holds more than 2 people.
13. A courier only enters an empty compartment, and no one else enters a compartment holding a courier.

**People and complaints**
14. Both the Late manager (70–170 °/s) and the Coffee intern (20–60 °/s) appear in the street queue during a round and look different from each other. With one of each riding at the same time, every possible door speed makes at least one of them uncomfortable.
15. All four people types appear during a round, and each is visually distinguishable.
16. Speeding the door above a rider's comfort range causes an immediate complaint from that rider.
17. Keeping the door below a rider's comfort range for more than 1.5 s causes a complaint; dropping below the range for less than 1.5 s and then speeding back up does not.
18. A rider who has complained turns red and never causes a second complaint.
19. Each complaint shows a speech bubble above the person and fills one strike icon.
20. Riders are green when the speed is inside their range and yellow while the "too slow" timer is running.

**Round structure**
21. The clock starts at 8:55 and reaches 9:00 after 180 real seconds (±2 s).
22. Street arrivals are noticeably more frequent after 8:57 and again after 8:59 (intervals of 4 s, 2.5 s, 1.5 s).
23. People occasionally arrive on the lobby side (about every 10 s) and travel out to the street.
24. The third complaint ends the game with a "YOU'RE FIRED" screen.
25. A queue of more than 8 people ends the game with a "LOBBY GRIDLOCK" screen. Holding ↓ from the start of a round leads to this screen well before 9:00.
26. Reaching 9:00 ends the game with a "MADE IT" screen; every end screen shows people delivered and complaints, and pressing R starts a fresh round.

**Interface**
27. Pressing D toggles a debug overlay showing the door's exact speed in °/s and the current clock time in real seconds.
28. The speed meter shows the current speed and draws each rider's comfort range as a band.
29. Holding ↑ or ↓ shows a visible "WAIT" barrier in front of that queue.
30. A title screen shows the name, premise and controls; Space starts the round.
31. P pauses and unpauses the game; the clock and the door stop while paused.

---

## 4. Priorities

If time runs out, finish the higher tiers first. **A game with only Tier 1 working is a complete, playable game.** Tier 2 makes it interesting. Tier 3 is polish.

**Tier 1 — the core loop (must have)**
Criteria **1–11, 14, 16, 17, 21, 24, 25, 26**.
The door, inertia, gates, entering/riding/exiting, the two conflicting people types (Late manager and Coffee intern), the two complaint rules, the clock, and both ways to lose: complaints and gridlock. Gridlock is here because without it, holding ↓ forever is a guaranteed win. The two conflicting types are here because with only one type there is no trade-off and no game.

**Tier 2 — more variety and better feedback (should have)**
Criteria **12, 13, 15, 18–20, 22, 23, 27, 28**.
The Office worker and Courier types, capacity rules, mood colors, the spawn ramp, lobby-side people, the debug overlay, and the speed meter with comfort bands. The speed meter (#28) is the most important item in this tier: without it the player has to guess everyone's range.

**Tier 3 — polish (nice to have)**
Criteria **29–31**, plus funny speech-bubble lines that differ by person type.

**Drop first:** Tier 3, then the pause key (#31).
**Do not drop:** anything in Tier 1. In particular, do not cut the game down to one person type or remove gridlock to save time — either change makes the game trivially easy to win.

---

## 5. Out of Scope

Not part of this game, even if there's time left: sound and music, multiple levels or days, a lobby temperature / cold-air mechanic, touch or mobile controls, high-score saving, people walking freely inside a compartment, and any physics engine. Please don't add these; use extra time to tune the numbers so the round feels tense but fair.

---

## 6. Technical Constraints

- Plain **HTML + CSS + JavaScript** with one `<canvas>`. No frameworks, no build step, no external libraries, no image assets.
- Must run by opening `index.html` directly in a browser (or with `python3 -m http.server`).
- The canvas is a fixed 960 × 640; window resizing does not need to be handled.

---

## Tuning changes (v2)

*Added during the v2 build. The original text above is unchanged; this section records where the game now differs from it, and why.*

| Change | Was | Now | Why |
|---|---|---|---|
| **Arrival walk-up** (new rule, `ARRIVAL_WALK_SECONDS`) | A new arrival could step in on the same frame they appeared | A new arrival takes **2 s** to walk up before they can step in. They count toward the gridlock limit straight away. | Someone arriving while a compartment was lined up stepped straight into a fast door with no chance to react. That caused most complaints in simulated play (a "careful" bot survived 3% of rounds). With the walk-up, the speed meter's NEXT preview gives the player time to slow down or hold the gate. Fits §2.3: "people arrive and line up". |
| Queue layout | Straight lines out of each opening | Each line runs 3 spots straight out, then turns (street to the right, lobby to the left) | Makes room for the speed meter (bottom) and the clock (top) without covering a queue. Visual only. |

| **Street arrival mix by part of the round** (`streetMix` in `STREET_SPAWN_RAMP`) | One mix all round (§2.5 table: workers 55, managers 20, interns 15, couriers 10) | **8:55–8:57:** 85 / 6 / 6 / 3. **8:57–8:59:** 70 / 13 / 10 / 7. **8:59–9:00:** the §2.5 table. Lobby mix unchanged. | New players were fired around 8:57 and never saw the final minute (sloppy bot: average round 135 s). The opening is now calm enough to learn the door, and the manager/intern conflict arrives in numbers with the crowd. All four types still appear from the start, and office workers are the most common in every part (AC #14, #15). |
| **8:59 street interval** (`STREET_SPAWN_RAMP`, last entry) | 1.5 s | **1.2 s** | The final minute wasn't crowded (§1 asks for "crowded and slightly out of control by 8:59"): the street line averaged 2.3 people. **Changes AC #22**, which now reads "intervals of 4 s, 2.5 s, 1.2 s". |
| **Lobby rush at 8:59** (`LOBBY_FINAL_MINUTE_SPAWN_INTERVAL`) | One every 10 s all round | One every 10 s until 8:59, then one every **6 s** | Pressure from both sides at the end, and gridlock becomes a real (rare) way to lose. AC #23's "about every 10 s" still holds for most of the round. |
| **Rush: troublemaker cut-off** (`TROUBLEMAKER_LAST_SECONDS`) | Every ~15 s until the end | None arrive after about 8:59:20 (156 s) | With the busier 8:59, troublemakers in the last seconds dropped the careful bot to 40% in Rush. The cut-off keeps Rush a little harder than Classic. Rush is a v2 addition, so no AC is affected. |

**Tuning goal** (session of 2026-10-30): "tense but fair". A skilled player usually makes it, but narrowly, and a new player reaches the 8:59 climax most of the time. Measured with `node tools/sim.js 500` (careful bot: perfect information, uses the gates; sloppy bot: slow reactions, never uses the gates):

| | Before | After |
|---|---|---|
| Classic, careful: made it | 99% | **79%** (fired 19%, gridlock 1%) |
| Classic, sloppy: reached 8:59 | 47% | **85%** (made it 10%) |
| Classic, sloppy: average round | 135 s | **157 s** |
| Classic, careful: street line during 8:59 | 2.3 people | **3.4** (longest line averages 6.3) |
| Rush, careful: made it | 85% | **70%** |

**Not reached:** a street line averaging 4–6 people during 8:59. Settings that got there (1.0–1.1 s intervals, more couriers) dropped the careful bot to 45–65%, because a skilled player clears the line quickly. 3.4 people with frequent peaks of 6–7 was the best balance. The numbers come from bots, so play-testing with people should have the final say.

---

## Additions (v2)

*Added on top of the spec. Classic mode, the default when Space is pressed on the title screen, is the game described above with the tuning changes in the previous section, and meets every acceptance criterion (AC #22 as amended there).*

- **Rush mode** (R on the title screen). Classic plus *troublemakers*: someone who must not get in joins the street line about every 15 s from 0:20 (`TROUBLEMAKER_*` in `js/constants.js`). If ↓ is held while one is at the front of the line (and has finished walking up), they give up after 2.5 s and leave. If one steps into the door it counts as a strike, the same as a complaint. Any door speed suits them, so they never complain about speed, and they don't count as delivered. This gives the gates a second job and a new trade-off: holding ↓ keeps the troublemaker out but stalls everyone behind them.
- **Rush extras** (`js/rush.js`), so deliveries earn something and a bad start isn't a lost round:
  - *Tips:* $1 per happy delivery (rider never complained), $2 from 5 happy deliveries in a row. A VIP (8% of street arrivals) tips $10 for a ride that never went yellow, $5 otherwise.
  - *Earn a strike back:* with a strike on the board, 10 happy deliveries in a row remove one. A new strike restarts the count.
  - *Jobs:* from 0:25, a 30 s job starts every 40 s (e.g. "Deliver 2 interns without a spill", "No strikes for 30 seconds"). Done: +$8 and a free coffee break. Missed: nothing.
  - *Perks* (keys 1 / 2 / 3): coffee break, $50: the rules run at half speed for 5 real seconds, so the round lasts a little longer. Security, $30: every troublemaker in the street line leaves. Elevator music, $40: riders' comfort isn't checked for 6 s.
  - Balance (careful bot, 400 rounds): Rush made it 70% → 88% with the extras. Perk prices were raised twice (from $10/$6/$8) because the bot was buying 12 a round.
- **Tutorial** (T on the title screen). Seven guided steps in a practice round: no clock, no automatic arrivals, strikes don't count, the round never ends.
- **Critter look** (C at any time). Only a different look: every animal is still one of the four passenger types (or a troublemaker), with the same comfort ranges and rules.
