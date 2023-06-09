import Blockly from "blockly";
import MazeBlocks from "./maze-blocks";
import Level1 from "./levels/level-1";
import Level2 from "./levels/level-2";
import Level3 from "./levels/level-3";

import BlocklyCode from "./lib-code";
import BlocklyDialogs from "./lib-dialogs";
import BlocklyGames from "./lib-games";
import BlocklyInterface from "./lib-interface";

let level = Level1;
let toolbox = level.toolbox;
let map = level.map;
let MAX_BLOCKS = level.MAX_BLOCKS;
let isMobile = false;

// Replay animation speed multiplier
let speedMultiplier = 1;
document
  .getElementById("speedSelector")
  .addEventListener("change", function handleChange(event) {
    speedMultiplier = event.target.value;
    window.localStorage["speedMultiplier"] = speedMultiplier;
  });

if (window.localStorage["speedMultiplier"]) {
  speedMultiplier = window.localStorage["speedMultiplier"];
  document.getElementById("speedSelector").value = speedMultiplier;
}

// Help dialog - display only the first time a user opens the game
if (!window.localStorage["helpViewed"]) {
  window.localStorage["helpViewed"] = true;
  showHelpDialog();
}

document
  .getElementById("help-button")
  .addEventListener("click", () => showHelpDialog());

window.dialogHide = function () {
  BlocklyDialogs.hideDialog(false);
};

// For mobile devices, increase the size of the blockly elements
if (window.innerHeight > window.innerWidth) {
  isMobile = true;
  document.getElementsByTagName("body")[0].classList.add("mobile");
}

// Buttons for changing the level
document.querySelectorAll("[id^='btn-level']").forEach((btn) => {
  var id = btn.id.replace("btn-level", "");
  btn.addEventListener("click", () => changeLevel(id), id);
});

function changeLevel(levelNumber) {
  BlocklyInterface.saveToLocalStorage();
  switch (levelNumber) {
    case "1":
      level = Level1;
      break;
    case "2":
      level = Level2;
      break;
    case "3":
      level = Level3;
      break;
    default:
      level = Level1;
  }
  document.querySelectorAll("[id^='btn-level']").forEach((btn) => {
    btn.classList.remove("primary");
  });
  document.getElementById("btn-level" + levelNumber).classList.add("primary");
  BlocklyGames.LEVEL = levelNumber;
  loadLevel();
}

// Crash type constants.
const CRASH_STOP = 1;
const CRASH_SPIN = 2;
const CRASH_FALL = 3;

const SKINS = [
  // sprite: A 1029x51 set of 21 avatar images.
  // tiles: A 250x200 set of 20 map images.
  // background: An optional 400x450 background image, or false.
  // look: Colour of sonar-like look icon.
  // winSound: List of sounds (in various formats) to play when the player wins.
  // crashSound: List of sounds (in various formats) for player crashes.
  // crashType: Behaviour when player crashes (stop, spin, or fall).
  {
    sprite: "./assets/images/ninja.png",
    tiles: "./assets/images/tiles_ninja.png",
    background: "./assets/images/bg_ninja.png",
    look: "#000",
    crashType: CRASH_STOP,
  },
];
const SKIN_ID = BlocklyGames.getIntegerParamFromUrl(
  "skin",
  0,
  SKINS.length - 1
);
const SKIN = SKINS[SKIN_ID];

/**
 * The types of squares in the maze, which is represented
 * as a 2D array of SquareType values.
 * @enum {number}
 */
const SquareType = {
  WALL: 0,
  OPEN: 1,
  START: 2,
  FINISH: 3,
};

/**
 * Measure maze dimensions and set sizes.
 * ROWS: Number of tiles down.
 * COLS: Number of tiles across.
 * SQUARE_SIZE: Pixel height and width of each maze square (i.e. tile).
 */
let ROWS = map.length;
let COLS = map[0].length;
const SQUARE_SIZE = 50;
const PEGMAN_HEIGHT = 52;
const PEGMAN_WIDTH = 49;

let MAZE_WIDTH = SQUARE_SIZE * COLS;
let MAZE_HEIGHT = SQUARE_SIZE * ROWS;
const PATH_WIDTH = SQUARE_SIZE / 3;

