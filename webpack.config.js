const path = require('path')

module.exports = {
  entry: {
    // "hello": "./front/hello-main.js",
    dash: './front/dash-99-main.js',
    login: './front/login-main.js',
    logout: './front/logout-main.js',
    setup: './front/setup-main.js',
    join: './front/join-main.js'
  },
  output: {
    filename: '[name]-bundle.js',
    path: path.resolve(__dirname, 'front/dist')
  },
  /* "devtool": (
        // dev:
        "eval-source-map"//, NO COMMA
        // prod:
        "source-map"//, NO COMMA
    ), */
  optimization: { minimize: false }
}
