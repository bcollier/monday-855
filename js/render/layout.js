// render/layout.js
// Where things are on screen. Pure geometry: every function here turns game
// state (angles, places in line) into canvas pixels and changes nothing.

/**
 * Converts a game angle (degrees, counterclockwise, 0° = right; see constants.js)
 * and a distance from the door center into canvas pixels.
 * The minus sign on y is there because canvas y grows DOWNWARD.
 */
function pointAroundDoor(angleDegrees, distanceFromCenter) {
  const radians = (angleDegrees * Math.PI) / 180;
  return {
    x: DOOR_CENTER_X + distanceFromCenter * Math.cos(radians),
    y: DOOR_CENTER_Y - distanceFromCenter * Math.sin(radians),
  };
}

/** Canvas rotation (radians, clockwise-positive) for something facing a game angle. */
function canvasRotationForGameAngle(angleDegrees) {
  return (-angleDegrees * Math.PI) / 180;
}

// ---- Queues ----
// Each line leaves its opening straight out (down for the street, up for the lobby)
// for QUEUE_TURN_AFTER_SPOTS spots, then turns: the street line to the right, the
// lobby line to the left. Lines are measured as a distance along that path, so
// "walk to your place in line" is just easing one number.

const QUEUE_PATH_CORNER_DISTANCE = QUEUE_TURN_AFTER_SPOTS * QUEUE_SPACING;

function queueFrontPoint(side) {
  const direction = side === 'street' ? 1 : -1;
  return { x: DOOR_CENTER_X, y: DOOR_CENTER_Y + direction * (DOOR_RADIUS + QUEUE_GAP_FROM_DOOR) };
}

/** Pixel position at a distance along a queue's path. Distance 0 = the front spot. */
function pointOnQueuePath(side, distance) {
  const front = queueFrontPoint(side);
  const outward = side === 'street' ? 1 : -1;     // street goes down, lobby goes up
  const sideways = side === 'street' ? 1 : -1;    // street turns right, lobby turns left
  if (distance <= QUEUE_PATH_CORNER_DISTANCE) {
    return { x: front.x, y: front.y + outward * distance, heading: side === 'street' ? -Math.PI / 2 : Math.PI / 2 };
  }
  return {
    x: front.x + sideways * (distance - QUEUE_PATH_CORNER_DISTANCE),
    y: front.y + outward * QUEUE_PATH_CORNER_DISTANCE,
    // People face toward the front of the line, which is back along the path.
    heading: side === 'street' ? Math.PI : 0,
  };
}

/** Distance along the path where new arrivals appear: the right edge (street) or the elevators (lobby). */
function queueArrivalDistance(side) {
  const sidewaysRoom = side === 'street' ? CANVAS_WIDTH + 30 - DOOR_CENTER_X : DOOR_CENTER_X - 12;
  return QUEUE_PATH_CORNER_DISTANCE + sidewaysRoom;
}

// ---- Riders ----

/** How far out from the hub a rider sits, as a fraction of the door radius. */
function riderDistanceFactor(riderCount, placeInCompartment, person) {
  if (person.type.takesWholeCompartment) return 0.56;
  if (riderCount === 1) return 0.6;
  return [0.4, 0.78][placeInCompartment] ?? 0.6;
}

// ---- Leaving the door ----
// Street people step out into the lobby and head for the elevators on the right.
// Lobby people step out onto the street and head off along the sidewalk to the left.

function exitPathFrom(start, fromSide) {
  if (fromSide === 'street') {
    return [start, { x: DOOR_CENTER_X + 34, y: 186 }, { x: 600, y: 150 }, { x: CANVAS_WIDTH + 30, y: 118 }];
  }
  return [start, { x: DOOR_CENTER_X - 30, y: 452 }, { x: 380, y: 470 }, { x: -30, y: 470 }];
}
