# Prompt log (Phase 1)

## Tools

- **Claude** (Anthropic), model Claude Opus 5.5, in the Claude desktop app.

Claude wrote all of the Phase 1 code. I directed the work, played the game, and made the design decisions noted below.

---

## 1. Planning the rest of Phase 1

**Prompt:**
> Show me all the steps I need to do based on the spec.

**What happened:** Claude checked the git history: one commit containing only SPEC.md, pushed. It then proposed the file structure used in this repo (one file per class, all numbers in `constants.js`, a render file that never changes state, plain `<script>` tags so the game opens from disk) and a time plan for the coding session.

---

## 2. Writing the code

**Prompt:**
> Now do the coding part.

**What happened:**
- Claude wrote `index.html` and all of `js/`, scoped to Tier 1 from SPEC section 4, with `TODO(AC #n)` comments where each unfinished criterion belongs.
- It wrote `tests/rules_test.js`, which drives `Game.update()` in Node without a browser, and opened the game from disk in a headless browser to check for console errors.
- **One mistake, in the test, not the game:** its first geometry check expected a compartment to be centered on the street opening when the door angle is 180°. The correct angle is 135° (180 + 90 + 45 = 315, not 270). The code was right; the check was fixed.
- Claude did not make fake intermediate commits to pad the history, so the first version of the code went in as one commit. Later fixes went in as their own commits.

---

## 3. How to play

**Prompt:**
> Pushed. How do I play?

**What happened:** An explanation of the controls and the two conflicting passenger types. That explanation became section 2 of the README.

---

## 4. "I can't see a queue"

**Prompt:**
> I can't see any queue right now?

**What happened:** Claude looked at my Safari window (read-only) and confirmed the game was running correctly. The queue is usually 0–1 people because arrivals are every 4 s and people step in quickly. The ramp that makes lines build up is AC #22 (Tier 2). **No code change:** left for Phase 2 and noted in the README.

---

## 5. "Nobody comes out of the lobby"

**Prompt:**
> Nobody is coming out from the lobby?

**What happened:** Correct: lobby spawning is AC #23 (Tier 2). Claude found a trap for whoever continues the project: SPEC 2.5 says only office workers and couriers come from the lobby. If lobby spawning is added before those types exist, the type picker has nothing to choose from and the game would crash with an unclear error. Claude added a readable error in `pickPersonTypeKey()` and a comment at the `TODO(AC #23)`.

---

## 6. "Complaints happen way too easily"

**Prompt:**
> Also, why do I get complaints so easily right now?

**What happened:** Claude wrote a simulated "careful player" that sees the exact door speed, reacts every 0.25 s, and uses ↓ to keep conflicting people apart. It played 40 rounds per setup:

| Setup | Survived to 9:00 | Fired |
|---|---|---|
| Phase 1 as written (only managers and interns, 50/50) | 4 / 40 | 36 / 40 |
| Adding office workers with the SPEC mix (55/20/15) | 30 / 40 | 10 / 40 |
| Lowering push acceleration from 90 to 60 | worse | |

Every complaint was an intern hit by a door that was too fast, and about two thirds happened while a manager and an intern rode at the same time. Diagnosis: the rules matched the SPEC. The difficulty came from Phase 1 having only the two conflicting types, so every arrival was a potential conflict, plus there's no speed meter yet.

Two options were offered: (A) only document it, or (B) add the office worker now, which is one table entry and doesn't change any SPEC rule.

---

## 7. Decision: add the office worker

**Prompt:**
> B

(I chose option B from the previous answer.)

**What happened:**
- Office worker added to `PERSON_TYPES`, and street weights set to the SPEC mix. The courier is still left for Phase 2.
- Rerun on the real code: the simulated player survived about 25 of 40 rounds.
- **Another test mistake, fixed:** the first version of the "all types spawn" check watched one random round, and in one run no intern happened to appear. It now samples the type picker 1000 times, so it no longer depends on luck.

---
---

# Prompt log (v2, the "dream version")

## Tools

- **Claude Code** (Anthropic), model Claude Opus 5.5, in VS Code.

## 8. Inheriting the project

**Prompt:**
> create a clone of this https://github.com/zhangyubooo/monday-855 locally, and commit it to my own public repo as initial commit. […] Explain how the code is structured, what works, and which acceptance criteria look closest to done. Don't change anything yet.

