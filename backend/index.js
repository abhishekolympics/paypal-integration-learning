const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/numberplates', {})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// ===============================
// SCHEMAS
// ===============================

// Admin User Schema
const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Cart Item Schema (NEW)
const cartItemSchema = new mongoose.Schema({
    sessionId: { type: String, required: true },
    userId: String, // For future user authentication
    name: { type: String, required: true },
    type: { type: String, enum: ['plate', 'fixing-kit'], required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
    image: String,
    
    // Plate-specific fields
    side: String,
    registration: String,
    roadLegal: String,
    size: String,
    plateStyle: String,
    fontColor: String,
    borderStyle: String,
    shadowEffect: String,
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Configuration Schema (existing)
const configurationSchema = new mongoose.Schema({
    type: { 
        type: String, 
        required: true,
        enum: ['plateStyle', 'thickness', 'color', 'shadow', 'border', 'size', 'finish', 'country', 'flag']
    },
    key: { type: String, required: true },
    label: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String },
    
    // Plate Style specific fields
    font: { type: String },
    fontUrl: { type: String },
    fontSize: { type: Number },
    
    // Color specific fields
    color: { type: String },
    name: { type: String },
    
    // Thickness specific fields
    value: { type: Number },
    
    // Border specific fields
    borderColor: { type: String },
    
    // Size specific fields
    dimensions: { type: String },
    
    // Flag specific fields
    text: { type: String },
    flagImage: { type: String },
    parentCountry: { type: String },
    
    // Common fields
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true },
    
    // Enhanced Customer Information
    customer: {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String, required: true },
        city: { type: String, required: true },
        postcode: { type: String, required: true },
        country: { type: String, required: true, default: 'IN' }
    },
    
    // Order Status - NO ENUM
    orderStatus: { 
        type: String,
        default: 'pending'
    },
    paymentStatus: { 
        type: String,
        default: 'pending'
    },
    
    // Enhanced Items with Complete Plate Configuration
    items: [{
        // Basic Item Info
        name: { type: String, required: true },
        type: { type: String, required: true }, // NO ENUM
        price: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1 },
        subtotal: { type: Number, required: true, min: 0 },
        
        // Complete Plate Configuration Details
        plateConfiguration: new mongoose.Schema({
            // Text and Spacing
            text: { type: String, required: true },
            spacing: { type: String, default: 'legal' }, // NO ENUM
            displayText: { type: String },
            
            // Physical Properties - NO ENUM
            side: { type: String },
            
            // Size Configuration
            size: new mongoose.Schema({
                key: String,
                label: String,
                dimensions: String
            }, { _id: false }),
            
            // Style Configuration
            plateStyle: new mongoose.Schema({
                key: String,
                label: String,
                font: String,
                fontSize: Number,
                price: Number
            }, { _id: false }),
            
            // Color Configuration
            fontColor: new mongoose.Schema({
                key: String,
                name: String,
                color: String,
                price: Number
            }, { _id: false }),
            
            // Border Configuration
            border: new mongoose.Schema({
                key: String,
                name: String,
                type: String,
                color: String,
                borderWidth: Number,
                price: Number
            }, { _id: false }),
            
            // Country Badge Configuration
            countryBadge: new mongoose.Schema({
                key: String,
                name: String,
                country: String,
                flagImage: String,
                position: String,
                price: Number
            }, { _id: false }),
            
            // Finish Configuration
            finish: new mongoose.Schema({
                key: String,
                label: String,
                description: String,
                price: Number
            }, { _id: false }),
            
            // Additional Options
            thickness: new mongoose.Schema({
                key: String,
                label: String,
                value: Number,
                price: Number
            }, { _id: false }),
            
            // Shadow Effect
            shadowEffect: new mongoose.Schema({
                key: String,
                name: String,
                description: String,
                price: Number
            }, { _id: false }),
            
            // Legal and Compliance - NO ENUM
            roadLegal: { type: String, default: 'No' },
            legalNotes: { type: String }
        }, { _id: false })
    }],
    
    // Enhanced Pricing Breakdown
    pricing: {
        subtotal: { type: Number, required: true },
        discount: { type: Number, default: 0 },
        discountCode: { type: String },
        discountDescription: { type: String },
        shipping: { type: Number, default: 0 },
        shippingMethod: { 
            type: String,
            default: 'tracked'
        },
        tax: { type: Number, required: true },
        taxRate: { type: Number, default: 0.18 },
        total: { type: Number, required: true }
    },
    
    // Payment Information - NO ENUM
    payment: {
        provider: { 
            type: String,
            required: true 
        },
        paypalOrderId: { type: String },
        paypalPaymentId: { type: String },
        worldpayPaymentId: { type: String },
        worldpayTransactionRef: { type: String },
        transactionId: { type: String },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'GBP' }
    },
    
    // Original Cart Data (for restoration if payment fails)
    originalCartData: { type: mongoose.Schema.Types.Mixed },
    
    // Order Timeline
    dates: {
        ordered: { type: Date, required: true, default: Date.now },
        paid: { type: Date },
        processing: { type: Date },
        shipped: { type: Date },
        delivered: { type: Date }
    },
    
    // Additional Information
    notes: { type: String },
    adminNotes: { type: String },
    trackingNumber: { type: String },
    
    // System Fields
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Add indexes for better query performance
orderSchema.index({ orderId: 1 });
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ 'dates.ordered': -1 });

// Add a pre-save middleware to update the updatedAt field
orderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});



// Compound index for efficient queries
configurationSchema.index({ type: 1, key: 1 }, { unique: true });

// Models
const Admin = mongoose.model('Admin', adminSchema);
const CartItem = mongoose.model('CartItem', cartItemSchema);
const Configuration = mongoose.model('Configuration', configurationSchema);
const Order = mongoose.model('Order', orderSchema);

