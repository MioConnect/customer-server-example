'use strict';

const https = require('https');
const express = require('express');
const fs = require('fs');
const morgan = require('morgan');
const path = require('path');
const app = express();
const log4js = require("log4js");
log4js.configure({
    appenders: {
        app: {
            type: "file",
            filename: "app.log",
            maxLogSize: 10485760, numBackups: 3,
            layout: {
                type: 'pattern',
                pattern: '[%d{ISO8601_WITH_TZ_OFFSET}][%-5p] %m',
            }
        },
        console: {
            type: "console",
            layout: {
                type: 'pattern',
                pattern: '[%d{ISO8601_WITH_TZ_OFFSET}][%-5p] %m',
            }
        },
    },
    categories: { default: { appenders: ["app", "console"], level: "DEBUG" } },
});
const logger = log4js.getLogger();

const service_handler = require('./service/app.js');
const crypto = require('crypto');
const { initDB } = require('./models/index.js');

const PORT = process.env.PORT || 3030;
const API_KEY_NAME = process.env.API_KEY_NAME;
const API_KEY_VALUE = process.env.API_KEY_VALUE;
// TLS_PASSTHROUGH:
// if true, the load balancer (NGINX, AWS ALB) will pass TCP traffic to the instance without decrypting it.
// if false, the load balancer decrypts the traffic and forwards it to the instance as HTTP.
const TLS_PASSTHROUGH = process.env.TLS_PASSTHROUGH === 'true';

logger.debug('API_KEY_NAME', API_KEY_NAME);
logger.debug('API_KEY_VALUE', API_KEY_VALUE);
logger.debug('TLS_PASSTHROUGH', TLS_PASSTHROUGH);

// create a write stream (in append mode)
var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })

app.use(morgan('combined', { stream: accessLogStream }));
app.use('/', service_handler);

if (TLS_PASSTHROUGH) {
    const cert = fs.readFileSync('./localhost-ssl-certs/fullchain.cer');
    const key = fs.readFileSync('./localhost-ssl-certs/local.customer-server-sample.com.key');
    const options = {
        key: key,
        cert: cert,
        requestCert: true, // request client certificate
        rejectUnauthorized: false,  // Set to false because device certificate may be issued by AWS IoT core.
        secureOptions: crypto.constants.SSL_OP_NO_TLSv1_3
    };
    const server = https.createServer(options, app);
    server.listen(PORT);
    logger.info(`Listening: https://localhost:${PORT}`);
} else {
    app.listen(PORT);
    logger.info(`Listening: http://localhost:${PORT}`);
}
initDB();