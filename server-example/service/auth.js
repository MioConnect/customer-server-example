const fs = require('fs');
const crypto = require('crypto');
const Sequelize = require('sequelize');
const uuid = require('uuid');
const jwt = require('jsonwebtoken');

const { dbInstance } = require('../models/index.js');
const { Device, Message } = dbInstance.models;
const { APIError } = require('./api-error.js');

const API_KEY_NAME = process.env.API_KEY_NAME;
const API_KEY_VALUE = process.env.API_KEY_VALUE;
// TLS_PASSTHROUGH:
// if true, the load balancer (NGINX, AWS ALB) will pass TCP traffic to the instance without decrypting it.
// if false, the load balancer decrypts the traffic and forwards it to the instance as HTTP.
const TLS_PASSTHROUGH = process.env.TLS_PASSTHROUGH === 'true';

const tokenSecret = 'my-secret-you-will-never-guess';
const accessTokenExpireIn = '2h';
const refreshTokenExpireIn = '30 days';

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
    const deviceId  = req.params?.deviceId || req.body?.deviceId || req.body?.uid || req.body?.sn || req.query?.deviceId;

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
    const certificateFingerprintFromDevice = certFingerprint.replace(/\:/g,'').toLowerCase();

    const whereCondition = {
        status: true,
    };
    if (deviceId) {
        whereCondition.id = deviceId;
    }
    if (certificateFingerprintFromDevice) {
        whereCondition.certificateFingerprint = certificateFingerprintFromDevice;
    }
    const device = await Device.findOne({ where: whereCondition });
    if (!device) {
        if (deviceId) {
            throw new APIError(401, `Device ${deviceId} not in whitelist or certificate mismatch.`);
        } else {
            throw new APIError(401, `Device certificate ${certificateFingerprintFromDevice} not in whitelist.`);
        }
    }
    next();
}

function createToken(data, options) {
    delete data.exp;
    delete data.iat;
    const _accessTokenData = {
        ...data,
        TokenType: 'user',
    }
    const _refreshTokenData = {
        ...data,
        TokenType: 'refresh',
    }
    const _accessTokenOptions = {
        ...options,
        expiresIn: accessTokenExpireIn,
        jwtid: uuid.v4(),
    }
    const _refreshTokenOptions = {
        ...options,
        expiresIn: refreshTokenExpireIn,
        jwtid: uuid.v4(),
    }
    return {
        accessToken: jwt.sign(
            _accessTokenData,
            tokenSecret,
            _accessTokenOptions
        ),
        refreshToken: jwt.sign(
            _refreshTokenData,
            tokenSecret,
            _refreshTokenOptions
        )
    }
}

const authUserToken = async (req, res, next) => {
    let token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        throw new APIError(401, 'Invalid token');
    }
    const decoded = jwt.decode(token);
    let claim;
    try {
        claim = jwt.verify(token, tokenSecret);
    } catch (e) {
        if (e.name === 'TokenExpiredError' &&
            (decoded.TokenType === 'refresh')) {
            throw new APIError(401, 'Refresh token expired');
        }
        if (e.name === 'TokenExpiredError' && decoded.TokenType === 'user') {
            throw new APIError(401, 'Access token expired');
        }
    }
    if (!claim) {
        throw new APIError(401, 'Invalid token');
    }
    req.tokenData = claim;
    return next();
}

module.exports = {
    validateAPIKeyOrCert,
    validateClientCertAndDeviceId,
    validateAPIKey,
    createToken,
    authUserToken,
}