// ===============================
// MIDDLEWARE
// ===============================

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// ===============================
// CART ROUTES (NEW)
// ===============================

// Get cart items for a session
app.get('/api/cart/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const cartItems = await CartItem.find({ sessionId }).sort({ createdAt: -1 });
        res.json({
            success: true,
            data: cartItems
        });
    } catch (error) {
        console.error('Error fetching cart items:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch cart items' 
        });
    }
});

// Add item to cart
app.post('/api/cart', async (req, res) => {
    try {
        const cartItemData = {
            ...req.body,
            subtotal: req.body.price * req.body.quantity,
            updatedAt: new Date()
        };
        
        const cartItem = new CartItem(cartItemData);
        const savedItem = await cartItem.save();
        
        res.status(201).json({
            success: true,
            data: savedItem
        });
    } catch (error) {
        console.error('Error adding item to cart:', error);
        res.status(400).json({ 
            success: false, 
            error: 'Failed to add item to cart' 
        });
    }
});

// Update cart item quantity
app.put('/api/cart/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;
        
        if (quantity < 1) {
            return res.status(400).json({ 
                success: false, 
                error: 'Quantity must be at least 1' 
            });
        }
        
        const cartItem = await CartItem.findById(id);
        if (!cartItem) {
            return res.status(404).json({ 
                success: false, 
                error: 'Cart item not found' 
            });
        }
        
        cartItem.quantity = quantity;
        cartItem.subtotal = cartItem.price * quantity;
        cartItem.updatedAt = new Date();
        
        const updatedItem = await cartItem.save();
        res.json({
            success: true,
            data: updatedItem
        });
    } catch (error) {
        console.error('Error updating cart item:', error);
        res.status(400).json({ 
            success: false, 
            error: 'Failed to update cart item' 
        });
    }
});

// Remove item from cart
app.delete('/api/cart/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedItem = await CartItem.findByIdAndDelete(id);
        
        if (!deletedItem) {
            return res.status(404).json({ 
                success: false, 
                error: 'Cart item not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'Item removed from cart',
            data: deletedItem
        });
    } catch (error) {
        console.error('Error removing cart item:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to remove cart item' 
        });
    }
});

// Clear cart
app.delete('/api/cart/clear/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = await CartItem.deleteMany({ sessionId });
        
        res.json({
            success: true,
            message: `Cleared ${result.deletedCount} items from cart`
        });
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to clear cart' 
        });
    }
});

// Get cart summary
app.get('/api/cart/:sessionId/summary', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const cartItems = await CartItem.find({ sessionId });
        
        const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
        const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        
        res.json({
            success: true,
            data: {
                itemCount,
                subtotal: Math.round(subtotal * 100) / 100,
                items: cartItems
            }
        });
    } catch (error) {
        console.error('Error fetching cart summary:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch cart summary' 
        });
    }
});

// Apply coupon code
app.post('/api/cart/coupon', async (req, res) => {
    try {
        const { code, subtotal } = req.body;
        
        const coupons = {
            'Save15': { discount: 0.15, type: 'percentage', description: '15% off your order' },
            'SAVE5': { discount: 5, type: 'fixed', description: '£5 off your order' },
            'WELCOME10': { discount: 0.10, type: 'percentage', description: '10% off for new customers' }
        };
        
        if (!coupons[code]) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid coupon code' 
            });
        }
        
        const coupon = coupons[code];
        const discountAmount = coupon.type === 'percentage' 
            ? subtotal * coupon.discount 
            : coupon.discount;
        
        res.json({
            success: true,
            data: {
                valid: true,
                code,
                discount: Math.round(discountAmount * 100) / 100,
                type: coupon.type,
                description: coupon.description
            }
        });
    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to apply coupon' 
        });
    }
});

app.post('/api/checkout/create-order', async (req, res) => {
    try {
        const { 
            sessionId, 
            customerInfo, 
            shippingAddress,
            pricing,
            shippingMethod 
        } = req.body;
        
        // Get cart items
        const cartItems = await CartItem.find({ sessionId });
        if (cartItems.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cart is empty' 
            });
        }
        
        // Calculate total (should match frontend calculation)
        const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
        const total = pricing.total;
        
        // Create PayPal order
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
                            currency_code: 'GBP',
                            value: total.toFixed(2),
                            breakdown: {
                                item_total: {
                                    currency_code: 'GBP',
                                    value: subtotal.toFixed(2)
                                },
                                shipping: {
                                    currency_code: 'GBP',
                                    value: pricing.shipping.toFixed(2)
                                },
                                tax_total: {
                                    currency_code: 'GBP',
                                    value: pricing.tax.toFixed(2)
                                },
                                discount: {
                                    currency_code: 'GBP',
                                    value: pricing.discount.toFixed(2)
                                }
                            }
                        },
                        items: cartItems.map(item => ({
                            name: item.name,
                            unit_amount: {
                                currency_code: 'GBP',
                                value: item.price.toFixed(2)
                            },
                            quantity: item.quantity.toString(),
                            description: item.type === 'plate' ? 
                                `${item.registration} - ${item.plateStyle}` : 
                                'Fixing Kit'
                        })),
                        shipping: {
                            name: {
                                full_name: customerInfo.name
                            },
                            address: {
                                address_line_1: shippingAddress.street,
                                admin_area_2: shippingAddress.city,
                                admin_area_1: shippingAddress.state,
                                postal_code: shippingAddress.postcode,
                                country_code: shippingAddress.country === 'United Kingdom' ? 'GB' : 'GB'
                            }
                        }
                    },
                ],
                application_context: {
                    return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/checkout/success`,
                    cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/cart`,
                    shipping_preference: 'SET_PROVIDED_ADDRESS',
                    user_action: 'PAY_NOW'
                },
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        // Store order data temporarily (we'll save it properly when payment is captured)
        const tempOrderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // You might want to store this in a temporary collection or Redis
        // For now, we'll include it in the response
        
        res.json({
            success: true,
            data: {
                paypalOrderId: orderRes.data.id,
                tempOrderId,
                approvalUrl: orderRes.data.links.find(link => link.rel === 'approve')?.href
            }
        });

    } catch (error) {
        console.error('Error creating PayPal order:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to create PayPal order',
            details: error.response?.data || error.message
        });
    }
});

