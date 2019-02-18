import expose from './expose';
import express from 'express';
import path from 'path';
const {__dirname, require} = expose;

const PORT = 3000;
const PUBLIC_PATH = __dirname + '/../client';
const app = express();

const isDev = process.env.NODE_ENV === 'development';

app.use(express.static(PUBLIC_PATH));

app.all('*', function (req, res) {
  res.sendFile(path.resolve(PUBLIC_PATH, 'index.html'));
});

app.listen(PORT, function () {
  console.log('Listening on port ' + PORT + '...');
});