/**
 * Constants for cardinal directions.  Subsequent code assumes these are
 * in the range 0..3 and that opposites have an absolute difference of 2.
 * @enum {number}
 */
const DirectionType = {
  NORTH: 0,
  EAST: 1,
  SOUTH: 2,
  WEST: 3,
};

/**
 * Outcomes of running the user program.
 */
const ResultType = {
  UNSET: 0,
  SUCCESS: 1,
  FAILURE: -1,
  TIMEOUT: 2,
  ERROR: -2,
};

/**
 * Result of last execution.
 */
let result = ResultType.UNSET;

/**
 * Starting direction.
 */
let startDirection = DirectionType.EAST;

/**
 * PIDs of animation tasks currently executing.
 * @type !Array<number>
 */
const pidList = [];

// Map each possible shape to a sprite.
// Input: Binary string representing Centre/North/West/South/East squares.
// Output: [x, y] coordinates of each tile's sprite in tiles.png.
const tile_SHAPES = {
  10010: [4, 0], // Dead ends
  10001: [3, 3],
  11000: [0, 1],
  10100: [0, 2],
  11010: [4, 1], // Vertical
  10101: [3, 2], // Horizontal
  10110: [0, 0], // Elbows
  10011: [2, 0],
  11001: [4, 2],
  11100: [2, 3],
  11110: [1, 1], // Junctions
  10111: [1, 0],
  11011: [2, 1],
  11101: [1, 2],
  11111: [2, 2], // Cross
  null0: [4, 3], // Empty
  null1: [3, 0],
  null2: [3, 1],
  null3: [0, 3],
  null4: [1, 3],
};

/**
 * Milliseconds between each animation frame.
 */
let stepSpeed;

let start_;
let finish_;
let pegmanX;
let pegmanY;
let pegmanD;

/**
 * Log of Pegman's moves.  Recorded during execution, played back for animation.
 * @type !Array<!Array<string>>
 */
const log = [];

/**
 * Create and layout all the nodes for the path, scenery, Pegman, and goal.
 */