// Capture PayPal payment and create order
app.post('/api/checkout/capture/:paypalOrderId', async (req, res) => {
    try {
        const { paypalOrderId } = req.params;
        const { sessionId, customerInfo, shippingAddress, pricing } = req.body;
        
        // Capture PayPal payment
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
            `https://api-m.sandbox.paypal.com/v2/checkout/orders/${paypalOrderId}/capture`,
            {},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        // If payment successful, create order in database
        if (captureRes.data.status === 'COMPLETED') {
            const cartItems = await CartItem.find({ sessionId });
            const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const order = new Order({
                orderId,
                customerName: customerInfo.name,
                customerEmail: customerInfo.email,
                customerPhone: customerInfo.phone,
                product: `${cartItems.length} items`,
                amount: pricing.total,
                paymentStatus: 'paid',
                dateOfOrder: new Date(),
                items: cartItems.map(item => ({
                    name: item.name,
                    type: item.type,
                    price: item.price,
                    quantity: item.quantity,
                    subtotal: item.subtotal,
                    plateDetails: {
                        side: item.side,
                        registration: item.registration,
                        roadLegal: item.roadLegal,
                        size: item.size,
                        plateStyle: item.plateStyle,
                        fontColor: item.fontColor,
                        borderStyle: item.borderStyle,
                        shadowEffect: item.shadowEffect
                    }
                })),
                pricing,
                paypalOrderId,
                paypalPaymentId: captureRes.data.purchase_units[0].payments.captures[0].id,
                shippingAddress
            });
            
            await order.save();
            
            // Clear cart after successful order
            await CartItem.deleteMany({ sessionId });
            
            res.json({
                success: true,
                data: {
                    orderId,
                    paymentStatus: 'completed',
                    captureData: captureRes.data
                }
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Payment not completed',
                paymentStatus: captureRes.data.status
            });
        }

    } catch (error) {
        console.error('Error capturing PayPal payment:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to capture payment',
            details: error.response?.data || error.message
        });
    }
});

// ===============================
// AUTH ROUTES (existing)
// ===============================

// Admin Registration
app.post('/admin/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }
        
        const existingAdmin = await Admin.findOne({ 
            $or: [{ username }, { email }] 
        });
        
        if (existingAdmin) {
            return res.status(400).json({ error: 'Admin with this username or email already exists' });
        }
        
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const admin = new Admin({
            username,
            email,
            password: hashedPassword
        });
        
        await admin.save();
        
        res.status(201).json({ 
            success: true, 
            message: 'Admin registered successfully',
            admin: { id: admin._id, username: admin.username, email: admin.email }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Admin Login
app.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const isValidPassword = await bcrypt.compare(password, admin.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { id: admin._id, username: admin.username },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            token,
            admin: { id: admin._id, username: admin.username, email: admin.email }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// ===============================
// ALL OTHER EXISTING ROUTES
// (Configuration routes, Order routes, PayPal routes, etc.)
// ===============================

// [Include all your existing configuration routes here]
// Get all configurations by type
app.get('/config/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const configurations = await Configuration.find({ type, isActive: true })
            .sort({ createdAt: 1 });
        
        res.json({
            success: true,
            data: configurations
        });
    } catch (error) {
        console.error('Error fetching configurations:', error);
        res.status(500).json({ error: 'Failed to fetch configurations' });
    }
});

// [Include all other existing routes - configuration CRUD, order management, etc.]

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// ADMIN DASHBOARD ROUTES (MISSING)
// ===============================

// Get all orders for admin dashboard - ADD THIS ROUTE
app.get('/order-details', async (req, res) => {
    try {
        const orders = await Order.find({})
            .sort({ 'dates.ordered': -1 })
            .limit(50); // Limit to latest 50 orders for performance
        
        // Transform orders to match frontend expectations
        const transformedOrders = orders.map(order => ({
            id: order._id,
            orderId: order.orderId, // This will be the new Amazon-style format
            customer: order.customer?.firstName ? 
                `${order.customer.firstName} ${order.customer.lastName}` : 
                order.customerName || 'Unknown Customer',
            product: order.items && order.items.length > 0 ? 
                `${order.items.length} plate(s)` : 
                order.product || 'Number Plate',
            amount: order.pricing?.total || order.amount || 0,
            status: order.paymentStatus || 'pending',
            date: order.dates?.ordered || order.dateOfOrder || order.createdAt
        }));
        
        res.json({
            success: true,
            data: transformedOrders
        });
        
    } catch (error) {
        console.error('Error fetching orders for admin:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch orders'
        });
    }
});

// Get single order details for admin modal - ADD THIS ROUTE
app.get('/order-details/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ orderId });
        
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        
        res.json({
            success: true,
            data: order
        });
        
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order details'
        });
    }
});

// ===============================
// HELPER FUNCTIONS - ADD THESE
// ===============================

// Generate Amazon-style order number (10 digits exactly)
const generateAmazonStyleOrderNumber = () => {
    // Generate three groups of numbers separated by hyphens
    // Format: XXX-XXXXXXX-XXXXXXX (3-7-7 digits)
    const group1 = Math.floor(Math.random() * 900) + 100; // 3 digits (100-999)
    const group2 = Math.floor(Math.random() * 9000000) + 1000000; // 7 digits
    const group3 = Math.floor(Math.random() * 9000000) + 1000000; // 7 digits
    
    return `${group1}-${group2}-${group3}`;
};

