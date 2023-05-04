'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const router = express.Router();
const generateCustomKeysAndCertificate = require('./custom_certificate.js');
const fs = require('fs');
const crypto = require('crypto');

const API_KEY_NAME = process.env.API_KEY_NAME;
const API_KEY_VALUE = process.env.API_KEY_VALUE;
// TLS_PASSTHROUGH:
// if true, the load balancer (NGINX, AWS ALB) will pass TCP traffic to the instance without decrypting it.
// if false, the load balancer decrypts the traffic and forwards it to the instance as HTTP.
const TLS_PASSTHROUGH = process.env.TLS_PASSTHROUGH === 'true';

console.log('API_KEY_NAME', API_KEY_NAME);
console.log('API_KEY_VALUE', API_KEY_VALUE);
console.log('TLS_PASSTHROUGH', TLS_PASSTHROUGH);

let validCertificates = JSON.parse(fs.readFileSync('./validCertificates.json'));

// declare a new express app
router.use(cors());
router.use((req, res, next) => {
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
router.use(bodyParser.urlencoded({ extended: true }));

const _signCertificate = async (body) => {
    const { deviceId, modelNumber } = body;
    if (!deviceId || !modelNumber) {
        return Promise.reject({
            code: 400,
            error: "Invalid parameter",
            message: `Body parameters are invalid. Please check the API specification.`,
        });
    }
    
    console.log(`Signing certificate for LSR device ${deviceId} (${modelNumber})`);

    const cert = generateCustomKeysAndCertificate(deviceId);
    
    validCertificates[cert.certificateId] = deviceId;
    fs.writeFileSync('./validCertificates.json', JSON.stringify(validCertificates, null, 2));
    console.log(`Saved signed cert ${cert.certificateId}: ${deviceId} to validCertificates`);
    return cert;
}

const signCertificate = async (req, res) => {
    const { body } = req;

    try {
        const result = await _signCertificate(body)
        res.json(result);
    } catch (err) {
        console.log(err);

        let status = 400;
        return res.status(status).json(err);
    }
}

const _syncCertificate = async (body) => {
    const { deviceId, modelNumber, certificateId, certificatePem } = body;
    if (!deviceId || !modelNumber || !certificateId || !certificatePem) {
        return Promise.reject({
            code: 400,
            error: "Invalid parameter",
            message: `Body parameters are invalid. Please check the API specification.`,
        });
    }
    validCertificates[certificateId] = deviceId;
    console.log(`Saved sync cert ${certificateId}: ${deviceId} to validCertificates`);
    fs.writeFileSync('./validCertificates.json', JSON.stringify(validCertificates, null, 2));
    console.log(`Synchronizing certificate from LSR ${deviceId} (${modelNumber})`);
    
    const result = {
        success: true
    }
    return result;
}

const syncCertificate = async (req, res) => {
    const { body } = req;

    try {
        const result = await _syncCertificate(body);
        res.json(result);
    } catch (err) {
        console.log(err)

        let status = err.code;
        return res.status(status).json(err);
    }
}

const validateAPIKey = async (req, res, next) => {
    try {
        if (!req.headers[API_KEY_NAME] || req.headers[API_KEY_NAME] !== API_KEY_VALUE) {
            return res.status(401).json({
                code: 401,
                error: 'Unauthorized',
                message: 'Invalid API key',
            });
        }
        next();
    } catch (err) {
        return res
            .status(401)
            .json({ error: 'AccessDeniedException', message: err.message });
    }
}

const validateClientCertAndDeviceId = async (req, res, next) => {
    let cert;
    let certFingerprint;
    if (TLS_PASSTHROUGH) {
        cert = req.connection.getPeerCertificate();
        certFingerprint = cert.fingerprint256;
    } else {
        const nginxClientCert = req.headers['x-ssl-client-cert'];
        cert = decodeURIComponent(nginxClientCert);
        let baseString = cert.match(/-----BEGIN CERTIFICATE-----\s*([\s\S]+?)\s*-----END CERTIFICATE-----/i);
        let rawCert = Buffer.from(baseString[1], 'base64');
        certFingerprint = crypto.createHash('sha256').update(rawCert).digest('hex');
    }

    if (!cert || !certFingerprint) {
        return res
        .status(401)
        .json({ success: false, message: 'Certificate is required.' });
    }
    const certificateId = certFingerprint.replace(/\:/g,'').toLowerCase();

    if (!validCertificates[certificateId]) {
        return res
        .status(401)
        .json({ success: false, message: 'Certificate not in valid cert list.' });
    }

    const { deviceId } = req.params || req.body.uid;
    if (deviceId && validCertificates[certificateId] !== deviceId) {
        return res
        .status(401)
        .json({ success: false, message: 'Certificate and deviceId mismatch.' });
    }

    if (validCertificates[certificateId]) {
        console.log(`Client certificate: ${certificateId} : ${validCertificates[certificateId]} authorized.`);
        next();
    }
}

const telemetryData = async (req, res, next) => {
    const { body } = req;
    
    try {
        console.log(`Telemetry data: ${JSON.stringify(body)})`);
        const result = {
            success: true
        }
        res.json(result);
    } catch (err) {
        console.log(err)

        let status = err.code;
        return res.status(status).json(err);
    }
}

const statusData = async (req, res, next) => {
    const { body } = req;
    
    try {
        console.log(`Status data: ${JSON.stringify(body)})`);
        const result = {
            success: true
        }
        res.json(result);
    } catch (err) {
        console.log(err)
        let status = err.code;
        return res.status(status).json(err);
    }
}

/****************************
 * Server to Server APIs *
 ****************************/
// use /devicecert if you want to use your own CA to sign the device certificate
router.post('/devicecert', validateAPIKey, signCertificate);
// use /syncdevicecert if you want to use AWS IoT Core to sign the device certificate
router.post('/syncdevicecert', validateAPIKey, syncCertificate);
router.post('/forwardstatus', validateAPIKey, statusData);

/****************************
 * Device to Server APIs *
 ****************************/
router.post('/devicetelemetry/:deviceId', validateClientCertAndDeviceId, telemetryData);
router.post('/devicetelemetry', validateClientCertAndDeviceId, telemetryData);

app.use('/', router);

module.exports = app;
