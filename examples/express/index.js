const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const maracuya = require('../..');

const config = {
    // two per second
    'customers': {
        perInterval: 2,
        interval: 1000,
        capacity: 2
    }
};

const handlers = maracuya.configureFromObject(config);

app.use(bodyParser.json());

app.post('/take', (req, res) => {
    const { type, id } = req.body;
    const amount = req.query.amount || 1;
    handlers.take(type, id, amount, (err, result) => {
        if (err) { return res.status(500).send(err.message); }
        return res.status(200).json({ allowed: result })
    });
});

app.listen(3000, (err) => {
    console.log('starting server');
});