import crypto from 'crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).set(corsHeaders).end();
    return;
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle GET requests
  if (req.method === 'GET') {
    if (req.url === '/health') {
      return res.status(200).json({
        status: 'online',
        service: 'payu_gateway',
        timestamp: new Date().toISOString(),
        node_version: process.version
      });
    }
    
    if (req.url === '/test' || req.url === '/') {
      return res.status(200).json({
        status: 'PAYU_BACKEND_ACTIVE',
        message: 'PayU Payment Gateway Backend',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: 'GET /health',
          create_payment: 'POST /',
          test: 'GET /test'
        }
      });
    }
  }

  // Handle POST requests
  if (req.method === 'POST') {
    try {
      const { amount, firstName, lastName, email, phone, productInfo = 'Donation' } = req.body;

      // Validation
      if (!amount || !firstName || !email) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: amount, firstName, email'
        });
      }

      // Use environment variables
      const merchantKey = process.env.PAYU_MERCHANT_KEY || 'qyHOaB';
      const salt = process.env.PAYU_SALT || '0x99YlO1SoZtMA98MzO9ebBrKEssz4z0';
      const txnid = 'TXN' + Date.now();
      
      // PayU hash
      const hashString = `${merchantKey}|${txnid}|${amount}|${productInfo}|${firstName}|${email}|||||||||||${salt}`;
      const hash = crypto.createHash('sha512').update(hashString).digest('hex');

      return res.status(200).json({
        success: true,
        data: {
          key: merchantKey,
          txnid,
          amount,
          productinfo: productInfo,
          firstname: firstName,
          lastname: lastName || '',
          email,
          phone: phone || '9999999999',
          hash,
          surl: 'https://wad-donation.vercel.app/success',
          furl: 'https://wad-donation.vercel.app/failure',
          service_provider: 'payu_paisa'
        },
        payuUrl: process.env.NODE_ENV === 'production' 
          ? 'https://secure.payu.in/_payment' 
          : 'https://test.payu.in/_payment'
      });

    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Method not allowed
  return res.status(405).json({
    success: false,
    message: 'Method not allowed',
    allowed: ['GET', 'POST', 'OPTIONS']
  });
}