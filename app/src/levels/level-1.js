const Level1 = {};

Level1.toolbox = {
  kind: "flyoutToolbox",
  contents: [
    {
      kind: "block",
      type: "maze_moveForward",
    },

    {
      kind: "block",
      type: "maze_turn",
    },

    {
      kind: "block",
      type: "maze_forever",
    },

    {
      kind: "block",
      type: "maze_if",
    },

    {
      kind: "block",
      type: "maze_ifElse",
    },
  ],
};

Level1.map = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 2, 1, 1, 0],
  [0, 1, 0, 0, 0, 0, 1, 0],
  [0, 3, 0, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

Level1.MAX_BLOCKS = 4;

export default Level1;
