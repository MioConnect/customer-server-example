'use strict';

const https = require('https');
const express = require('express');
const fs = require('fs');
const morgan = require('morgan');
const path = require('path');
const app = express();
const service_handler = require('./service/app.js');
const crypto = require('crypto');
const { init } = require('./models/index.js');

const PORT = process.env.PORT;

// create a write stream (in append mode)
var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })

app.use(morgan('combined', { stream: accessLogStream }));
app.use('/', service_handler);

const port = PORT || 3030;
app.listen(port);
console.log(`Listening: http://localhost:${port}`);
init();