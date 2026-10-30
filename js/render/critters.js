// render/critters.js
// Critter look (press C): the same game with a cast of cozy animals. It's only
// a skin. Every critter is still one of the passenger types, with exactly the
// same comfort range and rules:
//   office worker -> commuting critters (bunny, cat, bear, frog, mouse) in sweaters
//   late manager  -> a fox in a suit
//   coffee intern -> a squirrel with a tray of acorn lattes
//   courier       -> a duck pushing a stroller of ducklings (still a whole compartment)
//   troublemakers -> a raccoon, a mole salesperson, a puppy in a propeller cap
// Like the office cast, each one reads by silhouette first: long ears or round
// ears, a bushy tail, a tray, a stroller.

let activeTheme = 'office';   // 'office' | 'critter'. Memory only; nothing is saved.

function isCritterLook() {
  return activeTheme === 'critter';
}

function toggleTheme() {
  activeTheme = isCritterLook() ? 'office' : 'critter';
}

const CRITTER_SPECIES = ['bunny', 'cat', 'bear', 'frog', 'mouse'];
const CRITTER_FUR = {
  bunny: ['#f6f1e7', '#d9b48c', '#b98d6a'],
  cat: ['#e8a25a', '#a7adb6', '#3d3a3a'],
  bear: ['#a0714f', '#7b5238', '#d1a074'],
  frog: ['#7cc36b', '#5fae5a', '#9bd17f'],
  mouse: ['#c4beb7', '#a69d93', '#e3ddd5'],
};
const CRITTER_SWEATERS = ['#f2a7a0', '#9cc3e6', '#b9d99a', '#f3d27a', '#c7b3e6'];

// Names used on the title screen and the speed meter in Critter look.
const CRITTER_NAMES = {
  officeWorker: { long: 'Commuter critters', short: 'Critters' },
  manager: { long: 'Late fox', short: 'Fox' },
  intern: { long: 'Coffee squirrel', short: 'Squirrel' },
  courier: { long: 'Duck with a stroller', short: 'Duck' },
};

// Complaints that fit the critters better than the office lines.
const CRITTER_LINES = {
  intern: { tooFast: ['MY ACORN LATTES!', 'NUTS EVERYWHERE!', 'SIX LATTES. ZERO NOW.'], tooSlow: ['THE FOAM IS HIBERNATING!', 'MY TAIL IS FALLING ASLEEP!'] },
  manager: { tooFast: ['MY TAIL!', 'DO YOU KNOW WHO I AM? A FOX!'], tooSlow: ['I HAVE A 9 AM!', 'FOXES DON’T WAIT!'] },
  courier: { tooFast: ['MY DUCKLINGS!', 'QUACK! CAREFUL!', 'THE BABIES!!'], tooSlow: ['THE BABIES ARE FUSSING!', 'NAP TIME IS ENDING!'] },
  officeWorker: { tooFast: ['MY WHISKERS!', 'EARS! WATCH THE EARS!', 'SQUEAK!'], tooSlow: ['I COULD HOP FASTER!', 'ANY DAY NOW...'] },
};

function displayNameFor(typeKey, length = 'long') {
  if (isCritterLook() && CRITTER_NAMES[typeKey]) return CRITTER_NAMES[typeKey][length];
  return length === 'long' ? PERSON_TYPES[typeKey].displayName : METER_LANE_NAMES[typeKey];
}

/** Draws a critter facing +x (the caller has already translated and rotated). */
function drawCritterFigure(ctx, typeKey, look, pose) {
  switch (typeKey) {
    case 'manager': return drawFox(ctx, look, pose);
    case 'intern': return drawSquirrel(ctx, look, pose);
    case 'courier': return drawDuckWithStroller(ctx, look, pose);
    case 'troublemaker':
      if (look.trouble === 'pickpocket') return drawRaccoon(ctx, look, pose);
      if (look.trouble === 'kid') return drawPuppy(ctx, look, pose);
      return drawMole(ctx, look, pose);
    default:
      if (look.rare?.key === 'dino') return drawDinoWorker(ctx, look, pose);
      return drawCommuterCritter(ctx, look, pose);
  }
}

// ---- Shared critter parts ----

