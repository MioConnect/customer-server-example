# customer-server-example
This is the sample code to demonstrate Transtek devices connect to the customer server over mutual TLS.  
Typically the customer server is behind a load balancer(Eg: Nginx, AWS ALB, etc.).  
The load balancer could be responsible for TLS terminationm, or pass the TCP traffic to the customer server directly.  
So we provide both sample code to demonstrate the two scenarios.  
In this sample code, the MioConnectServer to CustomerServer authentication is using API key.  
local.customer-server-sample.com is resolved by DNS to 127.0.0.1 for local testing purpose.

# Local development and test
# Choose a TLS termination option:
The TLS data transfer could be decrypted by your load balancer, or your API server.  
For more information, please refer to [Nginx TLS Termination](https://docs.nginx.com/nginx/admin-guide/security-controls/terminating-ssl-tcp/),  [ngx_http_ssl_module](https://nginx.org/en/docs/http/ngx_http_ssl_module.html#variables)  
## TLS passthrough the load balancer and terminate at the sample express.js server
**Nginx**  
Edit the port in nginx/tls-passthrough.nginx.conf if necessary.  
Then restart the nginx service.  
```bash
sudo nginx -s stop
sudo nginx -c /path/to/nginx/tls-passthrough.nginx.conf
```

**server-example**
```bash
cd server-example
npm install
npm run start-tcp-tls
```

output:
```bash
API_KEY_NAME api-key-name
API_KEY_VALUE api-key-value      
TLS_PASSTHROUGH true
Listening: https://localhost:3030
```

now the server is ready to receive TLS traffic from the load balancer.
the peer client certificate information is available in the request socket object.
```javascript
const expressHandler = async (req, res, next) => {
    let cert = req.connection.getPeerCertificate()
    ...
}
```

## TLS terminate at the load balancer
**Nginx**  
Edit the port in nginx/tls-terminate.nginx.conf.  
Change /path/to/local.customer-server-sample.com.cer and /path/to/local.customer-server-sample.com.key to the actual path.  
Then restart the nginx service.  
```bash
sudo nginx -s stop
sudo nginx -c /path/to/nginx/tls-terminate.nginx.conf
```

**server-example**
```bash
cd server-example
npm install
npm run start-http-tls
```
output:
```bash
API_KEY_NAME api-key-name
API_KEY_VALUE api-key-value
TLS_PASSTHROUGH false
Listening: http://localhost:3030
```

now the server is ready to receive HTTP traffic from the load balancer.  
the peer client certificate information is available in the request header, which is decrypted by the load balancer.
```javascript
const expressHandler = async (req, res, next) => {
    let cert = req.headers['x-ssl-client-cert']
    ...
}
```

# Choose a device certificate options:
## Use MioConnect default CA(recommended)
MioConnect default CA will use AWS IoT Core to issue IoT device certificates, and sync the device certificates to customer server.  
[MioConnect CA](https://dev.developer.mio-labs.com/integration#heading-13)

**Synchronize the device certificate to customer server**
When Transtek devices are provisioned (or after the whole order production), the device certificates will be synchronized to customer server.  
The customer server should add the device certificate to the whitelist.  
```bash
cd client-example
npm install
node sync-device-cert.js
Synchronize device certificate request:
{
  "uri": "https://local.customer-server-sample.com:8443/syncdevicecert",
  "method": "POST",
  "headers": {
    "api-key-name": "api-key-value"
  }
}
Synchronizing certificate 9b779effa2b60395f163cedd60788ee28ef88b4194d4e2f28852765a9a1c1253
Synchronize device certificate response:
{
  "success": true
}
```

**Test the device telemetry API**
```bash
node aws-ca-device-telemetry.js     
Device telemetry request:
{
  "uri": "https://local.customer-server-sample.com:8443/devicetelemetry/202109100001",
  "method": "POST",
  "body": {
    "wt": 70747,
    "bmi": 0,
    "fat": 0,
    "bm": 0,
    "mus": 0,
    "ts": 1683215947
  },
  "headers": {}
}
Device sending telemetry data with aws signed device cert 9b779effa2b60395f163cedd60788ee28ef88b4194d4e2f28852765a9a1c1253
Device telemetry response:
{
  "success": true
}
```

## Use customer CA
Customer server will provide a certificate issuer API, and MioConnect will request the API to issue IoT device certificates.
[Customer CA](https://dev.developer.mio-labs.com/integration#heading-3)

**Request the device certificate from customer server**
When Transtek devices are provisioned, the MioConnect service will request certificate from customer server.  
The customer server should add the issued device certificate to the whitelist.  
```bash
cd client-example
npm install
node request-device-cert.js
Device certificate request:
{
  "uri": "https://local.customer-server-sample.com:8443/devicecert",
  "method": "POST",
  "headers": {
    "api-key-name": "api-key-value"
  }
}
Device certificate response:
{
  "certificateId": "1bae9a89d3b14d2cfc99a670c8402d25d811f5993e1a2fedc459c6614c8f1ac6",
  "certificatePem": "-----BEGIN CERTIFICATE-----\r\nMIIDCDCCAfCgAwIBAgIUYhqi88BhNjcCjJps+ThZrYPt",
  ...
}
Certificate signed: 1bae9a89d3b14d2cfc99a670c8402d25d811f5993e1a2fedc459c6614c8f1ac6 for test-device-id
```

**Test the device telemetry API**
```bash
node customer-ca-device-telemetry.js
Device telemetry request:
{
  "uri": "https://local.customer-server-sample.com:8443/devicetelemetry/test-device-id",
  "method": "POST",
  "body": {
    "wt": 58756,
    "bmi": 0,
    "fat": 0,
    "bm": 0,
    "mus": 0,
    "ts": 1683216352
  },
  "headers": {}
}
Device sending telemetry data with customer ca signed device cert
Device telemetry response:
{
  "success": true
}
```

# Go Public Server
Before go to a public server in internet, please make the following changes:
- nginx
  - change the server_name to your domain name (if HTTP TLS)
  - change the ssl_certificate and ssl_certificate_key to your certificate and key (if HTTP TLS)
  - provide the root CA of your server SSL cert to MioConnect, for device vertify your server
- device certificate CA (if your certificate option is CustomerCA)
  - replace server-example/sign_device_cert_ca/ca.crt and ca.key with your own CA
- customer server (if TCP TLS)
  - replace the cert/key in server-example/localhost-ssl-certs/ with your server SSL certs.