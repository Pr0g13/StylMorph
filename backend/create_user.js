const http = require('http');

const data = JSON.stringify({
    username: "Second",
    email: "second@example.com",
    password: "1234567890"
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/auth/signup',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let chunks = [];
    res.on('data', (d) => {
        chunks.push(d);
    });
    res.on('end', () => {
        console.log("Status Code:", res.statusCode);
        console.log("Response:", Buffer.concat(chunks).toString());
    })
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
