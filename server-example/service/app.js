'use strict';
const express = require('express');
require('express-async-errors');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const router = express.Router();
const fs = require('fs');
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

const serverToServerAPIRouter = require('./server-to-server.js');
const deviceToServerAPIRouter = require('./device-to-server.js');
const TBG2280MessagesAPIRouter = require('./TBG-2280-messages.js');
const { APIError } = require('./api-error.js');

const API_KEY_NAME = process.env.API_KEY_NAME;
const API_KEY_VALUE = process.env.API_KEY_VALUE;
// TLS_PASSTHROUGH:
// if true, the load balancer (NGINX, AWS ALB) will pass TCP traffic to the instance without decrypting it.
// if false, the load balancer decrypts the traffic and forwards it to the instance as HTTP.
const TLS_PASSTHROUGH = process.env.TLS_PASSTHROUGH === 'true';

logger.debug('API_KEY_NAME', API_KEY_NAME);
logger.debug('API_KEY_VALUE', API_KEY_VALUE);
logger.debug('TLS_PASSTHROUGH', TLS_PASSTHROUGH);

// declare a new express app
app.use(cors());
app.use((req, res, next) => {
    bodyParser.json()(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                code: 400,
                error: 'BadRequest',
                message: err.message,
            });
        }
        next();
    });
});
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/', serverToServerAPIRouter);
app.use('/', deviceToServerAPIRouter);
app.use('/', TBG2280MessagesAPIRouter);
app.use((error, req, res, next) => {
    logger.error(`API ERROR: ${req.originalUrl} ${error.message}`);
    if (error instanceof APIError) {
        return res.status(error.code).json({ message: error.message });
    }
    if (error.code) {
        return res.status(error.code).json(error);
    }
    
    logger.error(error);
    return res.status(500)
        .json({ message: 'Internal error' });
});

module.exports = app;
