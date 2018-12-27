const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const port = 8000;

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use((req, res, next) => {
    if (req.url.indexOf('/api') === -1) {
        if (req.url === '' || req.url === '/') {
            req.url = '/index.html';
        }
        const filePath = path.join(__dirname, req.url);
        try {
            const stat = fs.statSync(filePath);
            if (!stat.isFile()) {
                return next('Invalid file request');
            }
            fs.createReadStream(filePath).pipe(res);
        } catch (err) {
            next(err);
        }

    } else {
        next();
    }
});

app.get('/api', (req, res) => res.send('Hello World!'));

require('./api-routes')(app);

app.listen(port, () => console.log(`Example app listening on port ${port}!`));