/** A round critter head with eyes, a muzzle and rosy cheeks. Ears are drawn by the caller first. */
function drawCritterHead(ctx, fur, options = {}) {
  const radius = options.radius ?? 7;
  fillCircle(ctx, 2, 0, radius, fur);
  if (options.muzzle) fillEllipse(ctx, 2 + radius * 0.75, 0, 2.8, 3.2, 0, options.muzzle);
  fillCircle(ctx, 2 + radius * 0.98, 0, 1.3, options.nose ?? '#3a2a2a');
  for (const side of [-1, 1]) {
    fillCircle(ctx, 2 + radius * 0.5, side * radius * 0.42, 1.25, '#2a2020');
    fillCircle(ctx, 2 + radius * 0.5 + 0.4, side * radius * 0.42 - 0.4, 0.45, '#ffffff');
    fillCircle(ctx, 2 + radius * 0.35, side * radius * 0.68, 1.3, 'rgba(240, 120, 140, 0.45)');
  }
}

function drawSweaterBody(ctx, color) {
  fillEllipse(ctx, 0, 0, 7.5, 11, 0, color);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 8, 0, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
}

function drawPaws(ctx, fur, positions) {
  for (const [x, y] of positions) fillCircle(ctx, x, y, 2.5, fur);
}

// ---- Commuters (office workers) ----

function drawCommuterCritter(ctx, look, pose) {
  const species = CRITTER_SPECIES[look.shirtIndex % CRITTER_SPECIES.length];
  const furs = CRITTER_FUR[species];
  const fur = furs[(look.skin.charCodeAt(2) || 0) % furs.length];
  const sweater = CRITTER_SWEATERS[(look.shirtIndex + look.hair.length) % CRITTER_SWEATERS.length];
  const time = pose.time ?? 0;

  // Tails go behind everything
  if (species === 'bunny') fillCircle(ctx, -9.5, 0, 3.4, '#ffffff');
  if (species === 'cat') {
    ctx.strokeStyle = fur;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.quadraticCurveTo(-14, Math.sin(time * 3) * 6, -15, 4);
    ctx.stroke();
  }
  if (species === 'mouse') {
    ctx.strokeStyle = '#e8a5a5';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.bezierCurveTo(-13, 5, -15, -5, -20, Math.sin(time * 4) * 3);
    ctx.stroke();
  }
  if (species === 'bear') fillCircle(ctx, -9, 0, 2.2, fur);

  drawSweaterBody(ctx, sweater);
  const rare = look.rare?.key;
  if (rare === 'cake' || rare === 'plant') {
    drawPaws(ctx, fur, [[9, -7], [9, 7]]);
  } else {
    drawPaws(ctx, fur, [[2, -10.5], [9, 6]]);
    fillRoundRect(ctx, 9.5, 3.5, 6, 4.5, 1, '#1f2430');
    fillRoundRect(ctx, 10.3, 4.2, 4.4, 3.1, 0.8, pose.isPhoneLit ? '#bfe3ff' : '#4f6b8a');
  }

  // Ears, then the head on top
  if (species === 'bunny') {
    for (const side of [-1, 1]) {
      const flop = side * (1.5 + Math.sin(time * 2 + side) * 0.6);
      fillEllipse(ctx, -6, side * 3 + flop * 0.4, 7, 2.6, side * 0.15, fur);
      fillEllipse(ctx, -6, side * 3 + flop * 0.4, 5, 1.2, side * 0.15, '#f2b8c0');
    }
  } else if (species === 'cat') {
    for (const side of [-1, 1]) {
      ctx.fillStyle = fur;
      ctx.beginPath();
      ctx.moveTo(-1, side * 3);
      ctx.lineTo(-3.5, side * 9.5);
      ctx.lineTo(3, side * 6.5);
      ctx.closePath();
      ctx.fill();
    }
  } else if (species === 'bear') {
    for (const side of [-1, 1]) {
      fillCircle(ctx, -1.5, side * 6, 2.8, fur);
      fillCircle(ctx, -1.5, side * 6, 1.3, '#d9a782');
    }
  } else if (species === 'mouse') {
    for (const side of [-1, 1]) {
      fillCircle(ctx, -1, side * 6.5, 4, fur);
      fillCircle(ctx, -1, side * 6.5, 2.6, '#f2b8c0');
    }
  }
  if (species === 'frog') {
    fillCircle(ctx, 2, 0, 7.2, fur);
    for (const side of [-1, 1]) {
      fillCircle(ctx, 5, side * 4, 2.8, fur);
      fillCircle(ctx, 5.4, side * 4, 1.9, '#ffffff');
      fillCircle(ctx, 6, side * 4, 1, '#1f2430');
    }
    ctx.strokeStyle = '#3f7f3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(5, 0, 3, -0.9, 0.9);
    ctx.stroke();
    fillCircle(ctx, 3.5, -5.2, 1.3, 'rgba(240, 120, 140, 0.45)');
    fillCircle(ctx, 3.5, 5.2, 1.3, 'rgba(240, 120, 140, 0.45)');
  } else {
    drawCritterHead(ctx, fur, { muzzle: species === 'bear' ? '#d9a782' : '#ffffff', nose: species === 'bunny' || species === 'mouse' ? '#e88a9a' : '#3a2a2a' });
  }

  if (rare === 'cake') drawBirthdayCake(ctx, 16, 0, time);
  if (rare === 'plant') {
    fillCircle(ctx, 13, 0, 5.5, '#b86a45');
    drawFicusLeaves(ctx, 14, 0, time);
  }
}