function drawMap() {
  //Reset svgMaze
  const svg = BlocklyGames.getElementById("svgMaze");
  svg.innerHTML = `<g id="look">
        <path d="M 0,-15 a 15 15 0 0 1 15 15" />
        <path d="M 0,-35 a 35 35 0 0 1 35 35" />
        <path d="M 0,-55 a 55 55 0 0 1 55 55" />
      </g>`;
  const scale = Math.max(ROWS, COLS) * SQUARE_SIZE;
  svg.setAttribute("viewBox", "0 0 " + scale + " " + scale);

  // Draw the outer square.
  Blockly.utils.dom.createSvgElement(
    "rect",
    {
      height: MAZE_HEIGHT,
      width: MAZE_WIDTH,
      fill: "#F1EEE7",
      "stroke-width": 1,
      stroke: "#CCB",
    },
    svg
  );

  if (SKIN.background) {
    const tile = Blockly.utils.dom.createSvgElement(
      "image",
      {
        height: MAZE_HEIGHT,
        width: MAZE_WIDTH,
        x: 0,
        y: 0,
        opacity: 0.9,
      },
      svg
    );
    tile.setAttributeNS(
      Blockly.utils.dom.XLINK_NS,
      "xlink:href",
      SKIN.background
    );
  }

  // Draw the tiles making up the maze map.

  // Return a value of '0' if the specified square is wall or out of bounds,
  // '1' otherwise (empty, start, finish).
  const normalize = function (x, y) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) {
      return "0";
    }
    return map[y][x] === SquareType.WALL ? "0" : "1";
  };

  // Compute and draw the tile for each square.
  let tileId = 0;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      // Compute the tile shape.
      let tileShape =
        normalize(x, y) +
        normalize(x, y - 1) + // North.
        normalize(x + 1, y) + // West.
        normalize(x, y + 1) + // South.
        normalize(x - 1, y); // East.

      // Draw the tile.
      if (!tile_SHAPES[tileShape]) {
        // Empty square.  Use null0 for large areas, with null1-4 for borders.
        // Add some randomness to avoid large empty spaces.
        if (tileShape === "00000" && Math.random() > 0.3) {
          tileShape = "null0";
        } else {
          tileShape = "null" + Math.floor(1 + Math.random() * 4);
        }
      }
      const left = tile_SHAPES[tileShape][0];
      const top = tile_SHAPES[tileShape][1];
      // Tile's clipPath element.
      const tileClip = Blockly.utils.dom.createSvgElement(
        "clipPath",
        {
          id: "tileClipPath" + tileId,
        },
        svg
      );
      Blockly.utils.dom.createSvgElement(
        "rect",
        {
          height: SQUARE_SIZE,
          width: SQUARE_SIZE,
          x: x * SQUARE_SIZE,
          y: y * SQUARE_SIZE,
        },
        tileClip
      );
      // Tile sprite.
      const tile = Blockly.utils.dom.createSvgElement(
        "image",
        {
          height: SQUARE_SIZE * 4,
          width: SQUARE_SIZE * 5,
          "clip-path": "url(#tileClipPath" + tileId + ")",
          x: (x - left) * SQUARE_SIZE,
          y: (y - top) * SQUARE_SIZE,
        },
        svg
      );
      tile.setAttributeNS(Blockly.utils.dom.XLINK_NS, "xlink:href", SKIN.tiles);
      tileId++;
    }
  }

  // Add finish marker.
  const finishMarker = Blockly.utils.dom.createSvgElement(
    "image",
    {
      id: "finish",
      height: 34,
      width: 20,
    },
    svg
  );
  finishMarker.setAttributeNS(
    Blockly.utils.dom.XLINK_NS,
    "xlink:href",
    "assets/images/marker.png"
  );

  // Pegman's clipPath element, whose (x, y) is reset by displayPegman
  const pegmanClip = Blockly.utils.dom.createSvgElement(
    "clipPath",
    {
      id: "pegmanClipPath",
    },
    svg
  );
  Blockly.utils.dom.createSvgElement(
    "rect",
    {
      id: "clipRect",
      height: PEGMAN_HEIGHT,
      width: PEGMAN_WIDTH,
    },
    pegmanClip
  );

  // Add Pegman.
  const pegmanIcon = Blockly.utils.dom.createSvgElement(
    "image",
    {
      id: "pegman",
      height: PEGMAN_HEIGHT,
      width: PEGMAN_WIDTH * 21, // 49 * 21 = 1029
      "clip-path": "url(#pegmanClipPath)",
    },
    svg
  );
  pegmanIcon.setAttributeNS(
    Blockly.utils.dom.XLINK_NS,
    "xlink:href",
    SKIN.sprite
  );
}

MazeBlocks.init();

/**
 * Initialize the game. Import dependencies. Add button click listeners.
 */
function init() {
  loadLevel();

  BlocklyGames.bindClick("runButton", runButtonClick);
  BlocklyGames.bindClick("resetButton", resetButtonClick);

  // Lazy-load the JavaScript interpreter.
  BlocklyCode.importInterpreter();
  // Lazy-load the syntax-highlighting.
  BlocklyCode.importPrettify();
}

init();

/**
 * Initialize Blockly and the maze.  Called on page load.
 */
function loadLevel() {
  toolbox = level.toolbox;

  // The maze square constants defined above are inlined here
  // for ease of reading and writing the static mazes.
  map = level.map;

  BlocklyGames.storageName = "maze";

  MAX_BLOCKS = level.MAX_BLOCKS;

  BlocklyInterface.init("Maze");

  let scale = 1;
  if (isMobile) {
    scale = window.innerWidth / 1000 * 2;
  }
  //console.log(scale);

  BlocklyInterface.injectBlockly({
    toolbox: toolbox,
    maxBlocks: MAX_BLOCKS,
    trashcan: false,
    zoom: { startScale: scale },
  });

  drawMap();

  const defaultXml = "<xml></xml>";
  BlocklyInterface.loadBlocks(defaultXml, false);

  // Locate the start and finish squares.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (map[y][x] === SquareType.START) {
        start_ = { x, y };
      } else if (map[y][x] === SquareType.FINISH) {
        finish_ = { x, y };
      }
    }
  }

  resetButtonClick();

  BlocklyInterface.workspace.addChangeListener(updateCapacity);
}

/**
 * Show the help dialog.
 */
