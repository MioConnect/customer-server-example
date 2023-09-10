'use strict';
const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
    class User extends Model {
        static associate(models) {
            User.hasMany(models.Device, {
                sourceKey: 'id',
                foreignKey: 'userId',
            });
        }
    }
    User.init({
        id: {
            type: DataTypes.UUID,
            unique: 'id',
            allowNull: false,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4,
            comment: 'User ID'
        },
        username: {
            type: DataTypes.STRING,
            defaultValue: '',
            allowNull: false,
        },
        password: {
            type: DataTypes.STRING,
            defaultValue: '',
            allowNull: false,
        },
        role: {
            type: DataTypes.STRING,
            defaultValue: '',
            allowNull: false,
        },
        status: {
            type: DataTypes.TINYINT,
            allowNull: false,
            defaultValue: 1,
        },
    }, {
        sequelize,
        modelName: 'User',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
    });
    return User;
}
