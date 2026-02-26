const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: path.join(__dirname, '.env') });

async function run() {
    try {
        const token = jwt.sign({ id: new mongoose.Types.ObjectId().toString() }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });

        // Create a real PNG to be sure
        const dummyImg = path.join(__dirname, 'dummy.png');
        // Minimal valid 1x1 png 
        const pngBinary = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", 'base64');
        fs.writeFileSync(dummyImg, pngBinary);

        const form = new FormData();
        form.append('photo', fs.createReadStream(dummyImg), {
            filename: 'test.png',
            contentType: 'image/png'
        });

        console.log('Sending request to http://localhost:5000/api/pifu/generate');
        const response = await axios.post('http://localhost:5000/api/pifu/generate', form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });
        console.log('Success:', response.status, response.data);
    } catch (error) {
        console.error('API call failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

run();