function showHelpDialog() {
  let content = document.getElementById("dialogHelp");
  document.getElementById("dialogHelpText").textContent = level.helpText;
  BlocklyDialogs.showDialog(content, null, false, true, null, null);
}

/**
 * Reset the maze to the start position and kill any pending animation tasks.
 * @param {boolean} first True if an opening animation is to be played.
 */
function reset(first) {
  // Kill all tasks.
  pidList.forEach(clearTimeout);
  pidList.length = 0;

  // Move Pegman into position.
  pegmanX = start_.x;
  pegmanY = start_.y;

  if (first) {
    // Opening animation.
    pegmanD = startDirection + 1;
    scheduleFinish(false);
    pidList.push(
      setTimeout(function () {
        stepSpeed = 100;
        schedule(
          [pegmanX, pegmanY, pegmanD * 4],
          [pegmanX, pegmanY, pegmanD * 4 - 4]
        );
        pegmanD++;
      }, stepSpeed * 5)
    );
  } else {
    pegmanD = startDirection;
    displayPegman(pegmanX, pegmanY, pegmanD * 4);
  }

  // Move the finish icon into position.
  const finishIcon = BlocklyGames.getElementById("finish");
  finishIcon.setAttribute(
    "x",
    SQUARE_SIZE * (finish_.x + 0.5) - finishIcon.getAttribute("width") / 2
  );
  finishIcon.setAttribute(
    "y",
    SQUARE_SIZE * (finish_.y + 0.6) - finishIcon.getAttribute("height")
  );

  // Make 'look' icon invisible and promote to top.
  const lookIcon = BlocklyGames.getElementById("look");
  lookIcon.style.display = "none";
  lookIcon.parentNode.appendChild(lookIcon);
  const paths = lookIcon.getElementsByTagName("path");
  for (const path of paths) {
    path.setAttribute("stroke", SKIN.look);
  }
}

/**
 * Click the run button.  Start the program.
 * @param {!Event} e Mouse or touch event.
 */
function runButtonClick(e) {
  // Prevent double-clicks or double-taps.
  if (BlocklyInterface.eventSpam(e)) {
    return;
  }
  BlocklyDialogs.hideDialog(false);
  const runButton = BlocklyGames.getElementById("runButton");
  const resetButton = BlocklyGames.getElementById("resetButton");
  // Ensure that Reset button is at least as wide as Run button.
  if (!resetButton.style.minWidth) {
    resetButton.style.minWidth = runButton.offsetWidth + "px";
  }
  runButton.style.display = "none";
  resetButton.style.display = "inline";
  reset(false);
  BlocklyInterface.saveToLocalStorage();
  execute();
}

/**
 * Updates the document's 'capacity' element with a message
 * indicating how many more blocks are permitted.  The capacity
 * is retrieved from BlocklyInterface.workspace.remainingCapacity().
 */
function updateCapacity() {
  const cap = BlocklyInterface.workspace.remainingCapacity();
  const p = BlocklyGames.getElementById("capacity");
  p.innerHTML = "";
  if (cap === Infinity) {
    p.style.display = "none";
  } else {
    p.style.display = "inline";
    p.innerHTML = "";
    const capSpan = document.createElement("span");
    capSpan.className = "capacityNumber";
    capSpan.appendChild(document.createTextNode(Number(cap)));
    // Safe from HTML injection due to createTextNode below.
    let msg;
    if (cap === 0) {
      msg = "You have %0 blocks left.";
    } else if (cap === 1) {
      msg = "You have %1 blocks left.";
    } else {
      msg = "You have %2 blocks left.";
    }
    const parts = msg.split(/%\d/);
    for (let i = 0; i < parts.length; i++) {
      p.appendChild(document.createTextNode(parts[i]));
      if (i !== parts.length - 1) {
        p.appendChild(capSpan.cloneNode(true));
      }
    }
  }
}

/**
 * Click the reset button. Reset the maze.
 * @param {!Event} e Mouse or touch event.
 */
function resetButtonClick(e) {
  // Prevent double-clicks or double-taps.
  if (BlocklyInterface.eventSpam(e)) {
    return;
  }
  const runButton = BlocklyGames.getElementById("runButton");
  runButton.style.display = "inline";
  BlocklyGames.getElementById("resetButton").style.display = "none";
  BlocklyInterface.workspace.highlightBlock(null);
  reset(false);
}

