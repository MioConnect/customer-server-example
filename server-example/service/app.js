'use strict';
const express = require('express');
require('express-async-errors');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const router = express.Router();
const fs = require('fs');
const log4js = require("log4js");
const logger = log4js.getLogger();

const serverToServerAPIRouter = require('./server-to-server.js');
const deviceToServerAPIRouter = require('./device-to-server.js');
const TBG2280MessagesAPIRouter = require('./TBG-2280-messages.js');
const { APIError } = require('./api-error.js');

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