// Add these endpoints to your server.js file (before app.listen)

// ===============================
// SIMPLE PAYPAL ROUTES (for cart checkout)
// ===============================

// Simple PayPal order creation (what your frontend is calling)
app.post('/create-paypal-order', async (req, res) => {
    console.log('Received request to create PayPal order');
    
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
                    // Updated return URLs to work with unified success page
                    return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-success`,
                    cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/cart`,
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

// ===============================
// UPDATE PAYPAL CAPTURE ENDPOINT
// ===============================

// REPLACE your existing capture-paypal-order endpoint with this updated version
app.post('/capture-paypal-order/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const { 
        payerId, 
        sessionId, 
        customerInfo, 
        shippingAddress, 
        pricing,
        cartItems
    } = req.body;
    
    try {
        // STEP 1: Check if we already processed this PayPal order
        const existingOrder = await Order.findOne({ 'payment.paypalOrderId': orderId });
        if (existingOrder) {
            console.log('Order already processed:', existingOrder.orderId);
            console.log('Returning existing order details:', JSON.stringify(existingOrder, null, 2));
            return res.json({
                success: true,
                status: 'COMPLETED',
                orderId: existingOrder.orderId,
                paymentId: existingOrder.payment.paypalPaymentId,
                amount: existingOrder.payment.amount,
                currency: existingOrder.payment.currency,
                provider: 'paypal',
                message: 'Order already processed successfully'
            });
        }

        // STEP 2: Get PayPal Access Token
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

        // STEP 3: Try to capture the PayPal order
        let captureRes;
        try {
            captureRes = await axios.post(
                `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`,
                {},
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    },
                }
            );
        } catch (captureError) {
            // Handle "ORDER_ALREADY_CAPTURED" error
            if (captureError.response?.data?.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED') {
                console.log('PayPal order already captured, fetching order details...');
                
                // Fetch the existing order details from PayPal
                try {
                    const orderDetailsRes = await axios.get(
                        `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}`,
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${accessToken}`,
                            },
                        }
                    );
                    
                    captureRes = { data: orderDetailsRes.data };
                } catch (detailsError) {
                    console.error('Error fetching PayPal order details:', detailsError.response?.data);
                    throw captureError; // Re-throw original error
                }
            } else {
                throw captureError; // Re-throw if it's a different error
            }
        }

        console.log('PayPal capture/order response:', captureRes.data);

        // STEP 4: Process the order if payment is completed
        if (captureRes.data.status === 'COMPLETED') {
            try {
                // Generate Amazon-style order number (FIXED)
                const internalOrderId = generateAmazonStyleOrderNumber();
                
                // Extract payment details - handle both capture response and order details response
                let paymentDetails;
                let amount;
                
                if (captureRes.data.purchase_units?.[0]?.payments?.captures?.[0]) {
                    // This is a capture response
                    paymentDetails = captureRes.data.purchase_units[0].payments.captures[0];
                    amount = parseFloat(paymentDetails.amount.value);
                } else if (captureRes.data.purchase_units?.[0]?.amount?.value) {
                    // This is an order details response
                    const purchaseUnit = captureRes.data.purchase_units[0];
                    amount = parseFloat(purchaseUnit.amount.value);
                    paymentDetails = {
                        id: orderId,
                        amount: purchaseUnit.amount,
                        // Create mock payment details structure
                        payee: { email_address: captureRes.data.payer?.email_address }
                    };
                } else {
                    throw new Error('Unable to extract payment details from PayPal response');
                }
                
                // Get cart items or create fallback
                let orderItems = cartItems;
                if (!orderItems && sessionId) {
                    const dbCartItems = await CartItem.find({ sessionId });
                    orderItems = dbCartItems;
                }
                
                // Transform cart items to proper format with correct nested objects
                const enhancedItems = (orderItems || []).map(item => ({
                    name: item.name || 'Number Plate',
                    type: item.type || 'plate',
                    price: item.price || 0,
                    quantity: item.quantity || 1,
                    subtotal: item.subtotal || (item.price * item.quantity) || 0,
                    
                    plateConfiguration: {
                        // Text and Spacing
                        text: item.registration || item.plateDetails?.registration || 'UNKNOWN',
                        spacing: item.spacing || 'legal',
                        displayText: item.displayText || item.registration || 'UNKNOWN',
                        
                        // Physical Properties  
                        side: item.side || item.plateDetails?.side || 'front',
                        
                        // All nested objects properly structured
                        size: {
                            key: item.size || item.plateDetails?.size || 'standard',
                            label: item.sizeLabel || 'Standard Size',
                            dimensions: item.sizeDimensions || '520mm x 111mm'
                        },
                        
                        plateStyle: {
                            key: item.plateStyle || item.plateDetails?.plateStyle || 'standard',
                            label: item.styleLabel || 'Standard Plate',
                            font: item.font || 'Charles Wright',
                            fontSize: item.fontSize || 79,
                            price: item.stylePrice || 0
                        },
                        
                        fontColor: {
                            key: item.fontColor || item.plateDetails?.fontColor || 'black',
                            name: item.fontColorName || 'Black',
                            color: item.fontColor || '#000000',
                            price: item.fontColorPrice || 0
                        },
                        
                        border: {
                            key: item.borderStyle || item.plateDetails?.borderStyle || 'none',
                            name: item.borderName || 'No Border',
                            type: item.borderType || 'none',
                            color: item.borderColor || '',
                            borderWidth: item.borderWidth || 0,
                            price: item.borderPrice || 0
                        },
                        
                        countryBadge: {
                            key: item.countryBadge || 'none',
                            name: item.badgeName || 'No Badge',
                            country: item.selectedCountry || 'uk',
                            flagImage: item.flagImage || '',
                            position: item.badgePosition || 'left',
                            price: item.badgePrice || 0
                        },
                        
                        finish: {
                            key: item.finish || 'standard',
                            label: item.finishLabel || 'Standard Finish',
                            description: item.finishDescription || '',
                            price: item.finishPrice || 0
                        },
                        
                        thickness: {
                            key: item.thickness || '3mm',
                            label: item.thicknessLabel || '3mm Standard',
                            value: item.thicknessValue || 3,
                            price: item.thicknessPrice || 0
                        },
                        
                        shadowEffect: {
                            key: item.shadowEffect || item.plateDetails?.shadowEffect || 'none',
                            name: item.shadowName || 'No Effect',
                            description: item.shadowDescription || '',
                            price: item.shadowPrice || 0
                        },
                        
                        // Legal and Compliance
                        roadLegal: item.roadLegal || item.plateDetails?.roadLegal || 'No',
                        legalNotes: item.roadLegal === 'No' ? 'Show plates only - not for road use' : ''
                    }
                }));

                // If no items, create a fallback item
                if (enhancedItems.length === 0) {
                    enhancedItems.push({
                        name: 'Number Plate',
                        type: 'plate',
                        price: amount,
                        quantity: 1,
                        subtotal: amount,
                        plateConfiguration: {
                            text: 'UNKNOWN',
                            spacing: 'legal',
                            displayText: 'UNKNOWN',
                            side: 'front',
                            size: { key: 'standard', label: 'Standard Size', dimensions: '520mm x 111mm' },
                            plateStyle: { key: 'standard', label: 'Standard Plate', font: 'Charles Wright', fontSize: 79, price: 0 },
                            fontColor: { key: 'black', name: 'Black', color: '#000000', price: 0 },
                            border: { key: 'none', name: 'No Border', type: 'none', color: '', borderWidth: 0, price: 0 },
                            countryBadge: { key: 'none', name: 'No Badge', country: 'uk', flagImage: '', position: 'left', price: 0 },
                            finish: { key: 'standard', label: 'Standard Finish', description: '', price: 0 },
                            thickness: { key: '3mm', label: '3mm Standard', value: 3, price: 0 },
                            shadowEffect: { key: 'none', name: 'No Effect', description: '', price: 0 },
                            roadLegal: 'No',
                            legalNotes: 'Show plates only - not for road use'
                        }
                    });
                }
                
                // Create enhanced order with complete details
                const order = new Order({
                    orderId: internalOrderId, // NOW AMAZON-STYLE FORMAT
                    
                    customer: {
                        firstName: customerInfo?.name?.split(' ')[0] || captureRes.data.payer?.name?.given_name || 'PayPal',
                        lastName: customerInfo?.name?.split(' ')[1] || captureRes.data.payer?.name?.surname || 'Customer',
                        email: customerInfo?.email || captureRes.data.payer?.email_address || 'customer@example.com',
                        phone: customerInfo?.phone || shippingAddress?.phone || '',
                        address: shippingAddress?.street || 'Not provided',
                        city: shippingAddress?.city || 'Not provided',
                        postcode: shippingAddress?.postcode || 'Not provided',
                        country: shippingAddress?.country || 'GB'
                    },
                    
                    orderStatus: 'processing',
                    paymentStatus: 'paid',
                    
                    items: enhancedItems,
                    
                    pricing: {
                        subtotal: pricing?.subtotal || amount,
                        discount: pricing?.discount || 0,
                        discountCode: pricing?.discountCode || '',
                        discountDescription: pricing?.discountDescription || '',
                        shipping: pricing?.shipping || 0,
                        shippingMethod: pricing?.shippingMethod || 'tracked',
                        tax: pricing?.tax || 0,
                        taxRate: pricing?.taxRate || 0.20,
                        total: pricing?.total || amount
                    },
                    
                    shippingAddress: {
                        name: shippingAddress?.name || customerInfo?.name || 'Customer',
                        street: shippingAddress?.street || 'Not provided',
                        city: shippingAddress?.city || 'Not provided',
                        state: shippingAddress?.state || '',
                        postcode: shippingAddress?.postcode || 'Not provided',
                        country: shippingAddress?.country || 'GB',
                        phone: shippingAddress?.phone || customerInfo?.phone || ''
                    },
                    
                    payment: {
                        provider: 'paypal',
                        paypalOrderId: orderId,
                        paypalPaymentId: paymentDetails.id, // THIS IS THE TRANSACTION ID
                        transactionId: paymentDetails.id,  // DUPLICATE FOR CLARITY
                        amount: amount,
                        currency: paymentDetails.amount?.currency_code || 'GBP'
                    },
                    
                    dates: {
                        ordered: new Date(),
                        paid: new Date()
                    },
                    
                    notes: `Order created via PayPal. ${enhancedItems.length} item(s) ordered.`
                });
                
                await order.save();
                console.log('Enhanced order saved successfully:', internalOrderId);
                
                // Clear cart items if sessionId provided
                if (sessionId) {
                    await CartItem.deleteMany({ sessionId });
                    console.log('Cart cleared for session:', sessionId);
                }
                
                console.log("abhishek was here paymentDetails:", paymentDetails);
                // Return success response
                res.json({
                    success: true,
                    status: 'COMPLETED',
                    orderId: internalOrderId, // AMAZON-STYLE ORDER NUMBER
                    paymentId: paymentDetails.id, // PAYPAL TRANSACTION ID
                    amount: amount,
                    currency: paymentDetails.amount?.currency_code || 'GBP',
                    provider: 'paypal',
                    orderDetails: {
                        orderId: internalOrderId,
                        customerName: `${order.customer.firstName} ${order.customer.lastName}`,
                        items: enhancedItems.length,
                        total: amount
                    },
                    captureData: captureRes.data
                });
                
            } catch (dbError) {
                console.error('Error saving enhanced order to database:', dbError);
                // Still return success since PayPal payment was captured
                res.json({
                    success: true,
                    status: 'COMPLETED',
                    warning: 'Payment captured but order saving failed',
                    error: dbError.message,
                    captureData: captureRes.data
                });
            }
        } else {
            res.status(400).json({
                success: false,
                error: 'Payment not completed',
                status: captureRes.data.status,
                details: captureRes.data
            });
        }

    } catch (err) {
        console.error('Error capturing PayPal order:', err.response ? err.response.data : err.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to capture PayPal order',
            details: err.response ? err.response.data : err.message
        });
    }
});

// Additional endpoint to get order details for admin dashboard
app.get('/admin/order-details/:orderId', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ orderId });
        
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        
        res.json({
            success: true,
            data: order
        });
        
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order details'
        });
    }
});

// Get PayPal order details
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

// Step 3: Order Creation Endpoint - Add to your index.js

// Create Order Endpoint (called when user fills checkout form)
app.post('/api/orders/create', async (req, res) => {
    try {
        const { customer, items, pricing, originalCartData } = req.body;
        
        // Validate required fields
        if (!customer || !items || !pricing) {
            return res.status(400).json({
                success: false,
                error: 'Missing required order data'
            });
        }
        
        // Generate internal order ID
        const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log('Creating order:', orderId);
        
        // Create order with pending payment status
        const order = new Order({
            orderId,
            customer,
            orderStatus: 'pending',
            paymentStatus: 'pending',
            items,
            pricing,
            originalCartData: originalCartData || [],
            payment: {
                provider: 'paypal',
                amount: pricing.total,
                currency: 'GBP'
            },
            dates: {
                ordered: new Date()
            },
            notes: `Order created with ${items.length} item(s). Awaiting PayPal payment.`
        });
        
        await order.save();
        console.log('Order created successfully:', orderId);
        
        res.json({
            success: true,
            orderId,
            message: 'Order created successfully'
        });
        
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create order',
            details: error.message
        });
    }
});

// Update Payment Failure Endpoint
app.post('/api/orders/:orderId/payment-failed', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;
        
        const order = await Order.findOneAndUpdate(
            { orderId },
            { 
                paymentStatus: 'failed',
                orderStatus: 'cancelled',
                notes: `Payment failed: ${reason || 'Unknown reason'}`,
                updatedAt: new Date()
            },
            { new: true }
        );
        
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        
        console.log('Order payment failed:', orderId);
        
        // Return original cart data for restoration
        res.json({
            success: true,
            originalCartData: order.originalCartData,
            message: 'Payment failed, cart data available for restoration'
        });
        
    } catch (error) {
        console.error('Error updating payment failure:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update payment failure status'
        });
    }
});

// Get Order Details Endpoint
app.get('/api/orders/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const order = await Order.findOne({ orderId });
        
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        
        res.json({
            success: true,
            order
        });
        
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order'
        });
    }
});

// Get All Orders for Admin (with pagination and filtering)
app.get('/api/admin/orders', authenticateToken, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            status, 
            paymentStatus,
            search 
        } = req.query;
        
        // Build filter query
        const filter = {};
        if (status) filter.orderStatus = status;
        if (paymentStatus) filter.paymentStatus = paymentStatus;
        if (search) {
            filter.$or = [
                { orderId: { $regex: search, $options: 'i' } },
                { 'customer.firstName': { $regex: search, $options: 'i' } },
                { 'customer.lastName': { $regex: search, $options: 'i' } },
                { 'customer.email': { $regex: search, $options: 'i' } }
            ];
        }
        
        // Execute query with pagination
        const orders = await Order.find(filter)
            .sort({ 'dates.ordered': -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();
        
        const totalOrders = await Order.countDocuments(filter);
        
        res.json({
            success: true,
            orders,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalOrders / limit),
                totalOrders,
                hasNext: page < Math.ceil(totalOrders / limit),
                hasPrev: page > 1
            }
        });
        
    } catch (error) {
        console.error('Error fetching admin orders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch orders'
        });
    }
});

// Update Order Status (Admin only)
app.patch('/api/admin/orders/:orderId/status', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { orderStatus, adminNotes, trackingNumber } = req.body;
        
        const updateData = {
            updatedAt: new Date()
        };
        
        if (orderStatus) {
            updateData.orderStatus = orderStatus;
            
            // Update timeline dates based on status
            if (orderStatus === 'processing' && !updateData['dates.processing']) {
                updateData['dates.processing'] = new Date();
            } else if (orderStatus === 'shipped' && !updateData['dates.shipped']) {
                updateData['dates.shipped'] = new Date();
            } else if (orderStatus === 'delivered' && !updateData['dates.delivered']) {
                updateData['dates.delivered'] = new Date();
            }
        }
        
        if (adminNotes) updateData.adminNotes = adminNotes;
        if (trackingNumber) updateData.trackingNumber = trackingNumber;
        
        const order = await Order.findOneAndUpdate(
            { orderId },
            updateData,
            { new: true }
        );
        
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        
        console.log('Order status updated:', orderId, orderStatus);
        
        res.json({
            success: true,
            message: 'Order updated successfully',
            order
        });
        
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update order status'
        });
    }
});

// Get Order Details Endpoint
app.get('/api/orders/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const order = await Order.findOne({ orderId });
        
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        
        res.json({
            success: true,
            order
        });
        
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order'
        });
    }
});

// Enhanced PayPal Capture Endpoint (simplified - uses existing order)
app.post('/capture-paypal-order/:paypalOrderId', async (req, res) => {
    const { paypalOrderId } = req.params;
    
    try {
        // Step 1: Find existing order by PayPal order ID
        const existingOrder = await Order.findOne({ 'payment.paypalOrderId': paypalOrderId });
        if (!existingOrder) {
            return res.status(404).json({
                success: false,
                error: 'Order not found for this PayPal transaction'
            });
        }

        // Step 2: Check if already processed
        if (existingOrder.paymentStatus === 'paid') {
            console.log('Order already processed:', existingOrder.orderId);
            console.log('Returning existing order details:', JSON.stringify(existingOrder, null, 2));
            return res.json({
                success: true,
                status: 'COMPLETED',
                orderId: existingOrder.orderId,
                paymentId: existingOrder.payment.paypalPaymentId,
                amount: existingOrder.payment.amount,
                currency: existingOrder.payment.currency,
                message: 'Order already processed successfully'
            });
        }

        // Step 3: Capture PayPal payment
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

        let captureRes;
        try {
            captureRes = await axios.post(
                `https://api-m.sandbox.paypal.com/v2/checkout/orders/${paypalOrderId}/capture`,
                {},
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    },
                }
            );
        } catch (captureError) {
            // Handle "ORDER_ALREADY_CAPTURED" error
            if (captureError.response?.data?.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED') {
                console.log('PayPal order already captured, fetching order details...');
                
                const orderDetailsRes = await axios.get(
                    `https://api-m.sandbox.paypal.com/v2/checkout/orders/${paypalOrderId}`,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`,
                        },
                    }
                );
                
                captureRes = { data: orderDetailsRes.data };
            } else {
                throw captureError;
            }
        }

        console.log('PayPal capture/order response:', captureRes.data);

        // Step 4: Process the order if payment is completed
        if (captureRes.data.status === 'COMPLETED') {
            // Extract payment details
            let paymentDetails;
            let amount;
            
            if (captureRes.data.purchase_units?.[0]?.payments?.captures?.[0]) {
                paymentDetails = captureRes.data.purchase_units[0].payments.captures[0];
                amount = parseFloat(paymentDetails.amount.value);
            } else if (captureRes.data.purchase_units?.[0]?.amount?.value) {
                const purchaseUnit = captureRes.data.purchase_units[0];
                amount = parseFloat(purchaseUnit.amount.value);
                paymentDetails = {
                    id: paypalOrderId,
                    amount: purchaseUnit.amount
                };
            } else {
                throw new Error('Unable to extract payment details from PayPal response');
            }
            
            // Update order status to paid
            await Order.findOneAndUpdate(
                { orderId: existingOrder.orderId },
                { 
                    paymentStatus: 'paid',
                    orderStatus: 'processing',
                    'payment.paypalPaymentId': paymentDetails.id,
                    'payment.transactionId': paymentDetails.id,
                    'payment.amount': amount,
                    'dates.paid': new Date(),
                    updatedAt: new Date()
                }
            );
            
            console.log('Order payment completed:', existingOrder.orderId);
            
            // Return success response
            res.json({
                success: true,
                status: 'COMPLETED',
                orderId: existingOrder.orderId,
                paymentId: paymentDetails.id,
                amount: amount,
                currency: paymentDetails.amount?.currency_code || 'GBP',
                captureData: captureRes.data
            });
            
        } else {
            res.status(400).json({
                success: false,
                error: 'Payment not completed',
                status: captureRes.data.status,
                details: captureRes.data
            });
        }

    } catch (err) {
        console.error('Error capturing PayPal order:', err.response ? err.response.data : err.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to capture PayPal order',
            details: err.response ? err.response.data : err.message
        });
    }
});

// Update Order with PayPal Order ID
app.patch('/api/orders/:orderId/paypal', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { paypalOrderId } = req.body;
        
        const order = await Order.findOneAndUpdate(
            { orderId },
            { 
                'payment.paypalOrderId': paypalOrderId,
                updatedAt: new Date()
            },
            { new: true }
        );
        
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        
        console.log('Order updated with PayPal ID:', orderId, paypalOrderId);
        
        res.json({
            success: true,
            message: 'Order updated with PayPal ID'
        });
        
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update order'
        });
    }
});

// Update Payment Success Endpoint (simplified - only updates status)
app.post('/api/orders/:orderId/payment-success', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { paypalPaymentId, paypalCaptureData } = req.body;
        
        const order = await Order.findOneAndUpdate(
            { orderId },
            { 
                paymentStatus: 'paid',
                orderStatus: 'processing',
                'payment.paypalPaymentId': paypalPaymentId,
                'payment.transactionId': paypalPaymentId,
                'dates.paid': new Date(),
                updatedAt: new Date()
            },
            { new: true }
        );
        
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        
        console.log('Order payment completed:', orderId);
        
        res.json({
            success: true,
            order: {
                orderId: order.orderId,
                customerName: `${order.customer.firstName} ${order.customer.lastName}`,
                amount: order.payment.amount,
                currency: order.payment.currency,
                paymentId: paypalPaymentId,
                status: 'paid'
            }
        });
        
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update payment status'
        });
    }
});

// [Include all your existing PayPal routes and order routes]

// ===============================
// WORLDPAY INTEGRATION ENDPOINTS
// ===============================

// Worldpay configuration
const WORLDPAY_CONFIG = {
  test: {
    url: 'https://try.access.worldpay.com',
    username: process.env.WORLDPAY_TEST_USERNAME || 'merchant.test',
    password: process.env.WORLDPAY_TEST_PASSWORD || 'test'
  },
  live: {
    url: 'https://access.worldpay.com',
    username: process.env.WORLDPAY_LIVE_USERNAME,
    password: process.env.WORLDPAY_LIVE_PASSWORD
  }
};

const isProduction = process.env.NODE_ENV === 'production';
const worldpayConfig = isProduction ? WORLDPAY_CONFIG.live : WORLDPAY_CONFIG.test;

const getWorldpayAuthHeader = () => {
  const credentials = Buffer.from(`${worldpayConfig.username}:${worldpayConfig.password}`).toString('base64');
  return `Basic ${credentials}`;
};


// Helper function to generate unique transaction reference
const generateTransactionReference = () => {
    return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Create Worldpay payment (replaces create-paypal-order)
app.post('/create-worldpay-payment', async (req, res) => {
    console.log('Received request to create Worldpay payment');
    
    const { amount, currency = 'GBP', customerInfo, orderDetails } = req.body;
    
    if (!amount) {
        return res.status(400).json({ error: 'Amount is required' });
    }
    
    try {
        const transactionReference = generateTransactionReference();
        
        // Convert amount to pence (Worldpay uses smallest currency unit)
        const amountInPence = Math.round(parseFloat(amount) * 100);
        
        const worldpayPayload = {
            transactionReference: transactionReference,
            channel: "ecom",
            merchant: {
                entity: "default"
            },
            instruction: {
                requestAutoSettlement: {
                    enabled: true // Auto-settle the payment
                },
                narrative: {
                    line1: "Number Plates Purchase",
                    line2: customerInfo?.name || "Customer"
                },
                value: {
                    currency: currency,
                    amount: amountInPence
                },
                paymentInstrument: {
                    type: "card/plain",
                    // Note: In a real hosted payment page integration,
                    // card details would be collected on Worldpay's secure form
                    // This is just for API structure demonstration
                }
            },
            order: {
                orderDate: {
                    day: new Date().getDate(),
                    month: new Date().getMonth() + 1,
                    year: new Date().getFullYear()
                },
                items: orderDetails?.items || [{
                    name: "Number Plates",
                    quantity: orderDetails?.quantity || 1,
                    unitPrice: amountInPence,
                    totalAmount: amountInPence
                }]
            }
        };

        console.log('Worldpay payload:', JSON.stringify(worldpayPayload, null, 2));

        const response = await axios.post(
            // `${worldpayConfig.url}/cardPayments/customerInitiatedTransactions`,
            `${worldpayConfig.url}/api/payments`,
            worldpayPayload,
            {
                headers: {
                    'Authorization': getWorldpayAuthHeader(),
                    'Content-Type': 'application/vnd.worldpay.payments-v7+json',
                    'Accept': 'application/vnd.worldpay.payments-v7+json'
                }
            }
        );

        console.log('Worldpay response:', response.data);

        // For hosted payment pages, Worldpay typically returns a redirect URL
        // Since we're using Direct API, we'll need to handle the response differently
        if (response.data.outcome === 'authorized') {
            res.json({
                success: true,
                paymentId: response.data.paymentId,
                transactionReference: transactionReference,
                status: 'authorized',
                // For redirect flow, you'd typically get a redirect URL here
                redirectUrl: `http://localhost:5173/payment-success?paymentId=${response.data.paymentId}&transactionRef=${transactionReference}`,
                worldpayResponse: response.data
            });
        } else {
            throw new Error(`Payment not authorized: ${response.data.outcome}`);
        }

    } catch (error) {
        console.error('Error creating Worldpay payment:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to create Worldpay payment',
            details: error.response?.data || error.message
        });
    }
});

