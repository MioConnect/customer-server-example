const request_promise = require('request-promise');
const fs = require('fs');
const crypto = require('crypto');
const colors = require('colors');
const Mock = require('mockjs');

const API_BASE = 'https://local.customer-server-sample.com:8443';
// httpsCA is to verify the local.customer-server-sample.com certificate
const httpsCA = fs.readFileSync('./aws-ca-device-certs/isrgrootx1.pem.crt');
// device certificate is issued by AWS IoT Core
const deviceCertPem = fs.readFileSync('./customer-ca-device-certs/device-cert.crt');
// const certificateId = '9b779effa2b60395f163cedd60788ee28ef88b4194d4e2f28852765a9a1c1253';
const privateKeyPem = fs.readFileSync('./customer-ca-device-certs/private.key');

const deviceId = 'test-device-id';  // Transtek device ID (Serial Number)
const modelNumber = 'test-model';

function printOptions(options) {
  const options_copy = Object.assign({}, options);
  delete options_copy.cert;
  delete options_copy.key;
  delete options_copy.rejectUnauthorized;
  delete options_copy.json;
  delete options_copy.ca;
  console.log(`${JSON.stringify(options_copy, null, 2)}`.gray);
}

function getMockBusinessData() {
  return Mock.mock({
    wt: '@integer(40000, 100000)',
    bmi: 0,
    fat: 0,
    bm: 0,
    mus: 0,
    ts: Math.ceil(Date.now() / 1000)
  })
}

async function test() {

  const options = {
    uri: API_BASE + `/devicetelemetry/${deviceId}`,
    method: 'POST',
    body: getMockBusinessData(),
    cert: deviceCertPem,
    key: privateKeyPem,
    ca: [httpsCA],
    rejectUnauthorized: true,
    json: true,
    headers: {}
  }

  console.log(`Device telemetry request:`);
  printOptions(options)
  console.log(`Device sending telemetry data with customer ca signed device cert`);
  resp = await request_promise(options).catch(err => {
    console.log(`Error: ${err.message}`.red)
  });
  console.log(`Device telemetry response:`);
  console.log(`${JSON.stringify(resp, null, 2)}`.gray);
}

test()