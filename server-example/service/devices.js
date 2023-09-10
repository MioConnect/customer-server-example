'use strict';
const express = require('express');
const router = express.Router();
const log4js = require("log4js");
const logger = log4js.getLogger();
const AJV = require('ajv');
const ajv = new AJV();
const Sequelize = require('sequelize');
const { dbInstance } = require('../models/index.js');
const { Device, User } = dbInstance.models;
const { authUserToken, createToken } = require('./auth.js');
const { APIError } = require('./api-error.js');
const assignDeviceReqSchema = require('./openapi-schema/assign-device-req.json');

async function listDevices(req, res, next) {
    const { limit = 10, offset = 0, userId } = req.query;
    const tokenData = req.tokenData;
    const where = {
        status: true
    };

    if (userId) {
        where.userId = userId;
    }

    if (tokenData.role !== 'admin') {
        where.userId = tokenData.userId;
    }

    const deviceResult = await Device.findAndCountAll({
        limit,
        offset,
        where: where,
    });
    res.json(deviceResult);
}

async function assignDevice(req, res, next) {
    const tokenData = req.tokenData;
    const body = req.body;
    const valid = ajv.validate(assignDeviceReqSchema, body);
    if (!valid) {
        throw new APIError(400, ajv.errorsText());
    }

    const { deviceId, username } = body;
    const device = await Device.findOne({
        where: {
            id: deviceId,
        },
    });
    if (!device) {
        throw new APIError(400, 'Device not found');
    }
    const user = await User.findOne({
        where: {
            username,
        },
    });
    if (!user) {
        throw new APIError(400, 'User not found');
    }

    device.userId = tokenData.userId;
    await device.save();
    res.json({
        success: true,
    });
}
router.post('/assigndevice', authUserToken, assignDevice);
router.get('/devices', authUserToken, listDevices);

module.exports = router;