// Verify Worldpay payment status (replaces capture-paypal-order)
app.post('/verify-worldpay-payment/:paymentId', async (req, res) => {
    const { paymentId } = req.params;
    const { transactionReference } = req.body;
    
    try {
        console.log(`Verifying Worldpay payment: ${paymentId}`);

        // Query payment status
        const response = await axios.get(
            `${worldpayConfig.url}/payments/events/${paymentId}`,
            {
                headers: {
                    'Authorization': getWorldpayAuthHeader(),
                    'Accept': 'application/vnd.worldpay.payments-v7+json'
                }
            }
        );

        console.log('Worldpay verification response:', response.data);

        // Check if payment is completed
        const isPaymentCompleted = response.data.outcome === 'authorized' || 
                                 response.data.outcome === 'Sent for Settlement';

        if (isPaymentCompleted) {
            // Create order in your database
            const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // You can expand this to save more detailed order information
            const orderData = {
                orderId,
                paymentId,
                transactionReference,
                amount: response.data.instruction?.value?.amount / 100, // Convert back from pence
                currency: response.data.instruction?.value?.currency,
                paymentStatus: 'completed',
                provider: 'worldpay',
                dateOfOrder: new Date(),
                customerName: req.body.customerInfo?.name || 'Customer',
                worldpayData: response.data
            };

            console.log('Order created:', orderId);

            res.json({
                success: true,
                status: 'COMPLETED',
                orderId,
                paymentId,
                paymentData: response.data
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Payment not completed',
                status: response.data.outcome
            });
        }

    } catch (error) {
        console.error('Error verifying Worldpay payment:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to verify Worldpay payment',
            details: error.response?.data || error.message
        });
    }
});

