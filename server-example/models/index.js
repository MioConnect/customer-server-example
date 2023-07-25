const Sequelize = require('sequelize');

const MessageStatus = {
    deleted: 0,
    active: 1,
    downloaded: 2,
    read: 3
}

const dbOptions = {
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false,
}

const dbInstance = new Sequelize(dbOptions);

require('./Device.js')(dbInstance);
require('./Message.js')(dbInstance);

for (let id of Object.keys(dbInstance.models)) {
    let model = dbInstance.models[id];
    if (typeof(model.associate) == 'function') {
        model.associate(dbInstance.models);
    } 
}

async function initDB() {
    await dbInstance.authenticate();
    const alter = process.env.ALTER_DB === 'true';
    await dbInstance.sync({
        sync: false,
        alter
    });
}

module.exports = {
    MessageStatus,
    dbInstance,
    initDB,
};