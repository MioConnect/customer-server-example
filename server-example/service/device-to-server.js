'use strict';
const express = require('express');
const router = express.Router();
const log4js = require("log4js");
const logger = log4js.getLogger();
const Sequelize = require('sequelize');
const { dbInstance } = require('../models/index.js');
const { Device, Telemetry } = dbInstance.models;
const { validateAPIKeyOrCert, authUserToken, validateClientCertAndDeviceId } = require('./auth.js');
const { APIError } = require('./api-error.js');
const moment = require('moment');

const TELEMETRY_TYPES = ['bgm_gen2_measure', 'bgm_gen2_order']
// 'bgm_gen2_status', 'bgm_gen2_error', 'bgm_gen2_log'

const telemetryData = async (req, res, next) => {
    const { body } = req;
    const deviceId = req.params.deviceId || body.deviceId || body.sn;
    logger.debug(`Device telemetry data: ${JSON.stringify(body)}`);

    const device = await Device.findOne({ where: { id: deviceId } });
    if (!device) {
        throw new APIError(400, 'Device not found');
    }
    
    const dataType = body.data_type;
    if (!TELEMETRY_TYPES.includes(dataType)) {
        throw new APIError(400, 'Invalid data type');
    }
    
    const timestamp = body.ts;
    const tsMoment = moment.utc(timestamp).format('YYYY-MM-DDTHH:mm:ss[Z]');

    const telemetry = await Telemetry.create({
        deviceId,
        type: dataType,
        data: body,
    });

    let responseData = {
        id: telemetry.id,
    };

    if (dataType === 'bgm_gen2_measure') {
        // generate mock response for BGM Gen2
        responseData.messages = {
            'title': 'test nudge',
            'content': `test nudge for measurement at ${tsMoment}`,
            'options': ['yes', 'no']
        };
    }

    const result = {
        success: true,
        data: responseData,
    }
    res.json(result);
}

async function listDeviceTelemetry(req, res, next) {
    const { current, pageSize, deviceId, type } = req.query;
    if (!deviceId) {
        throw new APIError(400, 'Missing deviceId in query string');
    }
    if (!type) {
        throw new APIError(400, 'Missing type in query string');
    }
    const device = await Device.findOne({
        where: { id: deviceId },
    });
    if (!device) {
        throw new APIError(400, 'Device not found');
    }

    const limit = pageSize ? parseInt(pageSize) : 10;
    const offset = current ? parseInt(current - 1) * limit : 0;

    const telemetry = await Telemetry.findAndCountAll({
        limit,
        offset,
        where: {
            deviceId,
            type,
            status: {
                [Sequelize.Op.ne]: 0,
            },
        },
        order: [['createdAt', 'DESC']],
    });

    res.json(telemetry);
}

/****************************
 * Device to Server APIs *
 ****************************/
router.post('/devicetelemetry/:deviceId', validateClientCertAndDeviceId, telemetryData);
router.post('/devicetelemetry', validateClientCertAndDeviceId, telemetryData);

// APIs for web app
router.get('/devicetelemetry', authUserToken, listDeviceTelemetry);

module.exports = router;