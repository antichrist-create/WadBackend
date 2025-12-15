const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// Root
app.get('/', (req, res) => {
  res.json({ status: 'PayU Backend LIVE', time: new Date().toISOString() });
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'online' });
});

// Create Payment
app.post('/create', (req, res) => {
  const { amount, firstName, email, phone } = req.body;
  const key = process.env.PAYU_MERCHANT_KEY || 'qyHOaB';
  const salt = process.env.PAYU_SALT || '0x99YlO1SoZtMA98MzO9ebBrKEssz4z0';
  const txnId = 'TXN' + Date.now();
  
  const hashString = `${key}|${txnId}|${amount}|Donation|${firstName}|${email}|||||||||||${salt}`;
  const hash = crypto.createHash('sha512').update(hashString).digest('hex');
  
  res.json({
    success: true,
    data: {
      key, txnid: txnId, amount, productinfo: 'Donation',
      firstname: firstName, email, phone, hash,
      surl: 'https://wad-donation.vercel.app/success',
      furl: 'https://wad-donation.vercel.app/failure',
      service_provider: 'payu_paisa'
    }
  });
});

module.exports = app;