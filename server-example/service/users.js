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
const createUserReqSchema = require('./openapi-schema/create-user-req.json');

async function createUser(req, res, next) {
    const tokenData = req.tokenData;
    const body = req.body;
    const valid = ajv.validate(createUserReqSchema, body);
    if (!valid) {
        throw new APIError(400, ajv.errorsText());
    }

    if (tokenData.role !== 'admin') {
        throw new APIError(403, 'Permission denied');
    }

    const { username, password } = body;
    const user = await User.create({
        username,
        password,
        role: 'user'
    });
    delete user.password;
    res.json(user);
}

async function listUser(req, res, next) {
    const { current, pageSize } = req.query;
    const tokenData = req.tokenData;

    if (tokenData.role !== 'admin') {
        throw new APIError(403, 'Permission denied');
    }
    const limit = pageSize ? parseInt(pageSize) : 10;
    const offset = current ? parseInt(current - 1) * limit : 0;

    const userResult = await User.findAndCountAll({
        limit,
        offset,
        where: {
            username: {
                [Sequelize.Op.ne]: 'admin@mio-labs.com',
            }
        },
        attributes: {
            exclude: ['password']
        }
    });
    res.json(userResult);
}

async function authUserPassword(req, res, next) {
    const { username, password } = req.body;

    const user = await User.findOne({
        where: {
            username,
            password,
        },
        attributes: { 
            exclude: ['password']
        }
    });
    if (!user) {
        throw new APIError(401, 'Invalid username or password');
    }
    const tokens = createToken({
        userId: user.id,
        username: user.username,
        role: user.role,
    });

    res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user,
    });
}

async function getSelf(req, res, next) {
    const tokenData = req.tokenData;
    const user = await User.findOne({
        where: {
            id: tokenData.userId,
        },
        attributes: { 
            exclude: ['password']
        }
    });
    res.json(user);
}

router.post('/users', authUserToken, createUser);
router.get('/users', authUserToken, listUser);
router.post('/auth', authUserPassword);
router.get('/auth', authUserToken, getSelf);

module.exports = router;