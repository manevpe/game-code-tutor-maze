import Blockly from "blockly";
import { javascriptGenerator } from "blockly/javascript";

var MazeBlocks = {};

MazeBlocks.init = function () {
  /**
   * Common HSV hue for all movement blocks.
   */
  const MOVEMENT_HUE = 290;

  /**
   * HSV hue for loop block.
   */
  const LOOPS_HUE = 120;

  /**
   * Common HSV hue for all logic blocks.
   */
  const LOGIC_HUE = 210;

  /**
   * Counterclockwise arrow to be appended to left turn option.
   */
  const LEFT_TURN = " ↺";

  /**
   * Clockwise arrow to be appended to right turn option.
   */
  const RIGHT_TURN = " ↻";

  const TURN_DIRECTIONS = [
    ["turn left by", "turnLeft"],
    ["turn right by", "turnRight"],
  ];

  const PATH_DIRECTIONS = [
    ["if path ahead", "isPathForward"],
    ["if path to the left", "isPathLeft"],
    ["if path to the right", "isPathRight"],
  ];

  // Add arrows to turn options after prefix/suffix have been separated.
  Blockly.Extensions.register("maze_turn_arrows", function () {
    const options = this.getField("DIR").getOptions();
    options[options.length - 2][0] += LEFT_TURN;
    options[options.length - 1][0] += RIGHT_TURN;
  });

  Blockly.defineBlocksWithJsonArray([
    // Block for moving forward.
    {
      type: "maze_moveForward",
      message0: "move forward",
      previousStatement: null,
      nextStatement: null,
      colour: MOVEMENT_HUE,
      tooltip: "Moves the player forward one space.",
    },

    // Block for turning left or right.
    {
      type: "maze_turn",
      message0: "%1",
      args0: [
        {
          type: "field_dropdown",
          name: "DIR",
          options: TURN_DIRECTIONS,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: MOVEMENT_HUE,
      tooltip: "Turns the player left or right by 90 degrees.",
      extensions: ["maze_turn_arrows"],
    },

    // Block for conditional "if there is a path".
    {
      type: "maze_if",
      message0: `%1%2${"do"}%3`,
      args0: [
        {
          type: "field_dropdown",
          name: "DIR",
          options: PATH_DIRECTIONS,
        },
        {
          type: "input_dummy",
        },
        {
          type: "input_statement",
          name: "DO",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: LOGIC_HUE,
      tooltip:
        "If there is a path in the specified direction, then do some actions.",
      extensions: ["maze_turn_arrows"],
    },

    // Block for conditional "if there is a path, else".
    {
      type: "maze_ifElse",
      message0: `%1%2${"do"}%3${"else"}%4`,
      args0: [
        {
          type: "field_dropdown",
          name: "DIR",
          options: PATH_DIRECTIONS,
        },
        {
          type: "input_dummy",
        },
        {
          type: "input_statement",
          name: "DO",
        },
        {
          type: "input_statement",
          name: "ELSE",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: LOGIC_HUE,
      tooltip:
        "If there is a path in the specified direction, then do the first block of actions. Otherwise, do the second block of actions.",
      extensions: ["maze_turn_arrows"],
    },

    // Block for repeat loop.
    {
      type: "maze_forever",
      message0: `${"repeat until"}%1%2${"do"}%3`,
      args0: [
        {
          type: "field_image",
          src: "assets/images/marker.png",
          width: 12,
          height: 16,
        },
        {
          type: "input_dummy",
        },
        {
          type: "input_statement",
          name: "DO",
        },
      ],
      previousStatement: null,
      colour: LOOPS_HUE,
      tooltip: "Repeat the enclosed actions until finish point is reached.",
    },
  ]);

  registerCustomBlockActions();
};

function registerCustomBlockActions() {
  javascriptGenerator["maze_moveForward"] = function (block) {
    // Generate JavaScript for moving forward.
    return `moveForward('block_id_${block.id}');\n`;
  };

  javascriptGenerator["maze_turn"] = function (block) {
    // Generate JavaScript for turning left or right.
    return `${block.getFieldValue("DIR")}('block_id_${block.id}');\n`;
  };

  javascriptGenerator["maze_if"] = function (block) {
    // Generate JavaScript for conditional "if there is a path".
    const argument = `${block.getFieldValue("DIR")}('block_id_${block.id}')`;
    const branch = javascriptGenerator.statementToCode(block, "DO");
    return `if (${argument}) {\n${branch}}\n`;
  };

  javascriptGenerator["maze_ifElse"] = function (block) {
    // Generate JavaScript for conditional "if there is a path, else".
    const argument = `${block.getFieldValue("DIR")}('block_id_${block.id}')`;
    const branch0 = javascriptGenerator.statementToCode(block, "DO");
    const branch1 = javascriptGenerator.statementToCode(block, "ELSE");
    return `if (${argument}) {\n${branch0}} else {\n${branch1}}\n`;
  };

  javascriptGenerator["maze_forever"] = function (block) {
    // Generate JavaScript for repeat loop.
    let branch = javascriptGenerator.statementToCode(block, "DO");
    if (javascriptGenerator.INFINITE_LOOP_TRAP) {
      branch =
        javascriptGenerator.INFINITE_LOOP_TRAP.replace(
          /%1/g,
          `'block_id_${block.id}'`
        ) + branch;
    }
    return `while (notDone()) {\n${branch}}\n`;
  };
}

export default MazeBlocks;
