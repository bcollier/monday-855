// render/scene.js
// The world around the door: lobby, building front, sidewalk and road (drawn once
// into a cached canvas), plus the parts that change every frame: queue stanchions,
// floor markers, the WAIT belts, and street life.

const FACADE_TOP = 306;
const FACADE_BOTTOM = 334;
const CURB_Y = 588;
const ROAD_Y = 595;

let sceneCache = null;

/** Draws the static background, building it the first time (or when the pixel ratio changes). */
function drawSceneBackground(ctx, pixelRatio) {
  if (!sceneCache || sceneCache.pixelRatio !== pixelRatio) {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH * pixelRatio;
    canvas.height = CANVAS_HEIGHT * pixelRatio;
    const cacheCtx = canvas.getContext('2d');
    cacheCtx.scale(pixelRatio, pixelRatio);
    paintStaticScene(cacheCtx);
    sceneCache = { canvas, pixelRatio };
  }
  ctx.drawImage(sceneCache.canvas, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function paintStaticScene(ctx) {
  const random = seededRandom(855);
  paintLobby(ctx, random);
  paintSidewalk(ctx, random);
  paintRoad(ctx, random);
  paintStreetFurniture(ctx);
  paintFacade(ctx);
}

// ---- Lobby ----

function paintLobby(ctx, random) {
  ctx.fillStyle = PALETTE.lobbyFloor;
  ctx.fillRect(0, 0, CANVAS_WIDTH, FACADE_TOP);

  // Terrazzo: thousands of tiny stone chips.
  for (let i = 0; i < 3600; i++) {
    const x = random() * CANVAS_WIDTH;
    const y = random() * FACADE_TOP;
    const r = 0.6 + random() * random() * 2.6;
    fillEllipse(ctx, x, y, r, r * (0.6 + random() * 0.4), random() * Math.PI, PALETTE.terrazzoChips[Math.floor(random() * PALETTE.terrazzoChips.length)]);
  }
  // Brass divider strips in a large grid.
  ctx.strokeStyle = 'rgba(199, 154, 69, 0.38)';
  ctx.lineWidth = 1.5;
  for (let x = 0; x <= CANVAS_WIDTH; x += 160) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FACADE_TOP); ctx.stroke();
  }
  for (let y = 66; y < FACADE_TOP; y += 120) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
  }

  // Brass compass inlay on the lobby side of the door.
  ctx.save();
  ctx.strokeStyle = 'rgba(199, 154, 69, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(DOOR_CENTER_X, DOOR_CENTER_Y, DOOR_RADIUS + 34, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(DOOR_CENTER_X, DOOR_CENTER_Y, DOOR_RADIUS + 42, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Morning sun through the facade windows: soft shafts reaching up and to the right.
  ctx.save();
  ctx.fillStyle = 'rgba(255, 236, 190, 0.28)';
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
  paintReceptionDesk(ctx, 790, 215);
  paintPlant(ctx, 92, 262, 22);
  paintPlant(ctx, 352, 248, 17);
  paintPlant(ctx, 612, 252, 17);
  paintPlant(ctx, 926, 270, 20);
  paintPlant(ctx, 260, 34, 15);
  paintPlant(ctx, 700, 34, 15);
}

/** Brass elevator doors set into a side wall. side = 1 for the left wall, -1 for the right. */
function paintElevators(ctx, wallX, centerY, side) {
  const depth = 14;
  ctx.fillStyle = PALETTE.facade;
  ctx.fillRect(side > 0 ? 0 : wallX - depth, centerY - 40, depth, 80);
  ctx.fillStyle = PALETTE.brass;
  ctx.fillRect(side > 0 ? 4 : wallX - depth + 2, centerY - 30, 8, 60);
  ctx.fillStyle = PALETTE.brassDark;
  ctx.fillRect(side > 0 ? 4 : wallX - depth + 2, centerY - 1, 8, 2);
  // Floor indicator lamp above the doors
  fillCircle(ctx, side > 0 ? 8 : wallX - 8, centerY - 35, 2.5, '#ffcf5a');
}

