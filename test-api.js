const http = require('http');

const data = JSON.stringify({
  userId: '04effd4e-acfe-4969-97b4-40f9644bee9d',
  flow: 'passport'
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/create-session',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`BODY: ${body}`);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
