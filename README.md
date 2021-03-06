# maracuya ![](https://travis-ci.org/dschenkelman/maracuya.svg?branch=master)
A token bucket library

## Installation
```
npm install maracuya
```

## Usage
```node
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const maracuya = require('../..');

// configure maracuya
const config = {
    // two per second
    'customers': {
        perInterval: 2,
        interval: 1000,
        capacity: 2
    }
};

const handlers = maracuya.configureFromObject(config);

// configure an express server
app.use(bodyParser.json());

app.post('/take', (req, res) => {
    const { type, id } = req.body;
    const amount = req.query.amount || 1;

    handlers.take(type, id, amount, (err, result) => {
        if (err) { return res.status(500).send(err.message); }
        return res.status(200).json({ allowed: result })
    });
});

// start listening
app.listen(3000, (err) => {
    console.log('starting server');
});
```

You can find a working sample under the [examples/express](./examples/express) folder.

## Contributing
Feel free to open issues with questions/bugs/features. PRs are also welcome.

## License
[MIT](./LICENSE)