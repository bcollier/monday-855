// load_rules.js
// Loads the rule files (constants, door, person, queue, rush, game) into one
// shared scope, the way index.html's <script> tags do, so tests/rules_test.js
// and tools/sim.js can drive Game without a browser. Nothing here loads
// input/render/main, which need one.
//
//   const { Game, PERSON_TYPES } = loadRules();
//   const { Game, createAutopilot } = loadRules(['autopilot']);   // more js/ files after the rules
//
// Each file runs as its own script, so an error's stack trace names the file.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const RULE_FILES = ['constants', 'door', 'person', 'queue', 'rush', 'game'];

function loadRules(extraFiles = []) {
  const scope = vm.createContext({ Math, console });
  for (const name of [...RULE_FILES, ...extraFiles]) {
    const file = path.join(__dirname, '..', 'js', name + '.js');
    vm.runInContext(fs.readFileSync(file, 'utf8'), scope, { filename: file });
  }
  // The files declare their names with const and class, which never become
  // properties of the scope's global object. So the result looks each name up
  // by evaluating it in the scope, which makes plain destructuring work.
  return new Proxy({}, {
    get: (_, name) => (typeof name === 'string' ? vm.runInContext(name, scope) : undefined),
  });
}

module.exports = { loadRules, RULE_FILES };
