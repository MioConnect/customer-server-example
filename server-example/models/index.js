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
require('./User.js')(dbInstance);

for (let id of Object.keys(dbInstance.models)) {
    let model = dbInstance.models[id];
    if (typeof(model.associate) == 'function') {
        model.associate(dbInstance.models);
    } 
}

async function initSuperUser() {
    const { User } = dbInstance.models;
    let superUser = await User.findOne({
        where:{
            username: 'admin@mio-labs.com'
        }
    })
    if (!superUser) {
        superUser = await User.create({
            username: 'admin@mio-labs.com',
            password: 'User@123',
            role: 'admin',
        });
    }
}

async function initDB() {
    await dbInstance.authenticate();
    const alter = process.env.ALTER_DB === 'true';
    await dbInstance.sync({
        sync: false,
        alter
    });
    await initSuperUser();
}

module.exports = {
    MessageStatus,
    dbInstance,
    initDB,
};