/**
 * Inject the Maze API into a JavaScript interpreter.
 * @param {!Interpreter} interpreter The JS-Interpreter.
 * @param {!Interpreter.Object} globalObject Global object.
 */
function initInterpreter(interpreter, globalObject) {
  // API
  let wrapper;
  wrapper = function (id) {
    move(0, id);
  };
  wrap("moveForward");

  wrapper = function (id) {
    move(2, id);
  };
  wrap("moveBackward");

  wrapper = function (id) {
    turn(0, id);
  };
  wrap("turnLeft");

  wrapper = function (id) {
    turn(1, id);
  };
  wrap("turnRight");

  wrapper = function (id) {
    return isPath(0, id);
  };
  wrap("isPathForward");

  wrapper = function (id) {
    return isPath(1, id);
  };
  wrap("isPathRight");

  wrapper = function (id) {
    return isPath(2, id);
  };
  wrap("isPathBackward");

  wrapper = function (id) {
    return isPath(3, id);
  };
  wrap("isPathLeft");

  wrapper = function () {
    return notDone();
  };
  wrap("notDone");

  function wrap(name) {
    interpreter.setProperty(
      globalObject,
      name,
      interpreter.createNativeFunction(wrapper, false)
    );
  }
}

/**
 * Execute the user's code.  Heaven help us...
 */
function execute() {
  if (!("Interpreter" in window)) {
    // Interpreter lazy loads and hasn't arrived yet.  Try again later.
    setTimeout(execute, 99);
    return;
  }

  log.length = 0;
  Blockly.selected && Blockly.selected.unselect();
  const code = BlocklyCode.getJsCode();
  BlocklyCode.executedJsCode = code;
  BlocklyInterface.executedCode = BlocklyInterface.getCode();
  result = ResultType.UNSET;
  const interpreter = new Interpreter(code, initInterpreter);

  // Try running the user's code.  There are four possible outcomes:
  // 1. If pegman reaches the finish [SUCCESS], true is thrown.
  // 2. If the program is terminated due to running too long [TIMEOUT],
  //    false is thrown.
  // 3. If another error occurs [ERROR], that error is thrown.
  // 4. If the program ended normally but without solving the maze [FAILURE],
  //    no error or exception is thrown.
  try {
    let ticks = 10000; // 10k ticks runs Pegman for about 8 minutes.
    while (interpreter.step()) {
      if (ticks-- === 0) {
        throw Infinity;
      }
    }
    result = notDone() ? ResultType.FAILURE : ResultType.SUCCESS;
  } catch (e) {
    // A boolean is thrown for normal termination.
    // Abnormal termination is a user error.
    if (e === Infinity) {
      result = ResultType.TIMEOUT;
    } else if (e === false) {
      result = ResultType.ERROR;
    } else {
      // Syntax error, can't happen.
      result = ResultType.ERROR;
      alert(e);
    }
  }

  // Fast animation if execution is successful.  Slow otherwise.
  if (result === ResultType.SUCCESS) {
    stepSpeed = parseInt(100 * speedMultiplier, 10);
    log.push(["finish", null]);
  } else {
    stepSpeed = parseInt(150 * speedMultiplier, 10);
  }

  // log now contains a transcript of all the user's actions.
  // Reset the maze and animate the transcript.
  reset(false);
  pidList.push(setTimeout(animate, 100));
}

/**
 * Iterate through the recorded path and animate pegman's actions.
 */
