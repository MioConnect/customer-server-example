const request_promise = require('request-promise');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const colors = require('colors');
const Mock = require('mockjs');

const API_BASE = 'https://local.customer-server-sample.com:8443';
const testDeviceId = 'test-device-id'; // Test device ID for issue certificate from customer server
const modelNumber = 'test-model';
const API_KEY_NAME = 'api-key-name';  // MioConnect to customer server API key
const API_KEY_VALUE = 'api-key-value';

function printOptions(options) {
  const options_copy = Object.assign({}, options);
  delete options_copy.cert;
  delete options_copy.key;
  delete options_copy.body;
  delete options_copy.rejectUnauthorized;
  delete options_copy.json;
  delete options_copy.ca;
  console.log(`${JSON.stringify(options_copy, null, 2)}`.gray);
}

// MioConnect will call this customer server API to request for device certificate
async function test() {
  const headers = {};
  headers[API_KEY_NAME] = API_KEY_VALUE;
  let options = {
    uri: API_BASE + '/devicecert',
    method: 'POST',
    body: {
      deviceId: testDeviceId,
      modelNumber: modelNumber,
      isTest: false,
    },
    rejectUnauthorized: false,
    json: true,
    headers: headers
  }

  console.log(`Device certificate request:`);
  printOptions(options);
  let resp = await request_promise(options).catch(err => {
    console.log(`Error: ${err.message}`.red);
  });
  console.log(`Device certificate response:`);
  console.log(`${JSON.stringify(resp, null, 2)}`.gray);
  console.log(`Certificate signed: ${resp.certificateId} for ${testDeviceId}`);

  const deviceCertPath = path.join(__dirname, 'customer-ca-device-certs', 'device-cert.crt');
  const deviceCertPKPath = path.join(__dirname, 'customer-ca-device-certs', 'private.key');
  fs.writeFileSync(deviceCertPath, resp.certificatePem);
  fs.writeFileSync(deviceCertPKPath, resp.keyPair.privateKey);
}

test()