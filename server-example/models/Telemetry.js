'use strict';
const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
    class Telemetry extends Model {
        static associate(models) {
            Telemetry.belongsTo(models.Device, {
                foreignKey: 'deviceId',
                targetKey: 'id',
                as: 'Device',
            });
        }
    }
    Telemetry.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            unique: 'id',
            allowNull: false,
            primaryKey: true,
        },
        deviceId: {
            type: DataTypes.STRING,
            defaultValue: '',
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING,
            defaultValue: '',
            allowNull: true,
            comment: 'bgm_gen2_measure, bgm_gen2_order',
        },
        data: {
            type: DataTypes.JSON,
            defaultValue: null,
            allowNull: false,
        },
        status: {
            type: DataTypes.TINYINT,
            allowNull: false,
            defaultValue: 1,
            comment: '0: deleted, 1: active',
        },
    }, {
        sequelize,
        modelName: 'Telemetry',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
    });
    return Telemetry;
}
