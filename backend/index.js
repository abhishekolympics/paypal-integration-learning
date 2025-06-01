const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json()); // to parse JSON bodies

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/create-paypal-order', async (req, res) => {
    console.log('Received request to create PayPal order');
    try {
        const auth = Buffer.from(
            `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET_KEY}`
        ).toString('base64');

        const tokenRes = await axios.post(
            'https://api-m.sandbox.paypal.com/v1/oauth2/token',
            'grant_type=client_credentials',
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${auth}`,
                },
            }
        );

        const accessToken = tokenRes.data.access_token;

        const orderRes = await axios.post(
            'https://api-m.sandbox.paypal.com/v2/checkout/orders',
            {
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        amount: {
                            currency_code: 'USD',
                            value: '100.00',
                        },
                    },
                ],
                application_context: {
                    return_url: 'http://localhost:3000/return',
                    cancel_url: 'http://localhost:3000/cancel',
                },
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        res.json(orderRes.data);
    } catch (err) {
        console.error('Error creating PayPal order:', err.response ? err.response.data : err.message);
        res.status(500).json({ error: err.message });
    }
});

// Capture payment route
app.post('/capture-paypal-order/:orderId', async (req, res) => {
    const { orderId } = req.params;
    try {
        const auth = Buffer.from(
            `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET_KEY}`
        ).toString('base64');

        const tokenRes = await axios.post(
            'https://api-m.sandbox.paypal.com/v1/oauth2/token',
            'grant_type=client_credentials',
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${auth}`,
                },
            }
        );

        const accessToken = tokenRes.data.access_token;

        const captureRes = await axios.post(
            `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`,
            {},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        res.json(captureRes.data);
    } catch (err) {
        console.error('Error capturing PayPal order:', err.response ? err.response.data : err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
