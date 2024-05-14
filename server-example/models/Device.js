'use strict';
const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
    class Device extends Model {
        static associate(models) {
            Device.hasMany(models.Message, {
                sourceKey: 'id',
                foreignKey: 'deviceId',
            });
        }
    }
    Device.init({
        id: {
            type: DataTypes.STRING,
            unique: 'id',
            allowNull: false,
            primaryKey: true,
            comment: 'Device ID, could be IMEI or Serial Number, currently most Transtek devices use Serial Number as Device ID.'
        },
        serialNumber: {
            type: DataTypes.STRING,
            defaultValue: '',
            allowNull: true,
        },
        imei: {
            type: DataTypes.STRING,
            defaultValue: '',
            allowNull: true,
        },
        modelNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        certificateFingerprint: {
            type: DataTypes.STRING,
            defaultValue: '',
            allowNull: true,
        },
        status: {
            type: DataTypes.TINYINT,
            allowNull: false,
            defaultValue: 1,
        },
    }, {
        sequelize,
        modelName: 'Device',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
    });
    return Device;
}
