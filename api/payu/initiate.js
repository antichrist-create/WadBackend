export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount, name, email, phone, purpose } = req.body;

  const merchantKey = 'qyHOaB';
  const salt = '0x99YlO1SoZtMA98MzO9ebBrKEssz4z0';
  const txnid = 'TXN' + Date.now();
  const productinfo = purpose || 'Donation';
  const surl = 'https://wad-donation.vercel.app/payment/success';
  const furl = 'https://wad-donation.vercel.app/payment/failure';

  const hashString = `${merchantKey}|${txnid}|${amount}|${productinfo}|${name}|${email}|||||||||||${salt}`;
  
  const crypto = require('crypto');
  const hash = crypto.createHash('sha512').update(hashString).digest('hex');

  res.status(200).json({
    key: merchantKey,
    txnid,
    amount,
    productinfo,
    firstname: name,
    email,
    phone,
    surl,
    furl,
    hash,
    action: 'https://secure.payu.in/_payment'
  });
}
