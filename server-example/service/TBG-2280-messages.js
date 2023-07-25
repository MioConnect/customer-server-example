'use strict';
const express = require('express');
const router = express.Router();
const log4js = require("log4js");
const moment = require('moment');
const logger = log4js.getLogger();
const AJV = require('ajv');
const ajv = new AJV();
const Sequelize = require('sequelize');
const { dbInstance, MessageStatus } = require('../models/index.js');
const { Device, Message } = dbInstance.models;
const { validateAPIKeyOrCert, validateClientCertAndDeviceId } = require('./auth.js');
const { APIError } = require('./api-error.js');

const getDeviceMessageRespSchema = require('./openapi-schema/get-device-message-resp.json');
const updateDeviceMessageReqSchema = require('./openapi-schema/update-device-message-req.json');

async function createDeviceMessage(req, res, next) {
    const { deviceId, from, subject, content } = req.body;

    const device = await Device.findOne({ where: { id: deviceId } });
    if (!device) {
        throw new APIError(400, 'Device not found');
    }

    const message = await Message.create({
        deviceId,
        from,
        subject,
        content,
    });

    res.json(message);
}

async function listDeviceMessage(req, res, next) {
    const { deviceId } = req.query;
    const device = await Device.findOne({
        where: { id: deviceId },
    });
    if (!device) {
        throw new APIError(400, 'Device not found');
    }

    const messages = await Message.findAll({
        where: {
            deviceId,
            status: {
                [Sequelize.Op.ne]: MessageStatus.deleted,
            },
        },
        order: [['createdAt', 'DESC']],
    });

    res.json(messages);
}

async function updateDeviceMessage(req, res, next) {
    const { body } = req;
    const { deviceId, messageId, status } = body;
    const valid = ajv.validate(updateDeviceMessageReqSchema, body);
    if (!valid) {
        throw new APIError(400, ajv.errorsText());
    }

    const device = await Device.findOne({ where: { id: deviceId } });
    if (!device) {
        throw new APIError(400, 'Device not found');
    }

    const message = await Message.findOne({ where: { id: messageId } });
    if (!message) {
        throw new APIError(400, 'Message not found');
    }

    const statusCode = MessageStatus[status.toLowerCase()];
    if (!statusCode) {
        throw new APIError(400, 'Invalid status');
    }

    message.status = statusCode;
    await message.save();

    res.json({
        success: true,
    });
}

async function getDeviceMessage(req, res, next) {
    const { deviceId } = req.query;
    const device = await Device.findOne({ where: { id: deviceId } });
    if (!device) {
        throw new APIError(400, 'Device not found');
    }

    const messages = await Message.findOne({
        where: {
            deviceId,
            status: MessageStatus.active,
        },
        order: [['createdAt', 'DESC']],
    });

    if (!messages) {
        throw new APIError(404, 'Message not found');
    }

    const _message = {
        id: messages.id,
        deviceId: messages.deviceId,
        from: messages.from,
        subject: messages.subject,
        content: messages.content,
        downloadedAt: messages.downloadedAt ? moment(messages.downloadedAt).unix() : null,
        readAt: messages.readAt ? moment(messages.readAt).unix() : null,
    }

    const valid = ajv.validate(getDeviceMessageRespSchema, _message);
    if (!valid) {
        throw new APIError(500, ajv.errorsText());
    }
    res.json(_message);
}

/****************************
 * TBG-2280-A *
 ****************************/
// /messages APIs are for RPM service provider
// you could change the implementation according to your needs.
router.post('/messages', validateAPIKeyOrCert, createDeviceMessage);
router.get('/messages', validateAPIKeyOrCert, listDeviceMessage);
// // APIs for device integration
router.post('/devicemessages', validateClientCertAndDeviceId, updateDeviceMessage);
router.get('/devicemessages', validateClientCertAndDeviceId, getDeviceMessage);

module.exports = router;