'use strict';

const https = require('https');
const express = require('express');
const fs = require('fs');
const morgan = require('morgan');
const path = require('path');
const app = express();
const service_handler = require('./service/app.js');
const crypto = require('crypto');

const PORT = process.env.PORT;
const cert = fs.readFileSync('./localhost-ssl-certs/fullchain.cer');
const key = fs.readFileSync('./localhost-ssl-certs/local.customer-server-sample.com.key');

// create a write stream (in append mode)
var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })

app.use(morgan('combined', { stream: accessLogStream }));
app.use('/', service_handler);

let options = {
    key: key,
    cert: cert,
    requestCert: true, // request client certificate
    rejectUnauthorized: false,  // Set to false because device certificate may be issued by AWS IoT core.
    secureOptions: crypto.constants.SSL_OP_NO_TLSv1_3
};

const server = https.createServer(options, app);
const port = 3030;
server.listen(port);
console.log(`Listening: https://localhost:${port}`);