function animate() {
  const action = log.shift();
  if (!action) {
    BlocklyCode.highlight(null);
    return;
  }
  BlocklyCode.highlight(action[1]);

  switch (action[0]) {
    case "north":
      schedule(
        [pegmanX, pegmanY, pegmanD * 4],
        [pegmanX, pegmanY - 1, pegmanD * 4]
      );
      pegmanY--;
      break;
    case "east":
      schedule(
        [pegmanX, pegmanY, pegmanD * 4],
        [pegmanX + 1, pegmanY, pegmanD * 4]
      );
      pegmanX++;
      break;
    case "south":
      schedule(
        [pegmanX, pegmanY, pegmanD * 4],
        [pegmanX, pegmanY + 1, pegmanD * 4]
      );
      pegmanY++;
      break;
    case "west":
      schedule(
        [pegmanX, pegmanY, pegmanD * 4],
        [pegmanX - 1, pegmanY, pegmanD * 4]
      );
      pegmanX--;
      break;
    case "look_north":
      scheduleLook(DirectionType.NORTH);
      break;
    case "look_east":
      scheduleLook(DirectionType.EAST);
      break;
    case "look_south":
      scheduleLook(DirectionType.SOUTH);
      break;
    case "look_west":
      scheduleLook(DirectionType.WEST);
      break;
    case "fail_forward":
      scheduleFail(true);
      break;
    case "fail_backward":
      scheduleFail(false);
      break;
    case "left":
      schedule(
        [pegmanX, pegmanY, pegmanD * 4],
        [pegmanX, pegmanY, pegmanD * 4 - 4]
      );
      pegmanD = constrainDirection4(pegmanD - 1);
      break;
    case "right":
      schedule(
        [pegmanX, pegmanY, pegmanD * 4],
        [pegmanX, pegmanY, pegmanD * 4 + 4]
      );
      pegmanD = constrainDirection4(pegmanD + 1);
      break;
    case "finish":
      scheduleFinish(true);
      BlocklyInterface.saveToLocalStorage();
      setTimeout(BlocklyCode.congratulations, 300);
  }

  pidList.push(setTimeout(animate, stepSpeed * 5));
}

/**
 * Schedule the animations for a move or turn.
 * @param {!Array<number>} startPos X, Y and direction starting points.
 * @param {!Array<number>} endPos X, Y and direction ending points.
 */
function schedule(startPos, endPos) {
  const deltas = [
    (endPos[0] - startPos[0]) / 4,
    (endPos[1] - startPos[1]) / 4,
    (endPos[2] - startPos[2]) / 4,
  ];
  displayPegman(
    startPos[0] + deltas[0],
    startPos[1] + deltas[1],
    constrainDirection16(startPos[2] + deltas[2])
  );
  pidList.push(
    setTimeout(function () {
      displayPegman(
        startPos[0] + deltas[0] * 2,
        startPos[1] + deltas[1] * 2,
        constrainDirection16(startPos[2] + deltas[2] * 2)
      );
    }, stepSpeed)
  );
  pidList.push(
    setTimeout(function () {
      displayPegman(
        startPos[0] + deltas[0] * 3,
        startPos[1] + deltas[1] * 3,
        constrainDirection16(startPos[2] + deltas[2] * 3)
      );
    }, stepSpeed * 2)
  );
  pidList.push(
    setTimeout(function () {
      displayPegman(endPos[0], endPos[1], constrainDirection16(endPos[2]));
    }, stepSpeed * 3)
  );
}

/**
 * Schedule the animations and sounds for a failed move.
 * @param {boolean} forward True if forward, false if backward.
 */
function scheduleFail(forward) {
  let deltaX = 0;
  let deltaY = 0;
  switch (pegmanD) {
    case DirectionType.NORTH:
      deltaY = -1;
      break;
    case DirectionType.EAST:
      deltaX = 1;
      break;
    case DirectionType.SOUTH:
      deltaY = 1;
      break;
    case DirectionType.WEST:
      deltaX = -1;
      break;
  }
  if (!forward) {
    deltaX = -deltaX;
    deltaY = -deltaY;
  }
  if (SKIN.crashType === CRASH_STOP) {
    // Bounce bounce.
    deltaX /= 4;
    deltaY /= 4;
    const direction16 = constrainDirection16(pegmanD * 4);
    displayPegman(pegmanX + deltaX, pegmanY + deltaY, direction16);
    //BlocklyInterface.workspace.getAudioManager().play('fail', 0.5);
    pidList.push(
      setTimeout(function () {
        displayPegman(pegmanX, pegmanY, direction16);
      }, stepSpeed)
    );
    // pidList.push(setTimeout(function() {
    //   displayPegman(pegmanX + deltaX, pegmanY + deltaY, direction16);
    //   BlocklyInterface.workspace.getAudioManager().play('fail', 0.5);
    // }, stepSpeed * 2));
    pidList.push(
      setTimeout(function () {
        displayPegman(pegmanX, pegmanY, direction16);
      }, stepSpeed * 3)
    );
  } else {
    // Add a small random delta away from the grid.
    const deltaZ = (Math.random() - 0.5) * 10;
    const deltaD = (Math.random() - 0.5) / 2;
    deltaX += (Math.random() - 0.5) / 4;
    deltaY += (Math.random() - 0.5) / 4;
    deltaX /= 8;
    deltaY /= 8;
    let acceleration = 0;
    if (SKIN.crashType === CRASH_FALL) {
      acceleration = 0.01;
    }
    // pidList.push(setTimeout(function() {
    //   BlocklyInterface.workspace.getAudioManager().play('fail', 0.5);
    // }, stepSpeed * 2));
    const setPosition = function (n) {
      return function () {
        const direction16 = constrainDirection16(pegmanD * 4 + deltaD * n);
        displayPegman(
          pegmanX + deltaX * n,
          pegmanY + deltaY * n,
          direction16,
          deltaZ * n
        );
        deltaY += acceleration;
      };
    };
    // 100 frames should get Pegman offscreen.
    for (let i = 1; i < 100; i++) {
      pidList.push(setTimeout(setPosition(i), (stepSpeed * i) / 2));
    }
  }
}

