// api/payu/initiate.js
import crypto from 'crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).set(corsHeaders).end();
    return;
  }

  // Set CORS headers for all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { amount, firstName, lastName, email, phone, productInfo } = req.body;

  const merchantKey = 'qyHOaB';
  const salt = '0x99YlO1SoZtMA98MzO9ebBrKEssz4z0';
  const txnid = 'TXN' + Date.now();
  const surl = 'https://wad-donation.vercel.app/payment/success';
  const furl = 'https://wad-donation.vercel.app/payment/failure';

  const hashString = `${merchantKey}|${txnid}|${amount}|${productInfo}|${firstName}|${email}|||||||||||${salt}`;
  const hash = crypto.createHash('sha512').update(hashString).digest('hex');

  res.status(200).json({
    success: true,
    payuUrl: 'https://secure.payu.in/_payment',
    params: {
      key: merchantKey,
      txnid,
      amount,
      productinfo: productInfo,
      firstname: firstName,
      lastname: lastName,
      email,
      phone,
      surl,
      furl,
      hash,
    },
  });
}
