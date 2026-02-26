const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { spawn } = require('child_process');

console.log('Starting test server on port 5005...');
const server = spawn('node', ['src/server.js'], {
    env: { ...process.env, PORT: 5005 }
});

server.stdout.on('data', data => process.stdout.write('[SERVER]: ' + data));
server.stderr.on('data', data => process.stderr.write('[SERVER ERR]: ' + data));

setTimeout(async () => {
    try {
        const token = jwt.sign({ id: new mongoose.Types.ObjectId().toString() }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });

        const dummyImg = path.join(__dirname, 'dummy.png');
        if (!fs.existsSync(dummyImg)) {
            fs.writeFileSync(dummyImg, Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C489', 'hex'));
        }

        const form = new FormData();
        form.append('photo', fs.createReadStream(dummyImg));

        console.log('Sending request to port 5005...');
        const response = await axios.post('http://localhost:5005/api/pifu/generate', form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });
        console.log('Success:', response.status, response.data);
    } catch (error) {
        console.error('Request Error status:', error.response?.status);
        console.error('Request Error data:', error.response?.data);
    }

    setTimeout(() => {
        console.log('Killing test server...');
        server.kill();
        process.exit(0);
    }, 2000);
}, 3000);
