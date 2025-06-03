const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json()); // to parse JSON bodies

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/numberplates', {
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Order Schema
const orderSchema = new mongoose.Schema({
    orderId: { type: String, required: true },
    customerName: { type: String, required: true },
    product: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentStatus: { type: String, required: true },
    dateOfOrder: { type: Date, required: true },
    shippingAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        country: { type: String, required: true },
        phone: { type: String, required: true }
    }
});

const Order = mongoose.model('Order', orderSchema);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Get all orders
app.get('/order-details', async (req, res) => {
    try {
        console.log('Attempting to fetch orders...');
        const { includeAddress } = req.query; // Check if we need to include address
        
        // First, let's try to get raw data without mongoose
        const db = mongoose.connection.db;
        const rawOrders = await db.collection('orders').find({}).toArray();
        console.log('Raw orders from collection:', rawOrders);
        console.log('Raw orders count:', rawOrders.length);
        
        // Now try with mongoose
        const orders = await Order.find({}).sort({ dateOfOrder: -1 }); // Sort by newest first
        console.log('Mongoose orders:', orders);
        console.log('Mongoose orders count:', orders.length);
        
        // Use raw data if mongoose returns empty
        const dataToUse = orders.length > 0 ? orders : rawOrders;
        
        // Format the data to match frontend requirements
        const formattedOrders = dataToUse.map(order => {
            const baseOrder = {
                id: order._id,
                orderId: order.orderId,
                customer: order.customerName,
                product: order.product,
                amount: order.amount,
                status: order.paymentStatus,
                date: order.dateOfOrder
            };
            
            // Include shipping address if requested (for modal view)
            if (includeAddress === 'true') {
                baseOrder.shippingAddress = order.shippingAddress;
            }
            
            return baseOrder;
        });
        
        console.log('Formatted orders:', formattedOrders);
        
        res.json({
            success: true,
            data: formattedOrders
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch orders',
            message: error.message
        });
    }
});

// Get single order details with full information
app.get('/order-details/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        console.log('Fetching single order with ID:', orderId);
        
        const db = mongoose.connection.db;
        const order = await db.collection('orders').findOne({ orderId: orderId });
        
        console.log('Found order:', order);
        
        if (!order) {
            console.log('Order not found for ID:', orderId);
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        
        const formattedOrder = {
            id: order._id,
            orderId: order.orderId,
            customer: order.customerName,
            product: order.product,
            amount: order.amount,
            status: order.paymentStatus,
            date: order.dateOfOrder,
            shippingAddress: order.shippingAddress
        };
        
        console.log('Sending formatted order:', formattedOrder);
        
        res.json({
            success: true,
            data: formattedOrder
        });
    } catch (error) {
        console.error('Error fetching single order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order details',
            message: error.message
        });
    }
});

app.post('/create-paypal-order', async (req, res) => {
    console.log('Received request to create PayPal order');
    
    // Extract amount and currency from request body
    const { amount, currency = 'GBP' } = req.body;
    
    if (!amount) {
        return res.status(400).json({ error: 'Amount is required' });
    }
    
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
                            currency_code: currency,
                            value: amount.toString(),
                        },
                    },
                ],
                application_context: {
                    return_url: 'http://localhost:5173/platebuilder#',
                    cancel_url: 'http://localhost:5173/platebuilder#',
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
        res.status(500).json({ 
            error: 'Failed to create PayPal order',
            details: err.response ? err.response.data : err.message
        });
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
        res.status(500).json({ 
            error: 'Failed to capture PayPal order',
            details: err.response ? err.response.data : err.message
        });
    }
});

// Get order details route (for checking order status)
app.get('/paypal-order/:orderId', async (req, res) => {
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

        const orderRes = await axios.get(
            `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        res.json(orderRes.data);
    } catch (err) {
        console.error('Error fetching PayPal order:', err.response ? err.response.data : err.message);
        res.status(500).json({ 
            error: 'Failed to fetch PayPal order',
            details: err.response ? err.response.data : err.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});