require('dotenv').config(); //loading .env

const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 9876;

// getting token from .env
const Token = process.env.TOKEN;

const win_size = 10;
let arr = [];

const API_map = {
    p: 'http://20.244.56.144/evaluation-service/primes',
    f: 'http://20.244.56.144/evaluation-service/fibo',
    e: 'http://20.244.56.144/evaluation-service/even',
    r: 'http://20.244.56.144/evaluation-service/rand',
}

app.get('/numbers/:numberid', async (req, res) => {
    const { numberid } = req.params;
    const url = API_map[numberid];

    if (!url) {
        return res.status(400).json({ error: 'Invalid number ID' });
    }

    const winPrevState = [...arr];
    let fetchedNumbers = [];

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${Token}`,
            },
            timeout: 500,
        });

        fetchedNumbers = response.data.numbers || [];

        for (let num of fetchedNumbers) {
            if (!arr.includes(num)) {
                arr.push(num);
                if (arr.length > win_size) {
                    arr.shift();
                }
            }
        }
    } catch (err) {
        console.error('Error fetching numbers:', err.message);
    }

    const avg = arr.length === 0 ? 0 :
        (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);

    res.json({
        windowPrevState: winPrevState,
        windowCurrState: [...arr],
        numbers: fetchedNumbers,
        avg: parseFloat(avg),
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});