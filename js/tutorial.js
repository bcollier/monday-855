// tutorial.js
// Guided practice: seven short steps, each teaching one thing, in a round with
// no clock and no strikes (Game mode 'tutorial'). The tutorial decides who
// arrives; the rules are the real ones. Esc leaves at any time.
//
// Each step can:
//   setup(game)          - bring in the people this step needs
//   isDone(game, step)   - true once the player has done the thing
//   failMessage + retry  - on a complaint (or a troublemaker getting in), say so
//                          kindly and bring in someone new to try again

const TUTORIAL_STEPS = [
  {
    title: 'Push the door',
    text: 'Hold [SPACE] to push the revolving door around.',
    focus: 'door',
    isDone: (game) => game.door.speed >= 45,
  },
  {
    title: 'Let it coast',
    text: 'Now let go. The door slows down by itself. The needle on the speed meter shows how fast it turns.',
    focus: 'meter',
    isDone: (game, step) => step.age > 1.2 && game.door.speed < 30,
  },
  {
    title: 'People step in by themselves',
    text: 'Here comes someone. Keep the door turning gently: when a gap lines up with them, they hop in.',
    focus: 'street',
    setup: (game) => game.addToQueue('street', 'officeWorker', 1.2),
    isDone: (game) => game.door.allRiders().length > 0,
  },
  {
    title: 'Keep them comfortable',
    text: 'Keep the needle inside the green SAFE ZONE until they step out into the lobby.',
    focus: 'meter',
    isDone: (game, step) => step.happyExits >= 1,
    failMessage: 'Oops! Not too fast, not too slow. Here comes someone else to try again.',
    retry: (game) => game.addToQueue('street', 'officeWorker', 1.2),
  },
  {
    title: 'They never agree',
    text: 'Coffee interns hate fast doors. Managers hate slow ones. Let the intern ride first, and hold [↓] so the manager waits.',
    focus: 'street',
    setup: (game) => {
      game.addToQueue('street', 'intern', 1.2);
      game.addToQueue('street', 'manager', 1.6);
    },
    isDone: (game, step) => step.exits >= 2,
  },
  {
    title: 'Keep troublemakers out',
    text: 'In Rush mode, troublemakers try to sneak in. Hold [↓] while they’re at the front of the line until they give up.',
    focus: 'street',
    setup: (game) => game.addToQueue('street', 'troublemaker', 1.2),
    isDone: (game, step) => step.turnedAway >= 1,
    failMessage: 'They got in! No harm done in practice. Let’s try that again.',
    retry: (game) => game.addToQueue('street', 'troublemaker', 1.2),
  },
  {
    title: 'You’re ready!',
    text: 'Get everyone in by 9:00. Three complaints and you’re fired. Press [SPACE] for Classic or [R] for Rush.',
    focus: null,
    isDone: () => false,
    isFinal: true,
  },
];

class Tutorial {
  constructor(game) {
    this.feedback = null;        // { text, age }: a kind word after a mistake
    this.secondsUntilRetry = Infinity;
    this.startStep(0, game);
  }

  get current() {
    return TUTORIAL_STEPS[this.stepIndex];
  }

  get isFinished() {
    return Boolean(this.current.isFinal);
  }

  startStep(index, game) {
    this.stepIndex = index;
    this.step = { age: 0, exits: 0, happyExits: 0, turnedAway: 0 };
    this.successAge = Infinity;  // counts up once the step is done, then the next one starts
    this.current.setup?.(game);
  }

  update(dt, game, events) {
    if (game.mode !== 'tutorial' || game.phase !== 'playing') return;
    const step = this.step;
    step.age += dt;
    for (const event of events) {
      if (event.type === 'exited' && !event.person.type.isTroublemaker) {
        step.exits += 1;
        if (!event.person.hasComplained) step.happyExits += 1;
      }
      if (event.type === 'turnedAway') step.turnedAway += 1;
      const isMistake = event.type === 'complained' || event.type === 'breach';
      if (isMistake && this.current.failMessage && this.successAge === Infinity) {
        this.feedback = { text: this.current.failMessage, age: 0 };
        this.secondsUntilRetry = 1.6;
      }
    }

    if (this.feedback && (this.feedback.age += dt) > 3) this.feedback = null;
    this.secondsUntilRetry -= dt;
    if (this.secondsUntilRetry <= 0) {
      this.secondsUntilRetry = Infinity;
      this.current.retry?.(game);
    }

    if (this.successAge === Infinity && this.current.isDone(game, step)) this.successAge = 0;
    if (this.successAge !== Infinity) {
      this.successAge += dt;
      if (this.successAge > 1.1 && !this.isFinished) {
        this.feedback = null;
        this.secondsUntilRetry = Infinity;
        this.startStep(this.stepIndex + 1, game);
      }
    }
  }
}