function paintReceptionDesk(ctx, x, y) {
  // Shadow, then a curved wooden desk with a brass edge.
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = PALETTE.shadow;
  ctx.beginPath();
  ctx.ellipse(SHADOW_OFFSET.x, SHADOW_OFFSET.y, 92, 34, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(92 + SHADOW_OFFSET.x, 12 + SHADOW_OFFSET.y);
  ctx.lineTo(-92 + SHADOW_OFFSET.x, 12 + SHADOW_OFFSET.y);
  ctx.fill();

  ctx.fillStyle = PALETTE.wood;
  ctx.beginPath();
  ctx.ellipse(0, 0, 92, 34, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(92, 12);
  ctx.lineTo(-92, 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.woodLight;
  ctx.beginPath();
  ctx.ellipse(0, 0, 78, 22, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(78, 6);
  ctx.lineTo(-78, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PALETTE.brassLight;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 92, 34, 0, Math.PI, Math.PI * 2);
  ctx.stroke();

  // Monitor, lamp and a little "LOBBY" sign
  fillRoundRect(ctx, -30, -18, 24, 5, 2, '#22252c');
  fillCircle(ctx, 40, -10, 7, '#f1d68f');
  fillCircle(ctx, 40, -10, 3, '#fff6d6');
  fillRoundRect(ctx, -6, -6, 14, 8, 2, '#f7f3ea');
  // Receptionist (seen from above, facing the door)
  fillEllipse(ctx, -8, -38, 11, 7, 0, '#6b4f7a');
  fillCircle(ctx, -8, -37, 5.5, '#3b2a22');
  ctx.restore();
}

function paintPlant(ctx, x, y, radius) {
  fillCircle(ctx, x + SHADOW_OFFSET.x, y + SHADOW_OFFSET.y, radius + 2, PALETTE.shadow);
  fillCircle(ctx, x, y, radius * 0.62, '#b86a45');
  fillCircle(ctx, x, y, radius * 0.5, '#6b4a33');
  const leaves = 9;
  for (let i = 0; i < leaves; i++) {
    const angle = (i / leaves) * Math.PI * 2;
    fillEllipse(ctx, x + Math.cos(angle) * radius * 0.55, y + Math.sin(angle) * radius * 0.55,
      radius * 0.55, radius * 0.22, angle, i % 2 ? PALETTE.leaf : PALETTE.leafDark);
  }
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + 0.4;
    fillEllipse(ctx, x + Math.cos(angle) * radius * 0.3, y + Math.sin(angle) * radius * 0.3,
      radius * 0.38, radius * 0.16, angle, PALETTE.leafLight);
  }
}

// ---- Building front ----

function paintFacade(ctx) {
  const gapHalfWidth = DOOR_RADIUS + 10;
  // Wall band with window bays. It stops where the door's glass housing begins.
  for (const [left, right] of [[0, DOOR_CENTER_X - gapHalfWidth], [DOOR_CENTER_X + gapHalfWidth, CANVAS_WIDTH]]) {
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(left + SHADOW_OFFSET.x, FACADE_TOP + SHADOW_OFFSET.y, right - left, FACADE_BOTTOM - FACADE_TOP);
    ctx.fillStyle = PALETTE.facade;
    ctx.fillRect(left, FACADE_TOP, right - left, FACADE_BOTTOM - FACADE_TOP);
    ctx.fillStyle = PALETTE.facadeLight;
    ctx.fillRect(left, FACADE_TOP, right - left, 4);
  }
  // Windows: pale glass strips between pillars.
  for (const [left, right] of [[24, 128], [176, 300], [664, 776], [824, 934]]) {
    ctx.fillStyle = PALETTE.window;
    ctx.fillRect(left, FACADE_TOP + 9, right - left, 10);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillRect(left, FACADE_TOP + 9, right - left, 3);
  }
  // Brass lettering on the street face of the building
  ctx.fillStyle = PALETTE.brassLight;
  ctx.font = font(9, 'bold', FONT_DISPLAY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fillSpacedText(ctx, 'CONSOLIDATED HOLDINGS', 240, FACADE_BOTTOM - 6, 2.4);
  fillSpacedText(ctx, 'EST. 1962 · FLOORS 1–40', 720, FACADE_BOTTOM - 6, 2.4);
}

// ---- Street ----

function paintSidewalk(ctx, random) {
  ctx.fillStyle = PALETTE.sidewalk;
  ctx.fillRect(0, FACADE_BOTTOM, CANVAS_WIDTH, CURB_Y - FACADE_BOTTOM);
  // Slabs with slightly different tones
  const slabWidth = 80;
  const slabHeight = 64;
  for (let row = 0; FACADE_BOTTOM + row * slabHeight < CURB_Y; row++) {
    const offset = row % 2 ? slabWidth / 2 : 0;
    for (let x = -offset; x < CANVAS_WIDTH; x += slabWidth) {
      const y = FACADE_BOTTOM + row * slabHeight;
      const tone = 190 + Math.floor(random() * 12);
      ctx.fillStyle = `rgb(${tone}, ${tone + 3}, ${tone + 4})`;
      ctx.fillRect(x + 1, y + 1, slabWidth - 2, Math.min(slabHeight, CURB_Y - y) - 2);
    }
  }
  ctx.strokeStyle = PALETTE.sidewalkJoint;
  ctx.lineWidth = 1;
  for (let row = 0; FACADE_BOTTOM + row * slabHeight < CURB_Y; row++) {
    const y = FACADE_BOTTOM + row * slabHeight;
    ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(CANVAS_WIDTH, y + 0.5); ctx.stroke();
  }
  // Dark wet patches from last night's rain
  for (const [x, y, rx, ry] of [[300, 392, 46, 14], [706, 488, 30, 10], [150, 520, 36, 11], [880, 380, 28, 9]]) {
    fillEllipse(ctx, x, y, rx + 10, ry + 6, 0, 'rgba(120, 130, 138, 0.18)');
    fillEllipse(ctx, x, y, rx, ry, 0, PALETTE.puddle);
    fillEllipse(ctx, x - rx * 0.3, y - ry * 0.3, rx * 0.5, ry * 0.28, 0, 'rgba(255, 255, 255, 0.35)');
  }
  // Curb
  ctx.fillStyle = PALETTE.curb;
  ctx.fillRect(0, CURB_Y, CANVAS_WIDTH, ROAD_Y - CURB_Y);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.fillRect(0, ROAD_Y - 2, CANVAS_WIDTH, 2);
}

function paintRoad(ctx, random) {
  ctx.fillStyle = PALETTE.road;
  ctx.fillRect(0, ROAD_Y, CANVAS_WIDTH, CANVAS_HEIGHT - ROAD_Y);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(random() * CANVAS_WIDTH, ROAD_Y + random() * (CANVAS_HEIGHT - ROAD_Y), 2, 2);
  }
  // Lane divider
  ctx.fillStyle = PALETTE.roadMark;
  for (let x = 10; x < CANVAS_WIDTH; x += 44) ctx.fillRect(x, 617, 22, 2);
  // Crosswalk
  ctx.fillStyle = 'rgba(236, 230, 211, 0.9)';
  for (let x = 812; x < 930; x += 14) ctx.fillRect(x, ROAD_Y + 3, 8, CANVAS_HEIGHT - ROAD_Y - 3);
}

function paintStreetFurniture(ctx) {
  paintCoffeeCart(ctx, 800, 404);
  paintTree(ctx, 936, 470, 46);
  paintTree(ctx, 30, 368, 34);
  // Newspaper box
  fillRoundRect(ctx, 628 + SHADOW_OFFSET.x, 368 + SHADOW_OFFSET.y, 22, 16, 3, PALETTE.shadow);
  fillRoundRect(ctx, 628, 368, 22, 16, 3, '#2f6fbd');
  fillRoundRect(ctx, 631, 371, 16, 6, 1, '#f3efe4');
  // Fire hydrant
  fillCircle(ctx, 732 + SHADOW_OFFSET.x, 562 + SHADOW_OFFSET.y, 7, PALETTE.shadow);
  fillCircle(ctx, 732, 562, 7, '#d23f33');
  fillCircle(ctx, 732, 562, 3.5, '#f07b6d');
}

/** The coffee cart where every intern got their order. */
function paintCoffeeCart(ctx, x, y) {
  fillRoundRect(ctx, x - 30 + SHADOW_OFFSET.x, y - 18 + SHADOW_OFFSET.y, 60, 36, 6, PALETTE.shadow);
  fillRoundRect(ctx, x - 30, y - 18, 60, 36, 6, '#7a4b2c');
  fillRoundRect(ctx, x - 26, y - 14, 52, 28, 4, '#a8724a');
  // Striped umbrella, seen from above
  const radius = 34;
  fillCircle(ctx, x + 6 + SHADOW_OFFSET.x * 1.6, y - 4 + SHADOW_OFFSET.y * 1.6, radius, PALETTE.shadowSoft);
  const stripes = 10;
  for (let i = 0; i < stripes; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 6, y - 4);
    ctx.arc(x + 6, y - 4, radius, (i / stripes) * Math.PI * 2, ((i + 1) / stripes) * Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? '#f6efe0' : '#2f7a5a';
    ctx.fill();
  }
  fillCircle(ctx, x + 6, y - 4, 3, PALETTE.brass);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = font(8, 'bold', FONT_DISPLAY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
}

function paintTree(ctx, x, y, radius) {
  fillCircle(ctx, x + SHADOW_OFFSET.x * 2, y + SHADOW_OFFSET.y * 2, radius, PALETTE.shadow);
  const random = seededRandom(Math.floor(x * 13 + y));
  for (let i = 0; i < 14; i++) {
    const angle = random() * Math.PI * 2;
    const distance = random() * radius * 0.55;
    fillCircle(ctx, x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, radius * (0.35 + random() * 0.2),
      i % 3 === 0 ? PALETTE.leafDark : PALETTE.leaf);
  }
  for (let i = 0; i < 7; i++) {
    const angle = random() * Math.PI * 2;
    const distance = random() * radius * 0.4;
    fillCircle(ctx, x - 6 + Math.cos(angle) * distance, y + 4 + Math.sin(angle) * distance, radius * 0.18, PALETTE.leafLight);
  }
}

// ---- Things that change every frame ----

/** Puddle highlights drift a little, so the street never looks frozen. */
function drawStreetShimmer(ctx, time) {
  ctx.save();
  ctx.globalAlpha = 0.35 + 0.15 * Math.sin(time * 0.8);
  for (const [x, y, rx] of [[300, 392, 46], [706, 488, 30], [880, 380, 28]]) {
    const drift = Math.sin(time * 0.5 + x) * rx * 0.3;
    fillEllipse(ctx, x + drift, y + 2, rx * 0.25, 1.5, 0, '#ffffff');
  }
  ctx.restore();
}

/**
 * Brass posts and belts marking each queue lane, painted floor spots for the 8
 * legal places, and a red GRIDLOCK line where the 9th person would stand.
 * Spots light up amber and red as the line fills, so gridlock is visible before it happens.
 */
function drawQueueLane(ctx, queue, time) {
  const side = queue.side;
  const halfWidth = 19;
  const spots = MAX_QUEUE_LENGTH;
  const endDistance = spots * QUEUE_SPACING;

  // Floor spots
  for (let k = 0; k <= spots; k++) {
    const point = pointOnQueuePath(side, k * QUEUE_SPACING);
    if (k === spots) {
      const isPulsing = queue.length >= spots;
      const alpha = isPulsing ? 0.7 + 0.3 * Math.sin(time * 10) : 0.55;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = PALETTE.danger;
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      if (k > QUEUE_TURN_AFTER_SPOTS) {
        ctx.moveTo(point.x, point.y - halfWidth + 3);
        ctx.lineTo(point.x, point.y + halfWidth - 3);
      } else {
        ctx.moveTo(point.x - halfWidth + 3, point.y);
        ctx.lineTo(point.x + halfWidth - 3, point.y);
      }
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = PALETTE.danger;
      ctx.font = font(8, 'bold', FONT_DISPLAY);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Label on the inner side of the turn, away from the sidewalk traffic
      fillSpacedText(ctx, 'GRIDLOCK', point.x + (side === 'street' ? 8 : -8), point.y - halfWidth - 8, 1.5);
      ctx.restore();
      continue;
    }
    let color = 'rgba(255, 255, 255, 0.55)';
    if (k < queue.length) {
      color = queue.length >= 8 ? PALETTE.danger : queue.length >= 6 ? PALETTE.warning : 'rgba(255, 255, 255, 0.9)';
    }
    fillEllipse(ctx, point.x, point.y, 7, 7, 0, 'rgba(0, 0, 0, 0.06)');
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Posts and belts along both sides of the lane
  const posts = [];
  const outward = side === 'street' ? 1 : -1;
  const sideways = side === 'street' ? 1 : -1;
  const front = queueFrontPoint(side);
  const corner = pointOnQueuePath(side, QUEUE_PATH_CORNER_DISTANCE);
  const laneStartY = front.y - outward * 14;
  const end = pointOnQueuePath(side, endDistance + 8);
  // Inner side (the side the line turns toward) and outer side
  const innerX = front.x + sideways * halfWidth;
  const outerX = front.x - sideways * halfWidth;
  const innerCornerY = corner.y - outward * halfWidth;
  const outerCornerY = corner.y + outward * halfWidth;
  const innerLine = [{ x: innerX, y: laneStartY }, { x: innerX, y: innerCornerY }, { x: end.x, y: innerCornerY }];
  const outerLine = [{ x: outerX, y: laneStartY }, { x: outerX, y: outerCornerY }, { x: end.x, y: outerCornerY }];
  for (const line of [innerLine, outerLine]) {
    ctx.strokeStyle = PALETTE.belt;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(line[0].x, line[0].y);
    for (const point of line.slice(1)) ctx.lineTo(point.x, point.y);
    ctx.stroke();
    posts.push(...line);
  }
  for (const post of posts) {
    fillCircle(ctx, post.x + 2, post.y - 2, 4.5, PALETTE.shadow);
    fillCircle(ctx, post.x, post.y, 4.5, PALETTE.brassDark);
    fillCircle(ctx, post.x - 0.8, post.y - 0.8, 2.6, PALETTE.brassLight);
  }
}

/**
 * The WAIT barrier (AC #29): while ↓ or ↑ is held, a belt snaps across the front
 * of that line and a red PLEASE WAIT sign pops up beside it.
 */
function drawGateBarrier(ctx, side, amount) {
  if (amount < 0.01) return;
  const front = queueFrontPoint(side);
  const outward = side === 'street' ? 1 : -1;
  const y = front.y - outward * 14;
  const halfWidth = 19;
  const reach = easeOutBack(amount);
  // Belt slides across from the left post
  ctx.strokeStyle = PALETTE.danger;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(front.x - halfWidth, y);
  ctx.lineTo(front.x - halfWidth + 2 * halfWidth * Math.min(1, reach), y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(front.x - halfWidth, y);
  ctx.lineTo(front.x - halfWidth + 2 * halfWidth * Math.min(1, reach), y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Sign on a post beside the lane (to the left, away from the line's turn)
  const signX = front.x - halfWidth - 44;
  const signY = y + outward * 4;
  ctx.save();
  ctx.translate(signX, signY);
  ctx.scale(reach, reach);
  fillRoundRect(ctx, -30 + 3, -13 - 3, 60, 26, 6, PALETTE.shadow);
  fillRoundRect(ctx, -30, -13, 60, 26, 6, PALETTE.danger);
  roundRectPath(ctx, -27, -10, 54, 20, 4);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = font(12, 'bold', FONT_DISPLAY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fillSpacedText(ctx, 'WAIT', 0, 1, 2);
  ctx.restore();
}

function drawCars(ctx, cars) {
  for (const car of cars) {
    ctx.save();
    ctx.translate(car.x, car.y);
    if (car.direction < 0) ctx.scale(-1, 1);
    const length = car.length;
    fillRoundRect(ctx, -length / 2 + 3, -9 - 2, length, 18, 6, 'rgba(0,0,0,0.25)');
    fillRoundRect(ctx, -length / 2, -9, length, 18, 6, car.color);
    // Windshield and rear window, roof highlight
    fillRoundRect(ctx, length * 0.08, -7, length * 0.18, 14, 3, 'rgba(30, 40, 60, 0.75)');
    fillRoundRect(ctx, -length * 0.36, -7, length * 0.12, 14, 3, 'rgba(30, 40, 60, 0.6)');
    fillRoundRect(ctx, -length * 0.22, -6, length * 0.28, 12, 3, 'rgba(255,255,255,0.18)');
    if (car.color === '#f2c230') fillRoundRect(ctx, -length * 0.12, -3, 8, 6, 1, '#1f2430');   // taxi roof light
    fillCircle(ctx, length / 2 - 2, -6, 1.6, '#fff4c2');
    fillCircle(ctx, length / 2 - 2, 6, 1.6, '#fff4c2');
    ctx.restore();
  }
}