**What happened:** The repo was cloned and re-committed as one initial commit (crediting the original author) to a new public repo. Claude read every file and summarized the structure and criteria status. It found one problem the README missed: several tests used a random source of `() => 0.99`, which only picked the intern because it was last in `PERSON_TYPES`. Adding the courier would have quietly turned them into courier tests.

## 9. Planning

**Prompt:**
> build a plan to create a very high end version of what the spec is asking for. I want it to be beautiful, fun, etc. the dream version if it takes 10 hours of building that is fine

**What happened:** Claude wrote PLAN.md: stay inside the spec's constraints (no libraries, no assets, no sound), add no new mechanics, and get spec-complete before polishing. Sound was flagged as a decision for the owner; the default was to keep the spec's "no sound".

## 10. Building it overnight

**Prompt:**
> i'm signing off for the night, can I set a goal for you to just go through all 7 phases overnight?

**What happened:** Claude worked through PLAN.md on a `v2` branch, committing after each phase. Highlights and mistakes:

- **Rules first.** Courier, arrival ramp, lobby arrivals, title/pause phases and rule events were added. The fragile tests were rewritten to use `gameWithOnly(type)`, and 24 checks were added (55 in total).
- **Visual layer.** The renderer was rewritten as `js/render/*` plus `fx.js`, driven by rule events, with every acceptance criterion's visuals done properly rather than as placeholders.
- **Checking without a human.** Headless Chrome screenshots showed the rules never advancing. Headless Chrome barely runs `requestAnimationFrame` under virtual time. Claude added `#scenario=` URLs with `&advance=` (fast-forward) and `&bot` (an autopilot player). It also wrote a scratch harness that sends real key events and steps frames by hand. The first version of that harness hung, because every manual frame also queued its own animation loop; stubbing `requestAnimationFrame` fixed it.
- **A bug that only appeared when the game was played.** `let` variables in `main.js` were declared after the scenario code that used them. It was caught on the first fast-forward run.
- **Balance.** The first sim run had both bots fired in every round. Logging each complaint showed a real design hole: arrivals stepped into a fast door on the same frame they appeared, giving the player no time to react. The fix was a 2 s walk-up, recorded in SPEC.md "Tuning changes". The bot was also made smarter (plan for the next person, keep margins). Final result: careful bot 98%, sloppy bot 5–10%.
- **A tuning decision deferred to the spec owner.** A 1.2 s final-minute arrival interval made the 8:59 crowd feel better. AC #22 names 1.5 s, so it was documented, not changed.
- **Firefox.** A headless Firefox screenshot came out blank, and then garbled. Copying the canvas into an image showed it renders correctly; the problem was how headless Firefox captures canvases. Safari was not checked.

## 11. Making it addictive

**Prompt (with a screenshot of being fired at 8:55:38, 5 delivered):**
> ok that play was good keep going. this is going to be the next goose game. the best most addictive door game ever. keep to the spec but we want this to be awesome. do not remove more than 30% of the prior code. we want to keep to the spec as well as adding an element of flare, surprise, fun, qwirky, cute, etc. as the game requires

**What happened:** Claude read the screenshot as a first-30-seconds problem. Getting fired in about 23 s probably meant holding Space too long, so the first fix was readable danger where the player is already looking:
- the door's hub got a face
- the rim glows red just before a smack
- new tips: "short pushes work best", "keep the needle in the green"
- a strike log on the end screen saying what each strike was for

Then the fun layer, all visual so the rules and spec stay intact. It went in new files (`surprises.js`, `render/extras.js`) with small hooks elsewhere, about 900 lines added and about 40 removed:
- hops, "+1"s and streak call-outs
- "CLOSE ONE!" for near misses
- rare characters with their own complaint lines
- a pigeon that rides the door
- passing showers and dogs on the sidewalk
- a countdown and a 9:00 cheer
- a doorman rank and best-this-session (memory only, since SPEC §5 rules out saving)
- Space restarts as well as R, after a 1.2 s delay so a still-held Space can't skip the results

Mistakes caught along the way:
- the pigeon's flight speed added a per-frame constant (fixed before it ran)
- the tip card covered the street WAIT sign (moved)
- a key-cap helper left text centered, so "TO TRY AGAIN" overlapped the SPACE key
- a stale test harness was missing the new script (rebuilt from `index.html`)

## 12. More depth, less stress, more cute

**Prompt:**
> the game needs to have more complexity to it. perhaps bad people trying to get in, or more doors to keep track of. it also needs a very simple tutorial. the game shoudl be fun, not a stress ball having to learn every mechanic in the first 30 seconds of the game

