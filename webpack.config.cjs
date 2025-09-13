const path = require("path");

module.exports = {
  mode: process.env.NODE_ENV || "development",
  devtool: 'cheap-module-source-map',
  entry: path.resolve(__dirname, "src", "app.js"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "app.js",
  },
};