/**
 * Schedule the animations and sound for a victory dance.
 * @param {boolean} sound Play the victory sound.
 */
function scheduleFinish(sound) {
  const direction16 = constrainDirection16(pegmanD * 4);
  displayPegman(pegmanX, pegmanY, 16);
  //   if (sound) {
  //     BlocklyInterface.workspace.getAudioManager().play('win', 0.5);
  //   }
  stepSpeed = 150; // Slow down victory animation a bit.
  pidList.push(
    setTimeout(function () {
      displayPegman(pegmanX, pegmanY, 18);
    }, stepSpeed)
  );
  pidList.push(
    setTimeout(function () {
      displayPegman(pegmanX, pegmanY, 16);
    }, stepSpeed * 2)
  );
  pidList.push(
    setTimeout(function () {
      displayPegman(pegmanX, pegmanY, direction16);
    }, stepSpeed * 3)
  );
}

/**
 * Display Pegman at the specified location, facing the specified direction.
 * @param {number} x Horizontal grid (or fraction thereof).
 * @param {number} y Vertical grid (or fraction thereof).
 * @param {number} d Direction (0 - 15) or dance (16 - 17).
 * @param {number=} opt_angle Optional angle (in degrees) to rotate Pegman.
 */
function displayPegman(x, y, d, opt_angle) {
  const pegmanIcon = BlocklyGames.getElementById("pegman");
  pegmanIcon.setAttribute("x", x * SQUARE_SIZE - d * PEGMAN_WIDTH + 1);
  pegmanIcon.setAttribute("y", SQUARE_SIZE * (y + 0.5) - PEGMAN_HEIGHT / 2 - 8);
  if (opt_angle) {
    pegmanIcon.setAttribute(
      "transform",
      "rotate(" +
        opt_angle +
        ", " +
        (x * SQUARE_SIZE + SQUARE_SIZE / 2) +
        ", " +
        (y * SQUARE_SIZE + SQUARE_SIZE / 2) +
        ")"
    );
  } else {
    pegmanIcon.setAttribute("transform", "rotate(0, 0, 0)");
  }

  const clipRect = BlocklyGames.getElementById("clipRect");
  clipRect.setAttribute("x", x * SQUARE_SIZE + 1);
  clipRect.setAttribute("y", pegmanIcon.getAttribute("y"));
}

/**
 * Display the look icon at Pegman's current location,
 * in the specified direction.
 * @param {!DirectionType} d Direction (0 - 3).
 */
function scheduleLook(d) {
  let x = pegmanX;
  let y = pegmanY;
  switch (d) {
    case DirectionType.NORTH:
      x += 0.5;
      break;
    case DirectionType.EAST:
      x += 1;
      y += 0.5;
      break;
    case DirectionType.SOUTH:
      x += 0.5;
      y += 1;
      break;
    case DirectionType.WEST:
      y += 0.5;
      break;
  }
  x *= SQUARE_SIZE;
  y *= SQUARE_SIZE;
  const deg = d * 90 - 45;

  const lookIcon = BlocklyGames.getElementById("look");
  lookIcon.setAttribute(
    "transform",
    "translate(" + x + ", " + y + ") " + "rotate(" + deg + " 0 0) scale(.4)"
  );
  const paths = lookIcon.getElementsByTagName("path");
  lookIcon.style.display = "inline";
  for (let i = 0; i < paths.length; i++) {
    scheduleLookStep(paths[i], stepSpeed * i);
  }
}

