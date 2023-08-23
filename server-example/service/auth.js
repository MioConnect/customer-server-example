const fs = require('fs');
const crypto = require('crypto');
const Sequelize = require('sequelize');
const { dbInstance } = require('../models/index.js');
const { Device, Message } = dbInstance.models;
const { APIError } = require('./api-error.js');

const API_KEY_NAME = process.env.API_KEY_NAME;
const API_KEY_VALUE = process.env.API_KEY_VALUE;
// TLS_PASSTHROUGH:
// if true, the load balancer (NGINX, AWS ALB) will pass TCP traffic to the instance without decrypting it.
// if false, the load balancer decrypts the traffic and forwards it to the instance as HTTP.
const TLS_PASSTHROUGH = process.env.TLS_PASSTHROUGH === 'true';

const validateAPIKey = async (req, res, next) => {
    if (!req.headers[API_KEY_NAME] || req.headers[API_KEY_NAME] !== API_KEY_VALUE) {
        throw new APIError(401, 'Invalid API key');
    }
    next();
}

const validateAPIKeyOrCert = async (req, res, next) => {
    const apiKeyName = req.headers[API_KEY_NAME];
    if (apiKeyName) {
        return validateAPIKey(req, res, next);
    } else {
        return validateClientCertAndDeviceId(req, res, next);
    }
};

const validateClientCertAndDeviceId = async (req, res, next) => {
    // uid is for backward compatibility
    const deviceId  = req.params?.deviceId || req.body?.deviceId || req.body?.uid || req.query?.deviceId;
    if (!deviceId) {
        throw new APIError(401, 'Device ID is required in path or body or query string');
    }

    let cert;
    let certFingerprint;
    if (TLS_PASSTHROUGH) {
        // get the client certificate from the TLS connection
        // https://nodejs.org/api/tls.html#tls_tlssocket_getpeercertificate_detailed
        cert = req.connection.getPeerCertificate();
        certFingerprint = cert.fingerprint256;
    } else {
        // get the client certificate from the nginx proxy
        const nginxClientCert = req.headers['x-ssl-client-cert'];
        cert = decodeURIComponent(nginxClientCert);
        let baseString = cert.match(/-----BEGIN CERTIFICATE-----\s*([\s\S]+?)\s*-----END CERTIFICATE-----/i);
        if (baseString) {
            const rawCert = Buffer.from(baseString[1], 'base64');
            certFingerprint = crypto.createHash('sha256').update(rawCert).digest('hex');
        }
    }

    if (!cert || !certFingerprint) {
        throw new APIError(401, 'Certificate is required');
    }
    const certificateFingerprint = certFingerprint.replace(/\:/g,'').toLowerCase();

    const device = await Device.findOne({ where: { id: deviceId, status: true } });
    if (!device) {
        throw new APIError(401, `Device ${deviceId} not in whitelist`);
    }

    if (device.certificateFingerprint !== certificateFingerprint) {
        throw new APIError(401, `Device ${deviceId} certificate fingerprint mismatch.`);
    }
    next();
}

module.exports = {
    validateAPIKeyOrCert,
    validateClientCertAndDeviceId,
    validateAPIKey,
}