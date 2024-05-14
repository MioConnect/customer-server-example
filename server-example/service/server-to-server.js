'use strict';
const express = require('express');
const router = express.Router();
const log4js = require("log4js");
const logger = log4js.getLogger();
const AJV = require('ajv');
const ajv = new AJV();
const Sequelize = require('sequelize');
const { dbInstance } = require('../models/index.js');
const { Device } = dbInstance.models;
const generateCustomKeysAndCertificate = require('./custom_certificate.service.js');
const { validateAPIKeyOrCert, validateClientCertAndDeviceId } = require('./auth.js');
const { APIError } = require('./api-error.js');

const forwardTelemetryReqSchema = require('./openapi-schema/forward-telemetry-req.json');
const forwardStatusReqSchema = require('./openapi-schema/forward-status-req.json');
const requestDeviceCertReqSchema = require('./openapi-schema/request-device-cert-req.json');
const requestDeviceCertRespSchema = require('./openapi-schema/request-device-cert-resp.json');
const syncDeviceCertReqSchema = require('./openapi-schema/sync-device-cert-req.json');


const signCertificate = async (req, res) => {
    const { body } = req;
    const { deviceId, modelNumber } = body;
    const valid = ajv.validate(requestDeviceCertReqSchema, body);
    if (!valid) {
        throw new APIError(400, ajv.errorsText());
    }
    
    logger.debug(`Signing certificate for MioConnect device ${deviceId} (${modelNumber})`);

    const cert = generateCustomKeysAndCertificate(deviceId);
    const respValid = ajv.validate(requestDeviceCertRespSchema, cert);
    if (!respValid) {
        throw new APIError(500, ajv.errorsText());
    }
    await Device.upsert({
        id: deviceId,
        modelNumber,
        certificateFingerprint: cert.certificateId,
    });
    logger.debug(`Saved signed cert ${cert.certificateId}: ${deviceId} to device whitelist`);
    res.json(cert);
}

const syncCertificate = async (req, res) => {
    const { body } = req;
    const valid = ajv.validate(syncDeviceCertReqSchema, body);
    if (!valid) {
        throw new APIError(400, ajv.errorsText());
    }
    const { deviceId, modelNumber, certificateId, certificatePem } = body;
    logger.debug(`Synchronizing certificate from MioConnect ${deviceId} (${modelNumber})`);
    await Device.upsert({
        id: deviceId,
        modelNumber,
        certificateFingerprint: certificateId,
    });
    logger.debug(`Saved sync cert ${certificateId}: ${deviceId} to validCertificates`);
    
    const result = {
        success: true
    }
    res.json(result);
}

const telemetryData = async (req, res, next) => {
    const { body } = req;
    const valid = ajv.validate(forwardTelemetryReqSchema, body);
    if (!valid) {
        throw new APIError(400, ajv.errorsText());
    }
    // fully managed forwarding, device whitelist checking is skipped in this example
    logger.debug(`Forwarded telemetry data: ${JSON.stringify(body)})`);
    const result = {
        success: true
    }
    res.json(result);
}

const statusData = async (req, res, next) => {
    const { body } = req;
    const valid = ajv.validate(forwardStatusReqSchema, body);
    if (!valid) {
        throw new APIError(400, ajv.errorsText());
    }
    logger.debug(`Forwarded status data: ${JSON.stringify(body)})`);
    const result = {
        success: true
    }
    res.json(result);
}

/****************************
 * Server to Server APIs *
 ****************************/
// use /devicecert if you want to use your own CA to sign the device certificate
router.post('/devicecert', validateAPIKeyOrCert, signCertificate);
// use /syncdevicecert if you want to use AWS IoT Core to sign the device certificate
router.post('/syncdevicecert', validateAPIKeyOrCert, syncCertificate);

router.post('/forwardstatus', validateAPIKeyOrCert, statusData);
router.post('/forwardtelemetry', validateAPIKeyOrCert, telemetryData);

module.exports = router;