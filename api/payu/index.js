const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();

// CORS configuration for your frontend
app.use(cors({
  origin: ['https://wad-donation.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log Node.js version for debugging
console.log(`🚀 Backend starting with Node.js ${process.version}`);

// ====================
// 1. ROOT ENDPOINT
// ====================
app.get('/', (req, res) => {
  res.json({
    status: 'PAYU_BACKEND_ACTIVE',
    message: 'PayU Payment Gateway Backend',
    timestamp: new Date().toISOString(),
    node_version: process.version,
    endpoints: {
      health: 'GET /health',
      create_payment: 'POST /create',
      verify_payment: 'POST /verify',
      test: 'GET /test'
    }
  });
});

// ====================
// 2. HEALTH CHECK
// ====================
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'payu_gateway',
    timestamp: new Date().toISOString(),
    node_version: process.version,
    env: process.env.NODE_ENV || 'production'
  });
});

// ====================
// 3. CREATE PAYMENT
// ====================
app.post('/create', (req, res) => {
  try {
    console.log('🔔 PayU Create Request:', JSON.stringify(req.body));
    
    const {
      amount = '10.00',
      firstName = 'Donor',
      email = 'donor@example.com',
      phone = '9999999999',
      productInfo = 'Donation',
      txnId = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`
    } = req.body;

    // VALIDATION
    if (!amount || !email) {
      return res.status(400).json({
        success: false,
        error: 'Amount and Email are required',
        received: req.body
      });
    }

    // GET CREDENTIALS FROM ENVIRONMENT
    const key = process.env.PAYU_MERCHANT_KEY || 'qyHOaB';
    const salt = process.env.PAYU_SALT || '0x99YlO1SoZtMA98MzO9ebBrKEssz4z0';
    
    console.log(`🔑 Using Key: ${key.substring(0, 3)}...`);
    console.log(`🧂 Using Salt: ${salt.substring(0, 6)}...`);

    // PAYU HASH GENERATION (CORRECT FORMAT)
    // key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt
    const hashString = `${key}|${txnId}|${amount}|${productInfo}|${firstName}|${email}|||||||||||${salt}`;
    
    console.log('📝 Hash String:', hashString);
    
    // Generate SHA512 hash
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');
    
    console.log('✅ Generated Hash:', hash.substring(0, 20) + '...');

    // RESPONSE DATA
    const paymentData = {
      // Required by PayU
      key: key,
      txnid: txnId,
      amount: amount,
      productinfo: productInfo,
      firstname: firstName,
      email: email,
      phone: phone || '9999999999',
      hash: hash,
      surl: req.body.surl || 'https://wad-donation.vercel.app/success',
      furl: req.body.furl || 'https://wad-donation.vercel.app/failure',
      service_provider: 'payu_paisa',
      
      // Optional fields
      lastname: req.body.lastName || '',
      address1: req.body.address1 || '',
      address2: req.body.address2 || '',
      city: req.body.city || '',
      state: req.body.state || '',
      country: req.body.country || 'India',
      zipcode: req.body.zipcode || '',
      udf1: req.body.udf1 || '',
      udf2: req.body.udf2 || '',
      udf3: req.body.udf3 || '',
      udf4: req.body.udf4 || '',
      udf5: req.body.udf5 || ''
    };

    // SUCCESS RESPONSE
    res.json({
      success: true,
      message: 'Payment hash generated successfully',
      data: paymentData,
      debug: {
        hash_string: hashString,
        hash_length: hash.length,
        node_version: process.version,
        gateway_url: process.env.NODE_ENV === 'production' 
          ? 'https://secure.payu.in/_payment' 
          : 'https://test.payu.in/_payment'
      }
    });

  } catch (error) {
    console.error('❌ PayU Create Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ====================
// 4. VERIFY PAYMENT
// ====================
app.post('/verify', (req, res) => {
  try {
    console.log('🔍 PayU Verification Request:', req.body);
    
    const {
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      status,
      hash,
      key
    } = req.body;

    if (!txnid || !status || !hash) {
      return res.status(400).json({
        success: false,
        error: 'Missing verification parameters'
      });
    }

    const salt = process.env.PAYU_SALT || '0x99YlO1SoZtMA98MzO9ebBrKEssz4z0';
    
    // PAYU VERIFICATION HASH (reverse of creation)
    // salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
    const verificationString = `${salt}|${status}|||||||||${email || ''}|${firstname || ''}|${productinfo || ''}|${amount || ''}|${txnid}|${key || ''}`;
    
    const calculatedHash = crypto.createHash('sha512')
      .update(verificationString)
      .digest('hex');

    const isValid = calculatedHash === hash;
    
    console.log(`✅ Verification Result: ${isValid ? 'VALID' : 'INVALID'}`);
    console.log(`   Status: ${status}, TxnID: ${txnid}`);

    // RESPONSE
    const response = {
      success: true,
      transaction_id: txnid,
      payment_status: status,
      amount: amount,
      customer_name: firstname,
      customer_email: email,
      hash_valid: isValid,
      verified_at: new Date().toISOString(),
      node_version: process.version
    };

    // REDIRECT BASED ON STATUS
    if (status === 'success' && isValid) {
      response.redirect = 'https://wad-donation.vercel.app/success';
      response.message = 'Payment successful!';
    } else if (status === 'failure' || !isValid) {
      response.redirect = 'https://wad-donation.vercel.app/failure';
      response.message = 'Payment failed or verification invalid';
    } else {
      response.message = 'Payment pending';
    }

    res.json(response);

  } catch (error) {
    console.error('❌ Verification Error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: error.message
    });
  }
});

// ====================
// 5. TEST ENDPOINT
// ====================
app.get('/test', (req, res) => {
  const key = process.env.PAYU_MERCHANT_KEY || 'qyHOaB';
  const salt = process.env.PAYU_SALT || '0x99YlO1SoZtMA98MzO9ebBrKEssz4z0';
  const txnId = `TEST${Date.now()}`;
  
  const testData = {
    amount: '10.00',
    productInfo: 'Test Donation',
    firstName: 'Test User',
    email: 'test@example.com',
    phone: '9876543210'
  };
  
  const hashString = `${key}|${txnId}|${testData.amount}|${testData.productInfo}|${testData.firstName}|${testData.email}|||||||||||${salt}`;
  const hash = crypto.createHash('sha512').update(hashString).digest('hex');
  
  res.json({
    status: 'test_mode',
    message: 'PayU Backend Test Successful',
    node_version: process.version,
    test_data: {
      ...testData,
      txnId: txnId,
      hash: hash,
      hash_preview: hash.substring(0, 30) + '...'
    },
    curl_test: `curl -X POST https://wad-backend.vercel.app/create -H "Content-Type: application/json" -d '${JSON.stringify(testData)}'`
  });
});

// ====================
// 6. 404 HANDLER
// ====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    requested: req.originalUrl,
    available_endpoints: [
      'GET  /',
      'GET  /health',
      'GET  /test',
      'POST /create',
      'POST /verify'
    ]
  });
});

// ====================
// EXPORT FOR VERCEL
// ====================
module.exports = app;