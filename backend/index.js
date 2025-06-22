// const express = require('express');
// const cors = require('cors');
// const axios = require('axios');
// const mongoose = require('mongoose');
// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');
// require('dotenv').config();

// const app = express();
// const PORT = 5000;

// app.use(cors());
// app.use(express.json());

// // MongoDB connection
// mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/numberplates', {})
// .then(() => console.log('Connected to MongoDB'))
// .catch(err => console.error('MongoDB connection error:', err));

// // ===============================
// // SCHEMAS
// // ===============================

// // Admin User Schema
// const adminSchema = new mongoose.Schema({
//     username: { type: String, required: true, unique: true },
//     email: { type: String, required: true, unique: true },
//     password: { type: String, required: true },
//     createdAt: { type: Date, default: Date.now }
// });

// // Configuration Schema (unified approach for less storage)
// const configurationSchema = new mongoose.Schema({
//     type: { 
//         type: String, 
//         required: true,
//         enum: ['plateStyle', 'thickness', 'color', 'shadow', 'border', 'size', 'finish', 'country', 'flag']
//     },
//     key: { type: String, required: true },
//     label: { type: String, required: true },
//     price: { type: Number, required: true, min: 0 },
//     description: { type: String },
    
//     // Plate Style specific fields
//     font: { type: String },
//     fontUrl: { type: String },
//     fontSize: { type: Number },
    
//     // Color specific fields
//     color: { type: String },
//     name: { type: String },
    
//     // Thickness specific fields
//     value: { type: Number },
    
//     // Border specific fields
//     borderColor: { type: String },
    
//     // Size specific fields
//     dimensions: { type: String },
    
//     // Flag specific fields
//     text: { type: String },
//     flagImage: { type: String },
//     parentCountry: { type: String }, // for flag options
    
//     // Common fields
//     isActive: { type: Boolean, default: true },
//     createdAt: { type: Date, default: Date.now },
//     updatedAt: { type: Date, default: Date.now }
// });

// // Compound index for efficient queries
// configurationSchema.index({ type: 1, key: 1 }, { unique: true });

// // Order Schema (existing)
// const orderSchema = new mongoose.Schema({
//     orderId: { type: String, required: true },
//     customerName: { type: String, required: true },
//     product: { type: String, required: true },
//     amount: { type: Number, required: true },
//     paymentStatus: { type: String, required: true },
//     dateOfOrder: { type: Date, required: true },
//     shippingAddress: {
//         street: { type: String, required: true },
//         city: { type: String, required: true },
//         state: { type: String, required: true },
//         pincode: { type: String, required: true },
//         country: { type: String, required: true },
//         phone: { type: String, required: true }
//     }
// });

// // Models
// const Admin = mongoose.model('Admin', adminSchema);
// const Configuration = mongoose.model('Configuration', configurationSchema);
// const Order = mongoose.model('Order', orderSchema);

// // ===============================
// // MIDDLEWARE
// // ===============================

// // JWT Authentication Middleware
// const authenticateToken = (req, res, next) => {
//     const authHeader = req.headers['authorization'];
//     const token = authHeader && authHeader.split(' ')[1];
    
//     if (!token) {
//         return res.status(401).json({ error: 'Access token required' });
//     }
    
//     jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
//         if (err) {
//             return res.status(403).json({ error: 'Invalid or expired token' });
//         }
//         req.user = user;
//         next();
//     });
// };

// // ===============================
// // AUTH ROUTES
// // ===============================

// // Admin Registration
// app.post('/admin/register', async (req, res) => {
//     try {
//         const { username, email, password } = req.body;
        
//         if (!username || !email || !password) {
//             return res.status(400).json({ error: 'Username, email, and password are required' });
//         }
        
//         // Check if admin already exists
//         const existingAdmin = await Admin.findOne({ 
//             $or: [{ username }, { email }] 
//         });
        
//         if (existingAdmin) {
//             return res.status(400).json({ error: 'Admin with this username or email already exists' });
//         }
        
//         // Hash password
//         const saltRounds = 10;
//         const hashedPassword = await bcrypt.hash(password, saltRounds);
        
