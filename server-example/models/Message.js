'use strict';
const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
    class Message extends Model {
        static associate(models) {
            Message.belongsTo(models.Device, {
                foreignKey: 'deviceId',
                targetKey: 'id',
                as: 'Device',
            });
        }
    }
    Message.init({
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
        from: {
            type: DataTypes.STRING,
            defaultValue: '',
            allowNull: false,
        },
        subject: {
            type: DataTypes.STRING,
            defaultValue: '',
            allowNull: false,
        },
        content: {
            type: DataTypes.STRING,
            defaultValue: '',
            allowNull: false,
        },
        downloadedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        readAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        status: {
            type: DataTypes.TINYINT,
            allowNull: false,
            defaultValue: 1,
            comment: '0: deleted, 1: active, 2: downloaded, 3: read, this column is not used by device, just for server side management.',
        },
    }, {
        sequelize,
        modelName: 'Message',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
    });
    return Message;
}
