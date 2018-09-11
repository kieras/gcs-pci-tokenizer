'use strict';
const app = require('/src/gcs-cf-tokenizer/index.js');
const Express = require('express');
const bodyParser = require('body-parser');
const express = Express();
const port = 80

express.use(bodyParser.json());

express.get('/', (req, res) => {
  app.tokenize(req, res);
  res.send('Hello from Express!');
});

express.post('/detokenize', (req, res) => {
  return console.log('DETOKEN from Express!');
  app.detokenize(req, res);
});

express.post('/tokenize', (req, res) => {
  console.log('TOKEN from Express!');
  return app.tokenize(req, res);
});

express.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err);
  }

  console.log(`server is listening on ${port}`);
});