//         // Create admin
//         const admin = new Admin({
//             username,
//             email,
//             password: hashedPassword
//         });
        
//         await admin.save();
        
//         res.status(201).json({ 
//             success: true, 
//             message: 'Admin registered successfully',
//             admin: { id: admin._id, username: admin.username, email: admin.email }
//         });
        
//     } catch (error) {
//         console.error('Registration error:', error);
//         res.status(500).json({ error: 'Registration failed' });
//     }
// });

// // Admin Login
// app.post('/admin/login', async (req, res) => {
//     try {
//         const { username, password } = req.body;
        
//         if (!username || !password) {
//             return res.status(400).json({ error: 'Username and password are required' });
//         }
        
//         // Find admin
//         const admin = await Admin.findOne({ username });
//         console.log('Admin found:', admin);
//         if (!admin) {
//             console.log('Admin not found for username:', username);
//             return res.status(401).json({ error: 'Invalid credentials' });
//         }
        
//         // Check password
//         const isValidPassword = await bcrypt.compare(password, admin.password);
//         if (!isValidPassword) {
//             return res.status(401).json({ error: 'Invalid credentials' });
//         }
        
//         // Generate JWT token (7 days)
//         const token = jwt.sign(
//             { id: admin._id, username: admin.username },
//             process.env.JWT_SECRET || 'your-secret-key',
//             { expiresIn: '7d' }
//         );
        
//         res.json({
//             success: true,
//             token,
//             admin: { id: admin._id, username: admin.username, email: admin.email }
//         });
        
//     } catch (error) {
//         console.error('Login error:', error);
//         res.status(500).json({ error: 'Login failed' });
//     }
// });

// // ===============================
// // CONFIGURATION ROUTES
// // ===============================

// // Get all configurations by type
// app.get('/config/:type', async (req, res) => {
//     try {
//         const { type } = req.params;
//         const configurations = await Configuration.find({ type, isActive: true })
//             .sort({ createdAt: 1 });
        
//         res.json({
//             success: true,
//             data: configurations
//         });
//     } catch (error) {
//         console.error('Error fetching configurations:', error);
//         res.status(500).json({ error: 'Failed to fetch configurations' });
//     }
// });

// // Get all configurations (for admin panel)
// app.get('/admin/configurations', authenticateToken, async (req, res) => {
//     try {
//         const configurations = await Configuration.find({})
//             .sort({ type: 1, createdAt: 1 });
        
//         // Group by type
//         const groupedConfigs = configurations.reduce((acc, config) => {
//             if (!acc[config.type]) {
//                 acc[config.type] = [];
//             }
//             acc[config.type].push(config);
//             return acc;
//         }, {});
        
//         res.json({
//             success: true,
//             data: groupedConfigs
//         });
//     } catch (error) {
//         console.error('Error fetching admin configurations:', error);
//         res.status(500).json({ error: 'Failed to fetch configurations' });
//     }
// });

// // Update single configuration
// app.put('/admin/configurations/:id', authenticateToken, async (req, res) => {
//     try {
//         const { id } = req.params;
//         const updateData = { ...req.body, updatedAt: new Date() };
        
//         // Validate price
//         if (updateData.price !== undefined && updateData.price < 0) {
//             return res.status(400).json({ error: 'Price cannot be negative' });
//         }
        
//         const oldConfig = await Configuration.findById(id);
//         if (!oldConfig) {
//             return res.status(404).json({ error: 'Configuration not found' });
//         }
        
//         const updatedConfig = await Configuration.findByIdAndUpdate(
//             id, 
//             updateData, 
//             { new: true, runValidators: true }
//         );
        
//         res.json({
//             success: true,
//             data: updatedConfig,
//             previous: { price: oldConfig.price },
//             updated: { price: updatedConfig.price }
//         });
//     } catch (error) {
//         console.error('Error updating configuration:', error);
//         res.status(500).json({ error: 'Failed to update configuration' });
//     }
// });

// // Bulk update configurations
// app.put('/admin/configurations/bulk', authenticateToken, async (req, res) => {
//     try {
//         const { ids, updateType, value, percentage } = req.body;
        