// Get Worldpay payment details (replaces paypal-order endpoint)
app.get('/worldpay-payment/:paymentId', async (req, res) => {
    const { paymentId } = req.params;
    
    try {
        const response = await axios.get(
            `${worldpayConfig.url}/payments/events/${paymentId}`,
            {
                headers: {
                    'Authorization': getWorldpayAuthHeader(),
                    'Accept': 'application/vnd.worldpay.payments-v7+json'
                }
            }
        );

        res.json({
            success: true,
            payment: response.data
        });

    } catch (error) {
        console.error('Error fetching Worldpay payment:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch Worldpay payment',
            details: error.response?.data || error.message
        });
    }
});

// Webhook endpoint for Worldpay notifications (optional but recommended)
app.post('/worldpay-webhook', async (req, res) => {
    try {
        console.log('Worldpay webhook received:', req.body);
        
        // Process webhook data
        const { paymentId, transactionReference, outcome } = req.body;
        
        // Update order status in your database based on webhook
        // This ensures you're notified of any payment status changes
        
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Health check for Worldpay integration
app.get('/worldpay-health', (req, res) => {
    res.json({ 
        status: 'ok', 
        provider: 'worldpay',
        environment: isProduction ? 'live' : 'test',
        endpoint: worldpayConfig.url
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});