/**
 * Schedule one of the 'look' icon's waves to appear, then disappear.
 * @param {!Element} path Element to make appear.
 * @param {number} delay Milliseconds to wait before making wave appear.
 */
function scheduleLookStep(path, delay) {
  pidList.push(
    setTimeout(function () {
      path.style.display = "inline";
      setTimeout(function () {
        path.style.display = "none";
      }, stepSpeed * 2);
    }, delay)
  );
}

/**
 * Keep the direction within 0-3, wrapping at both ends.
 * @param {number} d Potentially out-of-bounds direction value.
 * @returns {number} Legal direction value.
 */
function constrainDirection4(d) {
  d = Math.round(d) % 4;
  if (d < 0) {
    d += 4;
  }
  return d;
}

/**
 * Keep the direction within 0-15, wrapping at both ends.
 * @param {number} d Potentially out-of-bounds direction value.
 * @returns {number} Legal direction value.
 */
function constrainDirection16(d) {
  d = Math.round(d) % 16;
  if (d < 0) {
    d += 16;
  }
  return d;
}

// Core functions.

/**
 * Attempt to move pegman forward or backward.
 * @param {number} direction Direction to move (0 = forward, 2 = backward).
 * @param {string} id ID of block that triggered this action.
 * @throws {true} If the end of the maze is reached.
 * @throws {false} If Pegman collides with a wall.
 */
function move(direction, id) {
  if (!isPath(direction, null)) {
    log.push(["fail_" + (direction ? "backward" : "forward"), id]);
    throw false;
  }
  // If moving backward, flip the effective direction.
  const effectiveDirection = pegmanD + direction;
  let command;
  switch (constrainDirection4(effectiveDirection)) {
    case DirectionType.NORTH:
      pegmanY--;
      command = "north";
      break;
    case DirectionType.EAST:
      pegmanX++;
      command = "east";
      break;
    case DirectionType.SOUTH:
      pegmanY++;
      command = "south";
      break;
    case DirectionType.WEST:
      pegmanX--;
      command = "west";
      break;
  }
  log.push([command, id]);
}

/**
 * Turn pegman left or right.
 * @param {number} direction Direction to turn (0 = left, 1 = right).
 * @param {string} id ID of block that triggered this action.
 */
function turn(direction, id) {
  if (direction) {
    // Right turn (clockwise).
    pegmanD++;
    log.push(["right", id]);
  } else {
    // Left turn (counterclockwise).
    pegmanD--;
    log.push(["left", id]);
  }
  pegmanD = constrainDirection4(pegmanD);
}

/**
 * Is there a path next to pegman?
 * @param {number} direction Direction to look
 *     (0 = forward, 1 = right, 2 = backward, 3 = left).
 * @param {?string} id ID of block that triggered this action.
 *     Null if called as a helper function in move().
 * @returns {boolean} True if there is a path.
 */
function isPath(direction, id) {
  const effectiveDirection = pegmanD + direction;
  let square, command;
  switch (constrainDirection4(effectiveDirection)) {
    case DirectionType.NORTH:
      square = map[pegmanY - 1] && map[pegmanY - 1][pegmanX];
      command = "look_north";
      break;
    case DirectionType.EAST:
      square = map[pegmanY][pegmanX + 1];
      command = "look_east";
      break;
    case DirectionType.SOUTH:
      square = map[pegmanY + 1] && map[pegmanY + 1][pegmanX];
      command = "look_south";
      break;
    case DirectionType.WEST:
      square = map[pegmanY][pegmanX - 1];
      command = "look_west";
      break;
  }
  if (id) {
    log.push([command, id]);
  }
  return square !== SquareType.WALL && square !== undefined;
}

/**
 * Is the player at the finish marker?
 * @returns {boolean} True if not done, false if done.
 */
function notDone() {
  return pegmanX !== finish_.x || pegmanY !== finish_.y;
}
