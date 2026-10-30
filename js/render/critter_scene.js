// render/critter_scene.js
// The Critter look's backdrop: a plank-floored lobby with an owl at reception,
// a timber storefront ("Acorn & Associates"), a meadow where the sidewalk was,
// lily ponds where the puddles were, and a dirt lane for the little round cars.
// Same layout as the office scene, so every queue spot and path lines up.

function paintCritterScene(ctx) {
  const random = seededRandom(1855);
  paintPlankLobby(ctx, random);
  paintMeadow(ctx, random);
  paintDirtLane(ctx, random);
  paintCritterStreetFurniture(ctx);
  paintTimberFacade(ctx);
}

function paintPlankLobby(ctx, random) {
  ctx.fillStyle = '#ead2a8';
  ctx.fillRect(0, 0, CANVAS_WIDTH, FACADE_TOP);
  const plankHeight = 22;
  for (let row = 0; row * plankHeight < FACADE_TOP; row++) {
    const y = row * plankHeight;
    let x = -random() * 120;
    while (x < CANVAS_WIDTH) {
      const length = 90 + random() * 110;
      const tone = random() * 14 - 7;
      ctx.fillStyle = `rgb(${234 + tone}, ${210 + tone}, ${168 + tone})`;
      ctx.fillRect(x + 1, y + 1, length - 2, plankHeight - 2);
      if (random() < 0.25) fillEllipse(ctx, x + length * random(), y + plankHeight / 2, 3, 1.6, 0, 'rgba(150, 100, 60, 0.25)');
      x += length;
    }
    ctx.fillStyle = 'rgba(150, 105, 65, 0.3)';
    ctx.fillRect(0, y, CANVAS_WIDTH, 1);
  }
  // Braided rug
  for (const [r, color] of [[62, '#e9a07a'], [52, '#f3d27a'], [42, '#9cc3e6'], [32, '#f2a7a0'], [22, '#b9d99a']]) {
    fillCircle(ctx, 190, 205, r, color);
  }
  // Sun shafts, as in the office
  ctx.save();
  ctx.fillStyle = 'rgba(255, 240, 200, 0.3)';
  for (const [left, right] of [[24, 128], [176, 300], [664, 776], [824, 934]]) {
    const reach = 210;
    ctx.beginPath();
    ctx.moveTo(left, FACADE_TOP);
    ctx.lineTo(right, FACADE_TOP);
    ctx.lineTo(right + reach * 0.75, FACADE_TOP - reach);
    ctx.lineTo(left + reach * 0.75, FACADE_TOP - reach);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  paintElevators(ctx, 0, 96, 1);
  paintElevators(ctx, CANVAS_WIDTH, 118, -1);
  paintReceptionDesk(ctx, 800, 168, false);
  paintOwlReceptionist(ctx, 800, 188);
  paintPlant(ctx, 92, 262, 22);
  paintPlant(ctx, 612, 252, 17);
  paintPlant(ctx, 926, 270, 20);
  paintPlant(ctx, 260, 34, 15);
  paintPlant(ctx, 700, 34, 15);
  paintMushroom(ctx, 352, 250, 13, '#e2453c');
}

/** An owl sits where the human receptionist was. */
function paintOwlReceptionist(ctx, x, y) {
  fillEllipse(ctx, x, y, 12, 10, 0, '#9a7452');
  fillEllipse(ctx, x, y - 2, 9, 8, 0, '#b48c64');
  for (const side of [-1, 1]) {
    fillCircle(ctx, x + side * 4, y - 1, 3.6, '#fdf6e3');
    fillCircle(ctx, x + side * 4, y - 0.5, 1.8, '#2a2020');
    ctx.fillStyle = '#9a7452';
    ctx.beginPath();
    ctx.moveTo(x + side * 3, y - 8);
    ctx.lineTo(x + side * 7, y - 12);
    ctx.lineTo(x + side * 7.5, y - 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#f2b51d';
  ctx.beginPath();
  ctx.moveTo(x - 1.5, y + 2);
  ctx.lineTo(x + 1.5, y + 2);
  ctx.lineTo(x, y + 5);
  ctx.closePath();
  ctx.fill();
}

function paintMushroom(ctx, x, y, radius, color) {
  fillCircle(ctx, x + SHADOW_OFFSET.x, y + SHADOW_OFFSET.y, radius, PALETTE.shadow);
  fillCircle(ctx, x, y, radius, color);
  const random = seededRandom(Math.floor(x * 7 + y));
  for (let k = 0; k < 6; k++) {
    const a = random() * Math.PI * 2;
    const d = random() * radius * 0.65;
    fillCircle(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, radius * (0.1 + random() * 0.1), '#fff8ec');
  }
}

function paintTimberFacade(ctx) {
  const gapHalfWidth = DOOR_RADIUS + 10;
  for (const [left, right] of [[0, DOOR_CENTER_X - gapHalfWidth], [DOOR_CENTER_X + gapHalfWidth, CANVAS_WIDTH]]) {
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(left + SHADOW_OFFSET.x, FACADE_TOP + SHADOW_OFFSET.y, right - left, FACADE_BOTTOM - FACADE_TOP);
    ctx.fillStyle = '#8a5a3a';
    ctx.fillRect(left, FACADE_TOP, right - left, FACADE_BOTTOM - FACADE_TOP);
    ctx.fillStyle = '#a06c48';
    ctx.fillRect(left, FACADE_TOP, right - left, 4);
    // Beams
    ctx.fillStyle = 'rgba(60, 35, 20, 0.35)';
    for (let x = left + 40; x < right; x += 80) ctx.fillRect(x, FACADE_TOP, 3, FACADE_BOTTOM - FACADE_TOP);
    // Leafy vine along the top
    for (let x = left + 6; x < right; x += 11) {
      fillEllipse(ctx, x, FACADE_TOP + 1 + Math.sin(x * 0.3) * 1.5, 5, 3, x * 0.7, x % 3 ? PALETTE.leaf : PALETTE.leafLight);
    }
  }
  for (const [left, right] of [[24, 128], [176, 300], [664, 776], [824, 934]]) {
    fillRoundRect(ctx, left, FACADE_TOP + 8, right - left, 11, 5, '#bfe0ee');
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillRect(left + 4, FACADE_TOP + 9, right - left - 8, 3);
  }
  ctx.fillStyle = '#ffe3a3';
  ctx.font = font(9, 'bold', FONT_DISPLAY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fillSpacedText(ctx, 'ACORN & ASSOCIATES', 240, FACADE_BOTTOM - 6, 2.4);
  fillSpacedText(ctx, 'EST. 1962 · BURROWS 1–40', 720, FACADE_BOTTOM - 6, 2.4);
}

function paintMeadow(ctx, random) {
  ctx.fillStyle = '#b8db91';
  ctx.fillRect(0, FACADE_BOTTOM, CANVAS_WIDTH, CURB_Y - FACADE_BOTTOM);
  // Soft patches of lighter and darker grass
  for (let i = 0; i < 40; i++) {
    fillEllipse(ctx, random() * CANVAS_WIDTH, FACADE_BOTTOM + random() * (CURB_Y - FACADE_BOTTOM), 30 + random() * 50, 12 + random() * 16, 0,
      random() < 0.5 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(60, 110, 40, 0.07)');
  }
  // Grass tufts and flowers
  ctx.strokeStyle = 'rgba(70, 120, 50, 0.45)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 260; i++) {
    const x = random() * CANVAS_WIDTH;
    const y = FACADE_BOTTOM + 6 + random() * (CURB_Y - FACADE_BOTTOM - 10);
    ctx.beginPath();
    ctx.moveTo(x - 2, y + 2); ctx.lineTo(x - 3, y - 2);
    ctx.moveTo(x, y + 2); ctx.lineTo(x, y - 3);
    ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + 3, y - 2);
    ctx.stroke();
  }
  const flowerColors = ['#f4a3b8', '#ffffff', '#f7d84a', '#c7b3e6'];
  for (let i = 0; i < 90; i++) {
    const x = random() * CANVAS_WIDTH;
    const y = FACADE_BOTTOM + 8 + random() * (CURB_Y - FACADE_BOTTOM - 14);
    const color = flowerColors[Math.floor(random() * flowerColors.length)];
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      fillCircle(ctx, x + Math.cos(a) * 2, y + Math.sin(a) * 2, 1.5, color);
    }
    fillCircle(ctx, x, y, 1.2, '#f2b51d');
  }
  // Little ponds (where the puddles are in the office look) with lily pads
  for (const [x, y, rx, ry] of [[300, 392, 46, 14], [706, 488, 30, 10], [150, 520, 36, 11], [880, 380, 28, 9]]) {
    fillEllipse(ctx, x, y, rx + 5, ry + 4, 0, '#9cc77a');
    fillEllipse(ctx, x, y, rx, ry, 0, '#8ec5dc');
    fillEllipse(ctx, x - rx * 0.3, y - ry * 0.3, rx * 0.4, ry * 0.25, 0, 'rgba(255, 255, 255, 0.4)');
    fillCircle(ctx, x + rx * 0.4, y + ry * 0.1, 3.5, '#5fae5a');
    fillCircle(ctx, x - rx * 0.5, y + ry * 0.3, 2.6, '#6bb35e');
  }
  // A hedge of round stones where the curb was
  ctx.fillStyle = '#e6dcc4';
  ctx.fillRect(0, CURB_Y, CANVAS_WIDTH, ROAD_Y - CURB_Y);
  for (let x = 4; x < CANVAS_WIDTH; x += 9) fillEllipse(ctx, x, CURB_Y + 3.5, 4.2, 3, 0, random() < 0.5 ? '#d8ccb0' : '#efe6d0');
}

function paintDirtLane(ctx, random) {
  ctx.fillStyle = '#cfae7e';
  ctx.fillRect(0, ROAD_Y, CANVAS_WIDTH, CANVAS_HEIGHT - ROAD_Y);
  ctx.strokeStyle = 'rgba(120, 85, 50, 0.3)';
  ctx.lineWidth = 3;
  for (const y of [607, 629]) {
    ctx.beginPath(); ctx.moveTo(0, y - 6); ctx.lineTo(CANVAS_WIDTH, y - 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y + 6); ctx.lineTo(CANVAS_WIDTH, y + 6); ctx.stroke();
  }
  for (let i = 0; i < 160; i++) {
    fillCircle(ctx, random() * CANVAS_WIDTH, ROAD_Y + random() * (CANVAS_HEIGHT - ROAD_Y), 0.8 + random() * 1.4, random() < 0.5 ? '#b8956a' : '#e0c49a');
  }
  // Stepping-stone crossing where the crosswalk was
  for (let x = 818; x < 930; x += 16) fillEllipse(ctx, x, 618, 6, 9, 0, '#efe6d0');
}

function paintCritterStreetFurniture(ctx) {
  // Coffee cart under a mushroom umbrella
  fillRoundRect(ctx, 770 + SHADOW_OFFSET.x, 386 + SHADOW_OFFSET.y, 60, 36, 8, PALETTE.shadow);
  fillRoundRect(ctx, 770, 386, 60, 36, 8, '#9a6440');
  fillRoundRect(ctx, 774, 390, 52, 28, 6, '#c08a5a');
  paintMushroom(ctx, 806, 400, 27, '#e2453c');
  ctx.strokeStyle = '#b8322a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(806, 400, 27, 0, Math.PI * 2);
  ctx.stroke();
  fillCircle(ctx, 806, 400, 3.5, '#fff8ec');
  paintTree(ctx, 936, 470, 46);
  paintTree(ctx, 30, 368, 34);
  // A little red mailbox and a mushroom where the hydrant was
  fillRoundRect(ctx, 628 + SHADOW_OFFSET.x, 366 + SHADOW_OFFSET.y, 22, 18, 9, PALETTE.shadow);
  fillRoundRect(ctx, 628, 366, 22, 18, 9, '#e2453c');
  fillRoundRect(ctx, 633, 372, 12, 3, 1.5, '#7a2a2e');
  paintMushroom(ctx, 732, 562, 8, '#f2b51d');
}
