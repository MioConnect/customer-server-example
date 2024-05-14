const request_promise = require('request-promise');
const fs = require('fs');
const crypto = require('crypto');
const colors = require('colors');
const Mock = require('mockjs');

const amazonIoTRootCaPem = `-----BEGIN CERTIFICATE-----
MIIDQTCCAimgAwIBAgITBmyfz5m/jAo54vB4ikPmljZbyjANBgkqhkiG9w0BAQsF
ADA5MQswCQYDVQQGEwJVUzEPMA0GA1UEChMGQW1hem9uMRkwFwYDVQQDExBBbWF6
b24gUm9vdCBDQSAxMB4XDTE1MDUyNjAwMDAwMFoXDTM4MDExNzAwMDAwMFowOTEL
MAkGA1UEBhMCVVMxDzANBgNVBAoTBkFtYXpvbjEZMBcGA1UEAxMQQW1hem9uIFJv
b3QgQ0EgMTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALJ4gHHKeNXj
ca9HgFB0fW7Y14h29Jlo91ghYPl0hAEvrAIthtOgQ3pOsqTQNroBvo3bSMgHFzZM
9O6II8c+6zf1tRn4SWiw3te5djgdYZ6k/oI2peVKVuRF4fn9tBb6dNqcmzU5L/qw
IFAGbHrQgLKm+a/sRxmPUDgH3KKHOVj4utWp+UhnMJbulHheb4mjUcAwhmahRWa6
VOujw5H5SNz/0egwLX0tdHA114gk957EWW67c4cX8jJGKLhD+rcdqsq08p8kDi1L
93FcXmn/6pUCyziKrlA4b9v7LWIbxcceVOF34GfID5yHI9Y/QCB/IIDEgEw+OyQm
jgSubJrIqg0CAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAOBgNVHQ8BAf8EBAMC
AYYwHQYDVR0OBBYEFIQYzIU07LwMlJQuCFmcx7IQTgoIMA0GCSqGSIb3DQEBCwUA
A4IBAQCY8jdaQZChGsV2USggNiMOruYou6r4lK5IpDB/G/wkjUu0yKGX9rbxenDI
U5PMCCjjmCXPI6T53iHTfIUJrU6adTrCC2qJeHZERxhlbI1Bjjt/msv0tadQ1wUs
N+gDS63pYaACbvXy8MWy7Vu33PqUXHeeE6V/Uq2V8viTO96LXFvKWlJbYK8U90vv
o/ufQJVtMVT8QtPHRh8jrdkPSHCa2XV4cdFyQzR1bldZwgJcJmApzyMZFo6IQ6XU
5MsI+yMRQ+hDKXJioaldXgjUkK642M4UwtBV8ob2xJNDd2ZhwLnoQdeXeGADbkpy
rqXRfboQnoZsG4q5WTP468SQvvG5
-----END CERTIFICATE-----
`;

const API_BASE = 'https://local.customer-server-sample.com:8443';
const httpsCA = fs.readFileSync('./aws-ca-device-certs/isrgrootx1.pem.crt');
// device certificate is issued by AWS IoT Core
const deviceCertPem = fs.readFileSync('./aws-ca-device-certs/device-cert.crt');
const certificateId = '9b779effa2b60395f163cedd60788ee28ef88b4194d4e2f28852765a9a1c1253';
const publicKeyPem = fs.readFileSync('./aws-ca-device-certs/public.key');
const privateKeyPem = fs.readFileSync('./aws-ca-device-certs/private.key');

const deviceId = '202109100001';  // Transtek device ID (Serial Number)
const modelNumber = 'test-model';
const API_KEY_NAME = 'api-key-name';  // MioConnect to Customer server API key
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

// MioConnect will synchronize device certificate to customer server by this API request
async function test() {
  const headers = {};
  headers[API_KEY_NAME] = API_KEY_VALUE;
  options = {
    uri: API_BASE + '/syncdevicecert',
    method: 'POST',
    body: {
      deviceId: deviceId,
      modelNumber: modelNumber,
      certificateId: certificateId,
      certificatePem: deviceCertPem,
      keyPair: {
          publicKey: publicKeyPem,
          privateKey: privateKeyPem,
      },
      rootCertPem: amazonIoTRootCaPem,
      createdAt: Math.ceil(Date.now() / 1000),
      isTest: false
    },
    rejectUnauthorized: false,
    json: true,
    headers: headers
  }

  console.log(`Synchronize device certificate request:`);
  printOptions(options)
  console.log(`Synchronizing certificate ${options.body.certificateId}`);
  resp = await request_promise(options).catch(err => {
    console.log(`Error: ${err.message}`.red)
  });
  console.log(`Synchronize device certificate response:`);
  console.log(`${JSON.stringify(resp, null, 2)}`.gray);
}

test()