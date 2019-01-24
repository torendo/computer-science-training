import expose from './expose';
import express from 'express';
import path from 'path';
const {__dirname, require} = expose;

const PORT = 3000;
const PUBLIC_PATH = __dirname + '/public';
const app = express();

const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
  const webpack = require('webpack');
  const webpackConfig = require(path.resolve(__dirname, '../webpack.config.js'));
  const compiler = webpack(webpackConfig);
  app.use(require('webpack-dev-middleware')(compiler, {
    hot: true,
    stats: {
      colors: true
    }
  }));
  app.use(require('webpack-hot-middleware')(compiler));
} else {
  app.use(express.static(PUBLIC_PATH));
}

app.all('*', function (req, res) {
  res.sendFile(path.resolve(PUBLIC_PATH, 'index.html'));
});

app.listen(PORT, function () {
  console.log('Listening on port ' + PORT + '...');
});