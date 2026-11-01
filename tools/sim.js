// sim.js
// Plays many rounds with the autopilot (js/autopilot.js) and reports how they went,
// so balance changes are based on numbers. Run from the repo root:
//   node tools/sim.js            # 200 rounds each of the careful and sloppy player
//   node tools/sim.js 500        # more rounds
//   node tools/sim.js 200 rush   # Rush mode (troublemakers)
// Loads the rule files through tools/load_rules.js: no browser needed.
const { loadRules } = require('./load_rules');
const { Game, createAutopilot, autopilotControls, FINAL_MINUTE_STARTS_AT, SIMULATION_STEP } = loadRules(['autopilot']);

const rounds = Number(process.argv[2]) || 200;
const mode = process.argv[3] || 'classic';

function playRound(styleName) {
  const game = new Game(Math.random, mode);
  const pilot = createAutopilot(styleName);
  const complaints = [];
  let finalMinuteQueueSum = 0;
  let finalMinuteSamples = 0;
  let maxStreetQueue = 0;
  while (game.phase === 'playing') {
    game.update(SIMULATION_STEP, autopilotControls(game, pilot, SIMULATION_STEP));
    for (const event of game.takeEvents()) {
      if (event.type === 'complained') complaints.push(`${event.person.typeKey}/${event.reason}`);
      if (event.type === 'breach') complaints.push('troublemaker/breach');
    }
    maxStreetQueue = Math.max(maxStreetQueue, game.streetQueue.length);
    if (game.secondsElapsed >= FINAL_MINUTE_STARTS_AT) {
      finalMinuteQueueSum += game.streetQueue.length;
      finalMinuteSamples++;
    }
  }
  return {
    endReason: game.endReason,
    tips: game.stats.tipsEarned,
    earnedBack: game.stats.strikesEarnedBack,
    jobs: game.stats.jobsDone,
    perks: game.stats.perksUsed,
    seconds: game.secondsElapsed,
    delivered: game.deliveredCount,
    complaints,
    maxStreetQueue,
    finalMinuteQueue: finalMinuteSamples ? finalMinuteQueueSum / finalMinuteSamples : null,
  };
}

for (const styleName of ['careful', 'sloppy']) {
  const results = Array.from({ length: rounds }, () => playRound(styleName));
  const count = (reason) => results.filter((r) => r.endReason === reason).length;
  const average = (values) => values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
  const complaintKinds = {};
  for (const r of results) for (const c of r.complaints) complaintKinds[c] = (complaintKinds[c] || 0) + 1;
  const reachedFinal = results.filter((r) => r.finalMinuteQueue !== null);
  console.log(`\n${styleName} player, ${mode}, ${rounds} rounds`);
  console.log(`  made it ${(100 * count('madeIt') / rounds).toFixed(0)}%   fired ${(100 * count('fired') / rounds).toFixed(0)}%   gridlock ${(100 * count('gridlock') / rounds).toFixed(0)}%`);
  console.log(`  average round ${average(results.map((r) => r.seconds)).toFixed(0)} s, delivered ${average(results.map((r) => r.delivered)).toFixed(1)}`);
  console.log(`  street line during 8:59: average ${average(reachedFinal.map((r) => r.finalMinuteQueue)).toFixed(1)} (rounds that got there: ${reachedFinal.length})`);
  console.log(`  longest street line: average ${average(results.map((r) => r.maxStreetQueue)).toFixed(1)}`);
  if (mode === 'rush') console.log(`  tips earned ${average(results.map((r) => r.tips)).toFixed(0)}, strikes earned back ${average(results.map((r) => r.earnedBack)).toFixed(2)}, jobs done ${average(results.map((r) => r.jobs)).toFixed(1)}, perks used ${average(results.map((r) => r.perks)).toFixed(1)}`);
  console.log('  complaints:', Object.entries(complaintKinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
}
