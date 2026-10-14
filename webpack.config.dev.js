const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    liveReload: true,
    hot: true,
    open: true,
    static: ['./'],
  },
  resolve: {
    fallback: {
      "path": require.resolve("path-browserify"),
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "zlib": require.resolve("browserify-zlib"),
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "os": require.resolve("os-browserify"),
      "assert": require.resolve("assert/"),
      "url": require.resolve("url/"),
      "buffer": require.resolve("buffer/"),
      "querystring": require.resolve("querystring-es3"),
      "fs": false, // Trình duyệt không thể truy cập ổ cứng trực tiếp
      "net": false,
      "async_hooks": false
    }
  }
});