**What happened:** Claude pointed out the conflict with the spec's "one circular object" design and asked three questions. Answers:
- troublemakers rather than a second door
- a Classic + Rush split, so Classic stays exactly to the spec
- guided practice for the tutorial

Built:
- **Rush rules**, with 8 new tests.
- **A smarter bot.** It now holds the gate for troublemakers. A careful bot survives about 85% of Rush rounds; a sloppy one that never uses the gates survives 0%.
- **The tutorial**, played through end to end by a scripted harness: all 7 steps in 23 s.
- **A title menu** with T / Space / R.

**Prompt (mid-build):**
> i think the cute factor should be higher. would it still be up to spec if we changed the setting to somethign more like animal crossing? cute animals pushing cute animal babies in their carts? could we build a version like this and allow people to swtich to nintendo mode or omsething?

**What happened:** Claude said yes, as a switchable look, because the spec defines the types by behavior and asks only for flat shapes. It flagged that the mode couldn't use Nintendo's or Animal Crossing's names or characters. The result is an original "Critter look" (C): a cozy animal cast and village scenery, with a duck pushing a stroller of ducklings as the courier.

Mistakes caught along the way:
- a scripted edit stopped halfway on a wrong anchor string, and was re-run
- a new scenario name clashed with an existing one (`rush`), renamed `rushMode`
- the owl receptionist was drawn on top of the human one

## 13. Tuning for "tense but fair"

**Prompts:**
> ok, how would I improve the fun factor of this game. here is what the spec says — use extra time to tune the numbers so the round feels tense but fair.

> do all 1-4, log as tuning changes

**What happened:** Claude ran the sim first. The careful bot made it 99% of the time and the sloppy bot was fired at about 8:57, so the game was too easy for a skilled player and too harsh for a new one, and 8:59 wasn't crowded. It proposed four changes: a calmer opening (an arrival mix per part of the round), more couriers and conflict at 8:59, a lobby rush at 8:59, and 1.2 s at 8:59 (amending AC #22). It swept about 15 variants with a scratch script before picking one. The harder 8:59 dropped Rush to 40%, so troublemakers now stop arriving at about 8:59:20.

Result: careful 79% in Classic and 70% in Rush. The sloppy bot reaches 8:59 in 85% of rounds, up from 47%. The 8:59 street line went from 2.3 to 3.4 people. The 4–6 target was missed; SPEC.md "Tuning changes" says why.

## 14. "It's not clear what I'm doing wrong"

**Prompts:**
> i still haven't beet the game its hard and I don't know when i am getting these complaints it's not clear what I'm doing wrong

> also I let lots of bad guys in and din't get complainsts?

**What happened:** Claude first checked the rules in the browser: a troublemaker getting in *was* a strike, but it only filled a slip labelled "COMPLAINTS", so it looked like a random complaint. The fix was to explain every strike when it happens:
- a card under the counter, now labelled STRIKES: "STRIKE 1 OF 3: TOO FAST · Coffee intern: 63 °/s, over their max of 60 · Let go of SPACE sooner while they ride"
- a TOO FAST / TOO SLOW / GOT IN stamp on each complaint bubble
- ▼ SLOWER / ▲ FASTER tags over riders *before* they complain, since a too-fast complaint is instant
- rare looks named with their type on the end screen ("The CEO (Late manager)")

Also fixed: the end screen could show "4 / 3" when two riders complained on the same frame.

## 15. Rewards and more to do

**Prompts:**
> is there any reward for all these deliveries? any other game mechanics that might make it fun?

> do all 1-4

**What happened:** Claude proposed four Rush-only mechanics, keeping Classic as the spec describes (§5 rules out saved progress and levels, so every reward lives inside one round):
1. earning a strike back with 10 happy deliveries in a row
2. tips and VIPs
3. 30-second jobs
4. perks bought with tips (1 coffee break, 2 security, 3 elevator music)

Rules first (`js/rush.js` plus Game methods, 23 new tests), then the bot learned to use perks so the sim could measure them. The first prices made Rush too easy (the careful bot bought 12 perks a round and survived 93%). The streak bonus was capped at x2, VIP tips stopped being multiplied, and prices went up twice. The careful bot ended at 88% with about 8 perks a round. Then came the visuals, in `js/render/rush_hud.js`, checked in headless Chrome in both looks.
