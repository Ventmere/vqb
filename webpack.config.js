module.exports = {
  devtool: 'source-map',
  output: {
      libraryTarget: "umd"
  },
  module: {
    loaders: [
      { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader"}
    ]
  }
};