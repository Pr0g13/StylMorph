const http = require('http');

http.get('http://localhost:5000/temp/outputs/pifuhd_final/recon/result_test_512.obj', (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.on('data', (chunk) => {
        console.log(`Received ${chunk.length} bytes`);
        res.destroy(); // Only need the first chunk to know it works
    });
}).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
});