//         if (!ids || !Array.isArray(ids) || ids.length === 0) {
//             return res.status(400).json({ error: 'IDs array is required' });
//         }
        
//         // Get current configurations
//         const currentConfigs = await Configuration.find({ _id: { $in: ids } });
//         const updates = [];
        
//         for (const config of currentConfigs) {
//             let newPrice = config.price;
            
//             switch (updateType) {
//                 case 'fixed_increase':
//                     newPrice = Math.max(0, config.price + parseFloat(value));
//                     break;
//                 case 'fixed_decrease':
//                     newPrice = Math.max(0, config.price - parseFloat(value));
//                     break;
//                 case 'percentage_increase':
//                     newPrice = Math.max(0, config.price * (1 + parseFloat(percentage) / 100));
//                     break;
//                 case 'percentage_decrease':
//                     newPrice = Math.max(0, config.price * (1 - parseFloat(percentage) / 100));
//                     break;
//                 case 'set_price':
//                     newPrice = Math.max(0, parseFloat(value));
//                     break;
//                 default:
//                     return res.status(400).json({ error: 'Invalid update type' });
//             }
            
//             // Round to 2 decimal places
//             newPrice = Math.round(newPrice * 100) / 100;
            
//             updates.push({
//                 updateOne: {
//                     filter: { _id: config._id },
//                     update: { 
//                         price: newPrice, 
//                         updatedAt: new Date() 
//                     }
//                 }
//             });
//         }
        
//         // Perform bulk update
//         await Configuration.bulkWrite(updates);
        
//         // Get updated configurations
//         const updatedConfigs = await Configuration.find({ _id: { $in: ids } });
        
//         res.json({
//             success: true,
//             message: `Successfully updated ${updatedConfigs.length} configurations`,
//             data: updatedConfigs
//         });
//     } catch (error) {
//         console.error('Error bulk updating configurations:', error);
//         res.status(500).json({ error: 'Failed to perform bulk update' });
//     }
// });

// // Add new configuration
// app.post('/admin/configurations', authenticateToken, async (req, res) => {
//     try {
//         const configData = { ...req.body };
        
//         // Validate price
//         if (configData.price < 0) {
//             return res.status(400).json({ error: 'Price cannot be negative' });
//         }
        
//         const configuration = new Configuration(configData);
//         await configuration.save();
        
//         res.status(201).json({
//             success: true,
//             data: configuration
//         });
//     } catch (error) {
//         console.error('Error creating configuration:', error);
//         if (error.code === 11000) {
//             res.status(400).json({ error: 'Configuration with this type and key already exists' });
//         } else {
//             res.status(500).json({ error: 'Failed to create configuration' });
//         }
//     }
// });

// // Delete configuration
// app.delete('/admin/configurations/:id', authenticateToken, async (req, res) => {
//     try {
//         const { id } = req.params;
        
//         // Soft delete by setting isActive to false
//         const deletedConfig = await Configuration.findByIdAndUpdate(
//             id,
//             { isActive: false, updatedAt: new Date() },
//             { new: true }
//         );
        
//         if (!deletedConfig) {
//             return res.status(404).json({ error: 'Configuration not found' });
//         }
        
//         res.json({
//             success: true,
//             message: 'Configuration deleted successfully'
//         });
//     } catch (error) {
//         console.error('Error deleting configuration:', error);
//         res.status(500).json({ error: 'Failed to delete configuration' });
//     }
// });

// // ===============================
// // EXISTING ROUTES (Orders & PayPal)
// // ===============================

// app.get('/health', (req, res) => {
//     res.json({ status: 'ok' });
// });

// // Get all orders
// app.get('/order-details', async (req, res) => {
//     try {
//         console.log('Attempting to fetch orders...');
//         const { includeAddress } = req.query;
        
//         const db = mongoose.connection.db;
//         const rawOrders = await db.collection('orders').find({}).toArray();
//         console.log('Raw orders from collection:', rawOrders);
//         console.log('Raw orders count:', rawOrders.length);
        
