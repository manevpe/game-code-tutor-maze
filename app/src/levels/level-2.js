const Level2 = {};

Level2.toolbox = {
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

Level2.map = [
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 0, 0, 0, 0, 1, 0],
  [0, 1, 1, 1, 1, 0, 1, 0],
  [0, 0, 0, 0, 1, 0, 1, 0],
  [0, 3, 1, 1, 1, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 1, 0],
  [0, 2, 1, 1, 1, 1, 1, 0],
];

Level2.MAX_BLOCKS = 6;

export default Level2;