// ---- The late fox (manager) ----

function drawFox(ctx, look, pose) {
  const isCeo = look.rare?.key === 'ceo';
  const fur = isCeo ? '#c9c4bd' : '#e07a35';
  // Big bushy tail with a white tip, swishing
  const swish = Math.sin((pose.time ?? 0) * 3 + (pose.walkPhase ?? 0) * 0.3) * 0.25;
  ctx.save();
  ctx.rotate(swish);
  fillEllipse(ctx, -14, 0, 9, 5, 0, fur);
  fillEllipse(ctx, -20.5, 0, 3.6, 3.2, 0, '#fbf5ea');
  ctx.restore();
  fillRoundRect(ctx, -6, 11, 14, 6, 1.5, isCeo ? PALETTE.brass : '#5a3a22');
  fillEllipse(ctx, 0, 0, 8, 12, 0, isCeo ? '#15171d' : MANAGER_SUIT);
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath();
  ctx.moveTo(4, -3.5); ctx.lineTo(8.3, 0); ctx.lineTo(4, 3.5); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = isCeo ? '#e6b84a' : '#d43d3d';
  ctx.beginPath();
  ctx.moveTo(5.2, -1.3); ctx.lineTo(8.6, 0); ctx.lineTo(5.2, 1.3); ctx.closePath();
  ctx.fill();
  if (pose.isTapping) {
    const tap = Math.sin((pose.time ?? 0) * 26) * 1.6;
    fillCircle(ctx, 9, -5, 2.6, fur);
    fillRoundRect(ctx, 7.6, -7.2, 3.2, 4.4, 1, PALETTE.brass);
    fillCircle(ctx, 10.5 + tap * 0.3, -1 + tap, 2.5, fur);
  } else {
    drawPaws(ctx, fur, [[1, -11.5], [1, 11.5]]);
  }
  // Pointy ears with dark tips
  for (const side of [-1, 1]) {
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.moveTo(-1.5, side * 2.5);
    ctx.lineTo(-4.5, side * 10);
    ctx.lineTo(2.5, side * 6.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3a2a2a';
    ctx.beginPath();
    ctx.moveTo(-3.6, side * 7.8);
    ctx.lineTo(-4.5, side * 10);
    ctx.lineTo(-2, side * 8.6);
    ctx.closePath();
    ctx.fill();
  }
  drawCritterHead(ctx, fur, { muzzle: '#fbf5ea' });
  if (isCeo) {
    fillRoundRect(ctx, 4.4, -5.4, 3, 4.4, 1.4, '#0e0f12');
    fillRoundRect(ctx, 4.4, 1, 3, 4.4, 1.4, '#0e0f12');
  }
}

// ---- The coffee squirrel (intern) ----

function drawSquirrel(ctx, look, pose) {
  const fur = '#b8733a';
  const time = pose.time ?? 0;
  // Huge curled tail behind
  fillEllipse(ctx, -12, 0, 7.5, 9, 0, fur);
  fillEllipse(ctx, -12.5, 0, 4.5, 5.5, 0, '#cf8a4c');
  ctx.strokeStyle = '#8f5627';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(-12, 0, 3, 0, Math.PI * 1.6);
  ctx.stroke();
  drawSweaterBody(ctx, INTERN_CARDIGAN);
  ctx.strokeStyle = INTERN_CARDIGAN;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(1, -9); ctx.lineTo(9, -9);
  ctx.moveTo(1, 9); ctx.lineTo(9, 9);
  ctx.stroke();
  drawPaws(ctx, fur, [[10, -9], [10, 9]]);

  // Tray of acorn lattes, wobbling as the door nears 60 °/s
  const wobble = pose.wobble ?? 0;
  const isTwelve = look.rare?.key === 'twelve';
  const halfHeight = isTwelve ? 20.5 : 10.5;
  const rows = isTwelve ? [-16.5, -10.3, -4.1, 4.1, 10.3, 16.5] : [-6.2, 0, 6.2];
  if (isTwelve) drawPaws(ctx, fur, [[10, -15], [10, 15]]);
  fillRoundRect(ctx, 9, -halfHeight, 15, halfHeight * 2, 3, '#d6bf93');
  let cup = 0;
  for (const cupX of [13, 20]) {
    for (const cupY of rows) {
      const jx = Math.sin(time * 31 + cup * 1.9) * wobble * 1.4;
      const jy = Math.cos(time * 27 + cup * 2.3) * wobble * 1.4;
      fillCircle(ctx, cupX + jx, cupY + jy, 3.1, '#e9c99a');
      ctx.fillStyle = '#7a4b2c';
      ctx.beginPath();
      ctx.arc(cupX + jx, cupY + jy, 3.1, Math.PI * 0.5, Math.PI * 1.5);
      ctx.fill();
      fillCircle(ctx, cupX + jx - 0.5, cupY + jy, 0.8, '#4a2c18');
      cup++;
    }
  }
  for (const side of [-1, 1]) {
    fillCircle(ctx, -1, side * 6, 2.4, fur);
    fillCircle(ctx, -1.6, side * 7.2, 1, fur);
  }
  drawCritterHead(ctx, fur, { muzzle: '#f2dcc0' });
}

// ---- The duck with a stroller (courier) ----

function drawDuckWithStroller(ctx, look, pose) {
  const time = pose.time ?? 0;
  const bounce = (pose.wobble ?? 0) * 1.6;
  // Stroller: frame, basket, hood over the front, ducklings peeking out the back
  fillRoundRect(ctx, 11, -12, 27, 24, 7, '#7d8fa6');
  fillRoundRect(ctx, 12.5, -10.5, 24, 21, 6, '#9cc3e6');
  const ducklings = [[16, -5.5], [16, 5.5], [21, 0]];
  ducklings.forEach(([dx, dy], i) => {
    const hop = Math.sin(time * 14 + i * 2) * bounce;
    fillCircle(ctx, dx + hop * 0.3, dy + hop, 4, '#f7d84a');
    fillCircle(ctx, dx + 1.5 + hop * 0.3, dy + hop, 2.4, '#ffe680');
    ctx.fillStyle = '#f08a2e';
    ctx.beginPath();
    ctx.moveTo(dx + 3.6, dy + hop - 1);
    ctx.lineTo(dx + 5.6, dy + hop);
    ctx.lineTo(dx + 3.6, dy + hop + 1);
    ctx.closePath();
    ctx.fill();
  });
  // Hood (canopy) with stripes
  ctx.fillStyle = '#5f86b5';
  ctx.beginPath();
  ctx.ellipse(30, 0, 8, 11, 0, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(25, 11);
  ctx.lineTo(25, -11);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  for (const r of [3.5, 6.5]) {
    ctx.beginPath();
    ctx.ellipse(28, 0, r, r * 1.4, 0, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
  }
  if (look.rare?.key === 'cat') drawCartCat(ctx, 29, 0, time);
  // Handle bar and the parent duck
  ctx.strokeStyle = '#3d4250';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(9.5, -11);
  ctx.lineTo(9.5, 11);
  ctx.stroke();
  fillEllipse(ctx, -7.5, 0, 4, 3, 0, '#f4efe4');                // tail feathers
  fillEllipse(ctx, 0, 0, 8.5, 11.5, 0, '#fbf8f0');
  fillEllipse(ctx, -1, -7.5, 5, 3, -0.3, '#e9e3d6');           // folded wings
  fillEllipse(ctx, -1, 7.5, 5, 3, 0.3, '#e9e3d6');
  fillRoundRect(ctx, -3, -6, 6, 12, 2, '#2a6d74');              // a little teal vest
  fillCircle(ctx, 8.5, -8.5, 2.3, '#f08a2e');
  fillCircle(ctx, 8.5, 8.5, 2.3, '#f08a2e');
  fillCircle(ctx, 2, 0, 6.6, '#fbf8f0');
  ctx.fillStyle = '#f08a2e';
  ctx.beginPath();
  ctx.ellipse(8.5, 0, 3.6, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const side of [-1, 1]) {
    fillCircle(ctx, 4.5, side * 3, 1.2, '#2a2020');
    fillCircle(ctx, 3.6, side * 4.6, 1.2, 'rgba(240, 120, 140, 0.45)');
  }
}

// ---- Critter troublemakers (Rush) ----

function drawRaccoon(ctx, look, pose) {
  const time = pose.time ?? 0;
  // Ringed tail
  ctx.save();
  ctx.rotate(Math.sin(time * 4) * 0.2);
  fillEllipse(ctx, -13, 0, 8, 4, 0, '#8e8e94');
  ctx.fillStyle = '#3d3a3a';
  for (const x of [-17, -13, -9.5]) ctx.fillRect(x, -3.6, 1.8, 7.2);
  ctx.restore();
  fillCircle(ctx, -9, 7, 5.5, '#a08c6a');                       // the "borrowed" sack
  fillEllipse(ctx, 0, 0, 7.5, 11, 0, '#8e8e94');
  drawPaws(ctx, '#3d3a3a', [[6, -9], [6, 9]]);
  for (const side of [-1, 1]) fillCircle(ctx, -1, side * 6, 2.6, '#8e8e94');
  drawCritterHead(ctx, '#a8a8ae', { muzzle: '#ece8e2' });
  fillRoundRect(ctx, 4.3, -5.4, 2.8, 10.8, 1.4, '#2a2828');    // the mask
  for (const side of [-1, 1]) fillCircle(ctx, 5.4, side * 2.9, 0.9, '#ffffff');
}

function drawMole(ctx, look) {
  // Velvet mole in a loud checked blazer, clipboard at the ready
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#d8a93a';
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(120, 60, 20, 0.55)';
  ctx.lineWidth = 1.4;
  for (let k = -12; k <= 12; k += 4.5) {
    ctx.beginPath(); ctx.moveTo(-9, k); ctx.lineTo(9, k); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(k, -13); ctx.lineTo(k, 13); ctx.stroke();
  }
  ctx.restore();
  drawPaws(ctx, '#f0a8b4', [[10, -6], [10, 6]]);
  fillRoundRect(ctx, 10.5, -6.5, 9, 13, 1.5, '#8a5a32');
  fillRoundRect(ctx, 11.5, -5.2, 7, 10.6, 1, '#ffffff');
  fillCircle(ctx, 2, 0, 7, '#4f4440');
  // Star nose
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    fillCircle(ctx, 8.5 + Math.cos(a) * 1.8, Math.sin(a) * 1.8, 1.1, '#f08aa0');
  }
  for (const side of [-1, 1]) fillCircle(ctx, 4.5, side * 3, 0.7, '#1f1a18');
}

function drawPuppy(ctx, look, pose) {
  ctx.save();
  ctx.scale(0.85, 0.85);
  const time = pose.time ?? 0;
  ctx.strokeStyle = '#c48a52';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(-13, Math.sin(time * 16) * 4);                     // wag wag wag
  ctx.stroke();
  fillEllipse(ctx, 0, 0, 7.5, 10.5, 0, '#2fb3a5');
  drawPaws(ctx, '#c48a52', [[8, -7], [8, 7]]);
  for (const side of [-1, 1]) fillEllipse(ctx, 0, side * 7.5, 4.5, 2.6, side * 0.4, '#7a4b2c');   // floppy ears
  drawCritterHead(ctx, '#d9a066', { muzzle: '#f2dcc0' });
  // Propeller cap
  const colors = ['#e2453c', '#f2c230', '#3b6fd1', '#36b368'];
  ctx.save();
  ctx.translate(-0.5, 0);
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 4.6, (k * Math.PI) / 2, ((k + 1) * Math.PI) / 2);
    ctx.closePath();
    ctx.fillStyle = colors[k];
    ctx.fill();
  }
  ctx.rotate(time * 18);
  ctx.strokeStyle = '#f2c230';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.stroke();
  ctx.restore();
  ctx.restore();
}
