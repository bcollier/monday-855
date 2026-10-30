// scenarios.js
// Prepared moments for checking the game by eye or by screenshot. Open
//   index.html#scenario=conflict
// to start with a manager and an intern riding together. Add "&hold" to freeze
// the rules there (animations keep running), e.g. #scenario=rush&hold, and
// "&debug" to open the debug overlay, "&bot" to let the autopilot play, and
// "&advance=20" to fast-forward 20 seconds before the first frame (for screenshots).
//
//   title     - the title screen
//   play      - skip the title screen (Classic)
//   rushMode  - start a Rush round (troublemakers)
//   tutorial  - start the guided practice
//   conflict  - manager + intern riding at once: NO SAFE SPEED
//   rush      - 8:59, long lines, a full door
//   paused    - the rush, paused
//   fired / gridlock / madeIt - the end screens

function readScenarioFromHash() {
  const match = location.hash.match(/scenario=([A-Za-z]+)/);
  if (!match) return null;
  const advance = location.hash.match(/[#&]advance=([\d.]+)/);
  return {
    name: match[1],
    hold: /[#&]hold\b/.test(location.hash),
    debug: /[#&]debug\b/.test(location.hash),
    bot: /[#&]bot\b/.test(location.hash),
    advanceSeconds: advance ? Number(advance[1]) : 0,
  };
}

function applyScenario(game, ui, scenario) {
  game.reset();
  ui.areRulesFrozen = scenario.hold;
  ui.showDebug = scenario.debug;
  ui.autopilot = scenario.bot ? createAutopilot('careful') : null;
  const ride = (typeKey, fromSide, compartmentIndex) => {
    const person = new Person(typeKey, fromSide);
    person.state = 'riding';
    game.door.addRider(compartmentIndex, person);
    return person;
  };

  switch (scenario.name) {
    case 'conflict':
      game.secondsElapsed = 40;
      game.door.angle = 20;
      game.door.speed = 64;
      ride('manager', 'street', 0);
      ride('intern', 'street', 1);
      ride('officeWorker', 'street', 1);
      for (const typeKey of ['officeWorker', 'manager', 'intern']) game.addToQueue('street', typeKey);
      game.addToQueue('lobby', 'courier');
      game.deliveredCount = 7;
      break;
    case 'rush':
    case 'paused':
      game.secondsElapsed = 151;
      game.door.angle = 40;
      game.door.speed = 58;
      ride('officeWorker', 'street', 0);
      ride('officeWorker', 'street', 0);
      ride('courier', 'lobby', 1);
      ride('intern', 'street', 2);
      ride('officeWorker', 'lobby', 3);
      for (const typeKey of ['manager', 'officeWorker', 'intern', 'officeWorker', 'courier', 'officeWorker', 'manager']) {
        game.addToQueue('street', typeKey);
      }
      game.addToQueue('lobby', 'officeWorker');
      game.addToQueue('lobby', 'courier');
      game.deliveredCount = 31;
      game.complaintCount = 2;
      game.door.allRiders()[3].hasComplained = true;
      game.door.allRiders()[3].complaintReason = 'tooFast';
      if (scenario.name === 'paused') game.togglePause();
      break;
    case 'fired':
    case 'gridlock':
    case 'madeIt':
      game.secondsElapsed = scenario.name === 'madeIt' ? ROUND_DURATION_SECONDS : 118;
      game.deliveredCount = scenario.name === 'madeIt' ? 64 : 29;
      game.complaintCount = scenario.name === 'fired' ? 3 : 1;
      game.stats.deliveredByType = { officeWorker: 30, intern: 9, manager: 8, courier: 6 };
      game.stats.complaintsByType = scenario.name === 'fired' ? { intern: 2, manager: 1 } : { intern: 1 };
      game.stats.longestCalmSeconds = 74;
      for (const typeKey of ['officeWorker', 'manager', 'intern']) game.addToQueue('street', typeKey);
      game.endRound(scenario.name);
      break;
    case 'title':
      game.showTitle();
      break;
    case 'tutorial':
      game.startMode('tutorial');
      ui.tutorial = new Tutorial(game);
      break;
    case 'rushMode':
      game.startMode('rush');
      break;
    case 'play':
    default:
      break;
  }
  // People placed by a scenario are already standing in place: no walk-in.
  game.takeEvents().filter((event) => event.type === 'roundEnded').forEach((event) => game.emit(event));
}
