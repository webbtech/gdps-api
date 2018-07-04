const path = require('path');
// eslint-disable-next-line import/no-extraneous-dependencies
const nodeExternals = require('webpack-node-externals');
// eslint-disable-next-line import/no-extraneous-dependencies
// const debug = process.env.NODE_ENV !== 'production'
const WebpackShellPlugin = require('webpack-shell-plugin');

var plugins = [];
 
/*plugins.push(new WebpackShellPlugin({
  onBuildStart: ['echo "Starting"'],
  onBuildEnd: ['python script.py && node script.js']
}));*/

if (process.env.NODE_ENV !== 'production') {
  plugins.push(new WebpackShellPlugin({
    onBuildStart: ['echo "Starting"'],
    onBuildEnd: ['nodemon build/server.js --watch build']
  }));
}

module.exports = {
  entry: ['./src/server.js'],
  // entry: ['./server.js'],
  target: 'node',
  externals: [nodeExternals()],
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          'imports-loader?graphql',
          {
            loader: 'babel-loader',
            options: {
              presets: [['env', { targets: { node: '8.10' } }]],
            },
          },
        ],
      },
    ],
  },
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, './build'),
    // path: path.join(__dirname, './'),
    // path: path.join(__dirname, './src'),
    // filename: 'server.js',
    filename: 'graphql.js',
  },
  plugins,
};
