module.exports = {
    apps: [{
        name: "server-example-tls-passthrough",
        script: "./index.js",
        env: {
            API_KEY_NAME: "api-key-name",
            API_KEY_VALUE: "api-key-value",
            TLS_PASSTHROUGH: "true",
            PORT: '3030',
        }
    }]
}