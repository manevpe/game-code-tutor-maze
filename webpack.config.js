const path = require("path");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  target: "web",
  mode: "development",
  entry: {
    index: "./app/src/index.js",
  },
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "[name].js",
  },
  plugins: [
    new webpack.optimize.ModuleConcatenationPlugin(),
    new CopyPlugin([
      {
        from: path.resolve(__dirname, "app"),
        to: path.resolve(__dirname, "build"),
      },
    ]),
    // Copy over media resources from the Blockly package
    new CopyPlugin([
      {
        from: path.resolve(__dirname, "./node_modules/blockly/media"),
        to: path.resolve(__dirname, "build/third-party/blockly/media"),
      },
    ]),
  ],
  devServer: {
    port: 3000,
  },
};