//         const orders = await Order.find({}).sort({ dateOfOrder: -1 });
//         console.log('Mongoose orders:', orders);
//         console.log('Mongoose orders count:', orders.length);
        
//         const dataToUse = orders.length > 0 ? orders : rawOrders;
        
//         const formattedOrders = dataToUse.map(order => {
//             const baseOrder = {
//                 id: order._id,
//                 orderId: order.orderId,
//                 customer: order.customerName,
//                 product: order.product,
//                 amount: order.amount,
//                 status: order.paymentStatus,
//                 date: order.dateOfOrder
//             };
            
//             if (includeAddress === 'true') {
//                 baseOrder.shippingAddress = order.shippingAddress;
//             }
            
//             return baseOrder;
//         });
        
//         console.log('Formatted orders:', formattedOrders);
        
//         res.json({
//             success: true,
//             data: formattedOrders
//         });
//     } catch (error) {
//         console.error('Error fetching orders:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to fetch orders',
//             message: error.message
//         });
//     }
// });

// // Get single order details
// app.get('/order-details/:orderId', async (req, res) => {
//     try {
//         const { orderId } = req.params;
//         console.log('Fetching single order with ID:', orderId);
        
//         const db = mongoose.connection.db;
//         const order = await db.collection('orders').findOne({ orderId: orderId });
        
//         console.log('Found order:', order);
        
//         if (!order) {
//             console.log('Order not found for ID:', orderId);
//             return res.status(404).json({
//                 success: false,
//                 error: 'Order not found'
//             });
//         }
        
//         const formattedOrder = {
//             id: order._id,
//             orderId: order.orderId,
//             customer: order.customerName,
//             product: order.product,
//             amount: order.amount,
//             status: order.paymentStatus,
//             date: order.dateOfOrder,
//             shippingAddress: order.shippingAddress
//         };
        
//         console.log('Sending formatted order:', formattedOrder);
        
//         res.json({
//             success: true,
//             data: formattedOrder
//         });
//     } catch (error) {
//         console.error('Error fetching single order:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to fetch order details',
//             message: error.message
//         });
//     }
// });

// // PayPal routes (existing)
// app.post('/create-paypal-order', async (req, res) => {
//     console.log('Received request to create PayPal order');
    
//     const { amount, currency = 'GBP' } = req.body;
    
//     if (!amount) {
//         return res.status(400).json({ error: 'Amount is required' });
//     }
    
//     try {
//         const auth = Buffer.from(
//             `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET_KEY}`
//         ).toString('base64');

//         const tokenRes = await axios.post(
//             'https://api-m.sandbox.paypal.com/v1/oauth2/token',
//             'grant_type=client_credentials',
//             {
//                 headers: {
//                     'Content-Type': 'application/x-www-form-urlencoded',
//                     'Authorization': `Basic ${auth}`,
//                 },
//             }
//         );

//         const accessToken = tokenRes.data.access_token;

//         const orderRes = await axios.post(
//             'https://api-m.sandbox.paypal.com/v2/checkout/orders',
//             {
//                 intent: 'CAPTURE',
//                 purchase_units: [
//                     {
//                         amount: {
//                             currency_code: currency,
//                             value: amount.toString(),
//                         },
//                     },
//                 ],
//                 application_context: {
//                     return_url: 'http://localhost:5173/platebuilder#',
//                     cancel_url: 'http://localhost:5173/platebuilder#',
//                 },
//             },
//             {
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${accessToken}`,
//                 },
//             }
//         );

//         res.json(orderRes.data);
//     } catch (err) {
//         console.error('Error creating PayPal order:', err.response ? err.response.data : err.message);
//         res.status(500).json({ 
//             error: 'Failed to create PayPal order',
//             details: err.response ? err.response.data : err.message
//         });
//     }
// });

// app.post('/capture-paypal-order/:orderId', async (req, res) => {
//     const { orderId } = req.params;
//     try {
//         const auth = Buffer.from(
//             `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET_KEY}`
//         ).toString('base64');

//         const tokenRes = await axios.post(
//             'https://api-m.sandbox.paypal.com/v1/oauth2/token',
//             'grant_type=client_credentials',
//             {
//                 headers: {
//                     'Content-Type': 'application/x-www-form-urlencoded',
//                     'Authorization': `Basic ${auth}`,
//                 },
//             }
//         );

//         const accessToken = tokenRes.data.access_token;

//         const captureRes = await axios.post(
//             `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`,
//             {},
//             {
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${accessToken}`,
//                 },
//             }
//         );

