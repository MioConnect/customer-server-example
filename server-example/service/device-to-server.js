'use strict';
const express = require('express');
const router = express.Router();
const log4js = require("log4js");
const logger = log4js.getLogger();
const Sequelize = require('sequelize');
const { dbInstance } = require('../models/index.js');
const { Device } = dbInstance.models;
const { validateAPIKeyOrCert, validateClientCertAndDeviceId } = require('./auth.js');

const telemetryData = async (req, res, next) => {
    const { body } = req;
    logger.debug(`Device telemetry data: ${JSON.stringify(body)}`);
    const result = {
        success: true
    }
    res.json(result);
}

/****************************
 * Device to Server APIs *
 ****************************/
router.post('/devicetelemetry/:deviceId', validateClientCertAndDeviceId, telemetryData);
router.post('/devicetelemetry', validateClientCertAndDeviceId, telemetryData);

module.exports = router;