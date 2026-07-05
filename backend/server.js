require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/reports', require('./routes/reports'));

app.get('/api/health', function (req, res) {
    res.json({ status: 'ok', message: 'Best Bake POS API is running' });
});

app.get('*', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, function () {
    console.log('');
    console.log('========================================');
    console.log('  Best Bake POS Server');
    console.log('  http://localhost:' + PORT);
    console.log('========================================');
    console.log('');
});