//         res.json(captureRes.data);
//     } catch (err) {
//         console.error('Error capturing PayPal order:', err.response ? err.response.data : err.message);
//         res.status(500).json({ 
//             error: 'Failed to capture PayPal order',
//             details: err.response ? err.response.data : err.message
//         });
//     }
// });

// app.get('/paypal-order/:orderId', async (req, res) => {
//     const { orderId } = req.params;
//     try {
//         const auth = Buffer.from(
//             `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET_KEY}`
//         ).toString('base64');

//         const tokenRes = await axios.post(
//             'https://api-m.sandbox.paypal.com/v1/oauth2/token',
//             'grant_type=client_credentials',
//             {
//                 headers: {
//                     'Content-Type': 'application/x-www-form-urlencoded',
//                     'Authorization': `Basic ${auth}`,
//                 },
//             }
//         );

//         const accessToken = tokenRes.data.access_token;

//         const orderRes = await axios.get(
//             `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}`,
//             {
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${accessToken}`,
//                 },
//             }
//         );

//         res.json(orderRes.data);
//     } catch (err) {
//         console.error('Error fetching PayPal order:', err.response ? err.response.data : err.message);
//         res.status(500).json({ 
//             error: 'Failed to fetch PayPal order',
//             details: err.response ? err.response.data : err.message
//         });
//     }
// });

// app.listen(PORT, () => {
//     console.log(`Server running on http://localhost:${PORT}`);
// });



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

// Order Schema (updated to include cart data)
const orderSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    customerEmail: String,
    customerPhone: String,
    product: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentStatus: { type: String, required: true },
    dateOfOrder: { type: Date, required: true },
    
    // Cart items included in the order
    items: [{
        name: String,
        type: String,
        price: Number,
        quantity: Number,
        subtotal: Number,
        plateDetails: {
            side: String,
            registration: String,
            roadLegal: String,
            size: String,
            plateStyle: String,
            fontColor: String,
            borderStyle: String,
            shadowEffect: String
        }
    }],
    
    // Pricing breakdown
    pricing: {
        subtotal: Number,
        discount: Number,
        discountCode: String,
        shipping: Number,
        shippingMethod: String,
        tax: Number,
        total: Number
    },
    
    // PayPal specific data
    paypalOrderId: String,
    paypalPaymentId: String,
    
    shippingAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        country: { type: String, required: true },
        phone: { type: String, required: true }
    }
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

// ===============================
// PAYPAL CHECKOUT INTEGRATION (UPDATED)
// ===============================

// Create PayPal order from cart
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
                    return_url: 'http://localhost:5173/payment-success',
                    cancel_url: 'http://localhost:5173/cart',
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

// Capture PayPal payment
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
// [Include all your existing PayPal routes and order routes]

// ===============================
// WORLDPAY INTEGRATION ENDPOINTS
// ===============================

// Worldpay configuration
const WORLDPAY_CONFIG = {
    test: {
        url: 'https://try.access.worldpay.com',
        // You'll need to replace these with your actual test credentials
        username: 'your_test_username',
        password: 'your_test_password'
    },
    live: {
        url: 'https://access.worldpay.com',
        // You'll need to replace these with your actual live credentials
        username: 'your_live_username', 
        password: 'your_live_password'
    }
};

// Use test environment for now
const isProduction = process.env.NODE_ENV === 'production';
const worldpayConfig = isProduction ? WORLDPAY_CONFIG.live : WORLDPAY_CONFIG.test;

// Helper function to create Worldpay auth header
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
            `${worldpayConfig.url}/cardPayments/customerInitiatedTransactions`,
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