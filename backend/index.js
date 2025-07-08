const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const passport = require('passport');
const OAuth2Strategy = require('passport-google-oauth2').Strategy;
const session = require('express-session');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());


// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: process.env.NODE_ENV === 'production' 
    ? {
        secure: true,
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000
      }
    : {
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      }
};

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// Cookie configuration helper
const getCookieConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000
    };
  } else {
    return {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    };
  }
};

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

const cartSessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    items: [{
        id: { type: String, required: true },
        name: { type: String, required: true },
        type: { type: String, default: 'plate' },
        price: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1 },
        subtotal: { type: Number, required: true, min: 0 },
        
        // Plate configuration data
        registration: String,
        side: String,
        roadLegal: String,
        spacing: String,
        plateStyle: String,
        styleLabel: String,
        stylePrice: Number,
        size: String,
        sizeLabel: String,
        sizeDimensions: String,
        sizePrice: Number,
        fontColor: String,
        fontColorName: String,
        fontColorPrice: Number,
        borderStyle: String,
        borderName: String,
        borderType: String,
        borderColor: String,
        borderWidth: Number,
        borderPrice: Number,
        countryBadge: String,
        selectedCountry: String,
        badgeName: String,
        badgePosition: String,
        flagImage: String,
        badgePrice: Number,
        finish: String,
        finishLabel: String,
        finishDescription: String,
        finishPrice: Number,
        thickness: String,
        thicknessLabel: String,
        thicknessValue: Number,
        thicknessPrice: Number,
        shadowEffect: String,
        shadowName: String,
        shadowDescription: String,
        shadowPrice: Number,
        displayText: String,
        font: String,
        fontSize: Number,
        addedAt: { type: Date, default: Date.now }
    }],
    lastActive: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, // 7 days
    createdAt: { type: Date, default: Date.now }
});



// ===============================
// USER SCHEMA
// ===============================

// User Schema for customer authentication
const userSchema = new mongoose.Schema({
    // Basic Information
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    
    // Authentication
    password: { type: String }, // Not required for OAuth users
    isEmailVerified: { type: Boolean, default: false },
    
    // OAuth Information
    googleId: { type: String }, // For Google OAuth
    authProvider: { 
        type: String, 
        enum: ['local', 'google'], 
        default: 'local' 
    },
    
    // Address Information (collected at checkout)
    addresses: [{
        type: { 
            type: String, 
            enum: ['shipping', 'billing', 'both'], 
            default: 'both' 
        },
        firstName: String,
        lastName: String,
        address: String,
        city: String,
        postcode: String,
        country: { type: String, default: 'IN' },
        isDefault: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
    }],
    
    // User Status
    isActive: { type: Boolean, default: true },
    
    // Preferences
    marketingEmails: { type: Boolean, default: false },

    userCart: {
        items: [{
            id: String,
            name: String,
            type: { type: String, default: 'plate' },
            price: { type: Number, min: 0 },
            quantity: { type: Number, min: 1 },
            subtotal: { type: Number, min: 0 },
            // All the same fields as cartSessionSchema items
            registration: String,
            side: String,
            roadLegal: String,
            spacing: String,
            plateStyle: String,
            styleLabel: String,
            stylePrice: Number,
            size: String,
            sizeLabel: String,
            sizeDimensions: String,
            sizePrice: Number,
            fontColor: String,
            fontColorName: String,
            fontColorPrice: Number,
            borderStyle: String,
            borderName: String,
            borderType: String,
            borderColor: String,
            borderWidth: Number,
            borderPrice: Number,
            countryBadge: String,
            selectedCountry: String,
            badgeName: String,
            badgePosition: String,
            flagImage: String,
            badgePrice: Number,
            finish: String,
            finishLabel: String,
            finishDescription: String,
            finishPrice: Number,
            thickness: String,
            thicknessLabel: String,
            thicknessValue: Number,
            thicknessPrice: Number,
            shadowEffect: String,
            shadowName: String,
            shadowDescription: String,
            shadowPrice: Number,
            displayText: String,
            font: String,
            fontSize: Number,
            addedAt: { type: Date, default: Date.now }
        }],
        lastUpdated: { type: Date, default: Date.now }
    },
    
    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastLogin: { type: Date }
});

// Index for efficient queries
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });

// Pre-save middleware to update the updatedAt field
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Add User model to your existing models section
const User = mongoose.model('User', userSchema);


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
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
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


orderSchema.add({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } });

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
const CartSession = mongoose.model('CartSession', cartSessionSchema);

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
// USER AUTHENTICATION MIDDLEWARE
// ===============================

// JWT Authentication Middleware for Users
const authenticateUserToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            error: 'Access token required' 
        });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', async (err, decoded) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                error: 'Invalid or expired token' 
            });
        }
        
        // Check if it's a user token (not admin)
        if (decoded.type !== 'user') {
            return res.status(403).json({ 
                success: false, 
                error: 'Invalid token type' 
            });
        }
        
        // Verify user still exists and is active
        try {
            const user = await User.findById(decoded.id);
            if (!user || !user.isActive) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'User account not found or deactivated' 
                });
            }
            
            req.user = decoded;
            next();
        } catch (error) {
            return res.status(500).json({ 
                success: false, 
                error: 'Authentication error' 
            });
        }
    });
};

// Middleware to authenticate either admin or user
const authenticateAnyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            error: 'Access token required' 
        });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                error: 'Invalid or expired token' 
            });
        }
        
        req.user = decoded;
        next();
    });
};

const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const cleanupExpiredCartSessions = async () => {
    try {
        const result = await CartSession.deleteMany({
            expiresAt: { $lt: new Date() }
        });
        if (result.deletedCount > 0) {
            console.log(`🧹 Cleaned up ${result.deletedCount} expired cart sessions`);
        }
    } catch (error) {
        console.error('Error cleaning up cart sessions:', error);
    }
};

setInterval(cleanupExpiredCartSessions, 60 * 60 * 1000);

// Get cart (guest or user)
app.get('/api/cart', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        let userId = null;
        
        // Check if user is authenticated
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                if (decoded.type === 'user') {
                    userId = decoded.id;
                }
            } catch (err) {
                // Token invalid, continue as guest
            }
        }
        
        if (userId) {
            // Get user cart
            const user = await User.findById(userId);
            res.json({
                success: true,
                data: {
                    items: user?.userCart?.items || [],
                    sessionId: null, // No session ID for authenticated users
                    isAuthenticated: true
                }
            });
        } else {
            // Get guest cart
            const { sessionId } = req.query;
            
            if (!sessionId) {
                // No session ID provided, return empty cart
                return res.json({
                    success: true,
                    data: {
                        items: [],
                        sessionId: generateSessionId(),
                        isAuthenticated: false
                    }
                });
            }
            
            const cartSession = await CartSession.findOne({ sessionId });
            res.json({
                success: true,
                data: {
                    items: cartSession?.items || [],
                    sessionId: sessionId,
                    isAuthenticated: false
                }
            });
        }
        
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch cart'
        });
    }
});

// Add item to cart
app.post('/api/cart', async (req, res) => {
    try {
        const { item, sessionId } = req.body;
        const authHeader = req.headers['authorization'];
        let userId = null;
        
        // Check if user is authenticated
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                if (decoded.type === 'user') {
                    userId = decoded.id;
                }
            } catch (err) {
                // Token invalid, continue as guest
            }
        }
        
        // Enhanced item with all required fields
        const enhancedItem = {
            id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: item.name || `${item.registration || 'Custom'} Number Plate`,
            type: item.type || 'plate',
            price: parseFloat(item.price) || 0,
            quantity: parseInt(item.quantity) || 1,
            subtotal: parseFloat(item.subtotal) || (parseFloat(item.price) * parseInt(item.quantity)),
            
            // All the plate configuration data
            registration: item.registration || item.text || '',
            side: item.side || 'front',
            roadLegal: item.roadLegal || 'No',
            spacing: item.spacing || 'legal',
            plateStyle: item.plateStyle || 'standard',
            styleLabel: item.styleLabel || 'Standard Plate',
            stylePrice: parseFloat(item.stylePrice) || 0,
            size: item.size || 'standard',
            sizeLabel: item.sizeLabel || 'Standard Size',
            sizeDimensions: item.sizeDimensions || '520mm x 111mm',
            sizePrice: parseFloat(item.sizePrice) || 0,
            fontColor: item.fontColor || '#000000',
            fontColorName: item.fontColorName || 'Black',
            fontColorPrice: parseFloat(item.fontColorPrice) || 0,
            borderStyle: item.borderStyle || 'none',
            borderName: item.borderName || 'No Border',
            borderType: item.borderType || 'none',
            borderColor: item.borderColor || '',
            borderWidth: parseFloat(item.borderWidth) || 0,
            borderPrice: parseFloat(item.borderPrice) || 0,
            countryBadge: item.countryBadge || 'none',
            selectedCountry: item.selectedCountry || 'uk',
            badgeName: item.badgeName || 'No Badge',
            badgePosition: item.badgePosition || 'left',
            flagImage: item.flagImage || '',
            badgePrice: parseFloat(item.badgePrice) || 0,
            finish: item.finish || 'standard',
            finishLabel: item.finishLabel || 'Standard Finish',
            finishDescription: item.finishDescription || '',
            finishPrice: parseFloat(item.finishPrice) || 0,
            thickness: item.thickness || '3mm',
            thicknessLabel: item.thicknessLabel || '3mm Standard',
            thicknessValue: parseFloat(item.thicknessValue) || 3,
            thicknessPrice: parseFloat(item.thicknessPrice) || 0,
            shadowEffect: item.shadowEffect || 'none',
            shadowName: item.shadowName || 'No Effect',
            shadowDescription: item.shadowDescription || '',
            shadowPrice: parseFloat(item.shadowPrice) || 0,
            displayText: item.displayText || item.registration || item.text,
            font: item.font || 'Charles Wright',
            fontSize: parseFloat(item.fontSize) || 79,
            addedAt: new Date()
        };
        
        if (userId) {
            // Add to user cart
            const user = await User.findById(userId);
            if (!user.userCart) {
                user.userCart = { items: [], lastUpdated: new Date() };
            }
            
            // Check if item already exists
            const existingIndex = user.userCart.items.findIndex(
                cartItem => 
                    cartItem.registration === enhancedItem.registration && 
                    cartItem.side === enhancedItem.side
            );
            
            if (existingIndex >= 0) {
                // Update existing item
                user.userCart.items[existingIndex].quantity += enhancedItem.quantity;
                user.userCart.items[existingIndex].subtotal = 
                    user.userCart.items[existingIndex].quantity * user.userCart.items[existingIndex].price;
            } else {
                // Add new item
                user.userCart.items.push(enhancedItem);
            }
            
            user.userCart.lastUpdated = new Date();
            await user.save();
            
            res.json({
                success: true,
                message: 'Item added to cart successfully',
                data: { items: user.userCart.items }
            });
            
        } else {
            // Add to guest cart
            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    error: 'Session ID required for guest cart'
                });
            }
            
            let cartSession = await CartSession.findOne({ sessionId });
            if (!cartSession) {
                cartSession = new CartSession({
                    sessionId,
                    items: []
                });
            }
            
            // Check if item already exists
            const existingIndex = cartSession.items.findIndex(
                cartItem => 
                    cartItem.registration === enhancedItem.registration && 
                    cartItem.side === enhancedItem.side
            );
            
            if (existingIndex >= 0) {
                // Update existing item
                cartSession.items[existingIndex].quantity += enhancedItem.quantity;
                cartSession.items[existingIndex].subtotal = 
                    cartSession.items[existingIndex].quantity * cartSession.items[existingIndex].price;
            } else {
                // Add new item
                cartSession.items.push(enhancedItem);
            }
            
            cartSession.lastActive = new Date();
            await cartSession.save();
            
            res.json({
                success: true,
                message: 'Item added to cart successfully',
                data: { items: cartSession.items, sessionId }
            });
        }
        
    } catch (error) {
        console.error('Error adding item to cart:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add item to cart'
        });
    }
});

// Update cart item quantity
app.put('/api/cart/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity, sessionId } = req.body;
        const authHeader = req.headers['authorization'];
        let userId = null;
        
        // Check if user is authenticated
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                if (decoded.type === 'user') {
                    userId = decoded.id;
                }
            } catch (err) {
                // Token invalid, continue as guest
            }
        }
        
        if (userId) {
            // Update user cart
            const user = await User.findById(userId);
            const itemIndex = user.userCart?.items.findIndex(item => item.id === itemId);
            
            if (itemIndex >= 0) {
                if (quantity <= 0) {
                    user.userCart.items.splice(itemIndex, 1);
                } else {
                    user.userCart.items[itemIndex].quantity = quantity;
                    user.userCart.items[itemIndex].subtotal = 
                        user.userCart.items[itemIndex].price * quantity;
                }
                user.userCart.lastUpdated = new Date();
                await user.save();
            }
            
            res.json({
                success: true,
                message: 'Cart updated successfully',
                data: { items: user.userCart?.items || [] }
            });
            
        } else {
            // Update guest cart
            const cartSession = await CartSession.findOne({ sessionId });
            if (cartSession) {
                const itemIndex = cartSession.items.findIndex(item => item.id === itemId);
                
                if (itemIndex >= 0) {
                    if (quantity <= 0) {
                        cartSession.items.splice(itemIndex, 1);
                    } else {
                        cartSession.items[itemIndex].quantity = quantity;
                        cartSession.items[itemIndex].subtotal = 
                            cartSession.items[itemIndex].price * quantity;
                    }
                    cartSession.lastActive = new Date();
                    await cartSession.save();
                }
            }
            
            res.json({
                success: true,
                message: 'Cart updated successfully',
                data: { items: cartSession?.items || [], sessionId }
            });
        }
        
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update cart'
        });
    }
});

// Remove item from cart
app.delete('/api/cart/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const { sessionId } = req.query;
        const authHeader = req.headers['authorization'];
        let userId = null;
        
        // Check if user is authenticated
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                if (decoded.type === 'user') {
                    userId = decoded.id;
                }
            } catch (err) {
                // Token invalid, continue as guest
            }
        }
        
        if (userId) {
            // Remove from user cart
            const user = await User.findById(userId);
            if (user.userCart) {
                user.userCart.items = user.userCart.items.filter(item => item.id !== itemId);
                user.userCart.lastUpdated = new Date();
                await user.save();
            }
            
            res.json({
                success: true,
                message: 'Item removed from cart',
                data: { items: user.userCart?.items || [] }
            });
            
        } else {
            // Remove from guest cart
            const cartSession = await CartSession.findOne({ sessionId });
            if (cartSession) {
                cartSession.items = cartSession.items.filter(item => item.id !== itemId);
                cartSession.lastActive = new Date();
                await cartSession.save();
            }
            
            res.json({
                success: true,
                message: 'Item removed from cart',
                data: { items: cartSession?.items || [], sessionId }
            });
        }
        
    } catch (error) {
        console.error('Error removing item from cart:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove item from cart'
        });
    }
});

// Clear cart
app.delete('/api/cart', async (req, res) => {
    try {
        const { sessionId } = req.query;
        const authHeader = req.headers['authorization'];
        let userId = null;
        
        // Check if user is authenticated
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                if (decoded.type === 'user') {
                    userId = decoded.id;
                }
            } catch (err) {
                // Token invalid, continue as guest
            }
        }
        
        if (userId) {
            // Clear user cart
            const user = await User.findById(userId);
            if (user.userCart) {
                user.userCart.items = [];
                user.userCart.lastUpdated = new Date();
                await user.save();
            }
            
            res.json({
                success: true,
                message: 'Cart cleared successfully',
                data: { items: [] }
            });
            
        } else {
            // Clear guest cart
            await CartSession.findOneAndUpdate(
                { sessionId },
                { items: [], lastActive: new Date() }
            );
            
            res.json({
                success: true,
                message: 'Cart cleared successfully',
                data: { items: [], sessionId }
            });
        }
        
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear cart'
        });
    }
});

// Merge guest cart into user cart (when user logs in)
app.post('/api/cart/merge', authenticateUserToken, async (req, res) => {
    try {
        const { sessionId } = req.body;
        const userId = req.user.id;
        
        // Get guest cart
        const cartSession = await CartSession.findOne({ sessionId });
        if (!cartSession || cartSession.items.length === 0) {
            return res.json({
                success: true,
                message: 'No guest cart to merge',
                data: { items: [] }
            });
        }
        
        // Get user
        const user = await User.findById(userId);
        if (!user.userCart) {
            user.userCart = { items: [], lastUpdated: new Date() };
        }
        
        // Merge items (add guest items to existing user cart)
        for (const guestItem of cartSession.items) {
            const existingIndex = user.userCart.items.findIndex(
                userItem => 
                    userItem.registration === guestItem.registration && 
                    userItem.side === guestItem.side
            );
            
            if (existingIndex >= 0) {
                // Update existing item quantity
                user.userCart.items[existingIndex].quantity += guestItem.quantity;
                user.userCart.items[existingIndex].subtotal = 
                    user.userCart.items[existingIndex].quantity * user.userCart.items[existingIndex].price;
            } else {
                // Add new item
                user.userCart.items.push(guestItem);
            }
        }
        
        user.userCart.lastUpdated = new Date();
        await user.save();
        
        // Delete guest cart session
        await CartSession.findOneAndDelete({ sessionId });
        
        res.json({
            success: true,
            message: `Merged ${cartSession.items.length} items from guest cart`,
            data: { items: user.userCart.items }
        });
        
    } catch (error) {
        console.error('Error merging cart:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to merge cart'
        });
    }
});

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

// Helper function to transform payment status for admin panel
const transformPaymentStatus = (paymentStatus) => {
    switch (paymentStatus) {
        case 'paid':
        case 'completed':
        case 'success':
            return 'Completed';
        case 'failed':
        case 'cancelled':
        case 'error':
            return 'Failed';
        case 'pending':
        case 'processing':
        default:
            return 'Pending';
    }
};

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
            status: transformPaymentStatus(order.paymentStatus),
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
// USER AUTHENTICATION ROUTES
// ===============================

// User Registration with Email
app.post('/api/user/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone, marketingEmails } = req.body;
        
        // Validation
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'First name, last name, email, and password are required' 
            });
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Please provide a valid email address' 
            });
        }
        
        // Password validation
        if (password.length < 8) {
            return res.status(400).json({ 
                success: false, 
                error: 'Password must be at least 8 characters long' 
            });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                error: 'User with this email already exists' 
            });
        }
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Create user
        const user = new User({
            firstName,
            lastName,
            email: email.toLowerCase(),
            password: hashedPassword,
            phone,
            marketingEmails: marketingEmails || false,
            authProvider: 'local'
        });
        
        await user.save();
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user._id, 
                email: user.email,
                type: 'user' // To distinguish from admin tokens
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );
        
        res.status(201).json({ 
            success: true, 
            message: 'User registered successfully',
            token,
            user: { 
                id: user._id, 
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                isEmailVerified: user.isEmailVerified
            }
        });
        
    } catch (error) {
        console.error('User registration error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Registration failed. Please try again.' 
        });
    }
});

// User Login with Email
app.post('/api/user/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email and password are required' 
            });
        }
        
        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid email or password' 
            });
        }
        
        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({ 
                success: false, 
                error: 'Account is deactivated. Please contact support.' 
            });
        }
        
        // For OAuth users, redirect to OAuth
        if (user.authProvider === 'google' && !user.password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Please login with Google',
                useOAuth: true,
                provider: 'google'
            });
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid email or password' 
            });
        }
        
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user._id, 
                email: user.email,
                type: 'user'
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: { 
                id: user._id, 
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                isEmailVerified: user.isEmailVerified,
                addresses: user.addresses
            }
        });
        
    } catch (error) {
        console.error('User login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Login failed. Please try again.' 
        });
    }
});

// User Profile Route (Protected)
app.get('/api/user/profile', authenticateUserToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
        
        res.json({
            success: true,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                isEmailVerified: user.isEmailVerified,
                addresses: user.addresses,
                marketingEmails: user.marketingEmails,
                createdAt: user.createdAt
            }
        });
        
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch profile' 
        });
    }
});

// Update User Profile
app.put('/api/user/profile', authenticateUserToken, async (req, res) => {
    try {
        const { firstName, lastName, phone, marketingEmails } = req.body;
        
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
        
        // Update fields
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (phone) user.phone = phone;
        if (marketingEmails !== undefined) user.marketingEmails = marketingEmails;
        
        await user.save();
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                marketingEmails: user.marketingEmails
            }
        });
        
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update profile' 
        });
    }
});


// ===============================
// USER ORDERS ROUTES (ADD AFTER USER AUTHENTICATION ROUTES)
// ===============================

// Get user's orders
app.get('/api/user/orders', authenticateUserToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Find orders by user email (since orders store customer email)
        const orders = await Order.find({ 'customer.email': user.email })
            .sort({ 'dates.ordered': -1 });

        // Transform orders for frontend
        const transformedOrders = orders.map(order => ({
            id: order._id,
            orderId: order.orderId,
            items: order.items,
            pricing: order.pricing,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus,
            dates: order.dates,
            customer: order.customer,
            payment: order.payment,
            trackingNumber: order.trackingNumber,
            notes: order.notes,
            createdAt: order.createdAt
        }));

        res.json({
            success: true,
            data: transformedOrders,
            count: transformedOrders.length
        });

    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch orders'
        });
    }
});

// Get single order details for user
app.get('/api/user/orders/:orderId', authenticateUserToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Find order and verify it belongs to the user
        const order = await Order.findOne({ 
            orderId,
            'customer.email': user.email 
        });

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

// Get user's order statistics
app.get('/api/user/orders/stats', authenticateUserToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const orders = await Order.find({ 'customer.email': user.email });

        const stats = {
            totalOrders: orders.length,
            totalSpent: orders.reduce((sum, order) => sum + (order.pricing?.total || 0), 0),
            ordersByStatus: {
                pending: orders.filter(o => o.orderStatus === 'pending').length,
                processing: orders.filter(o => o.orderStatus === 'processing').length,
                shipped: orders.filter(o => o.orderStatus === 'shipped').length,
                delivered: orders.filter(o => o.orderStatus === 'delivered').length,
                cancelled: orders.filter(o => o.orderStatus === 'cancelled').length
            },
            paymentsByStatus: {
                pending: orders.filter(o => o.paymentStatus === 'pending').length,
                paid: orders.filter(o => o.paymentStatus === 'paid').length,
                failed: orders.filter(o => o.paymentStatus === 'failed').length,
                refunded: orders.filter(o => o.paymentStatus === 'refunded').length
            },
            recentOrders: orders
                .sort((a, b) => new Date(b.dates.ordered) - new Date(a.dates.ordered))
                .slice(0, 5)
                .map(order => ({
                    orderId: order.orderId,
                    total: order.pricing?.total || 0,
                    status: order.orderStatus,
                    date: order.dates.ordered
                }))
        };

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Error fetching order stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order statistics'
        });
    }
});


// ===============================
// PASSPORT GOOGLE OAUTH STRATEGY
// ===============================

passport.use(
  new OAuth2Strategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `http://localhost:5000/auth/google/callback`,
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('Google OAuth Profile:', profile);
        
        // Check if user already exists with this email
        let user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          // User exists - update Google ID if not set
          if (!user.googleId) {
            user.googleId = profile.id;
            user.authProvider = 'google';
            await user.save();
          }
        } else {
          // Create new user
          user = new User({
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            email: profile.emails[0].value,
            googleId: profile.id,
            authProvider: 'google',
            isEmailVerified: true, // Google emails are verified
            isActive: true
          });
          await user.save();
        }
        
        return done(null, user);
      } catch (error) {
        console.error('Google OAuth Error:', error);
        return done(error, null);
      }
    }
  )
);

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ===============================
// GOOGLE OAUTH ROUTES
// ===============================

// Start Google OAuth
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth callback
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_failed`,
  }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed`);
      }

      // Generate JWT token (same as regular login)
      const token = jwt.sign(
        { 
          id: req.user._id, 
          email: req.user.email,
          type: 'user'
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      // Update last login
      req.user.lastLogin = new Date();
      await req.user.save();

      // Set token as cookie and redirect
      const cookieConfig = getCookieConfig();
      res.cookie("authToken", token, cookieConfig);
      
      // Redirect to frontend with success
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${token}`);
      
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=server_error`);
    }
  }
);

// OAuth success verification endpoint
app.get("/auth/google/success", authenticateUserToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json({ 
      success: true,
      message: "User logged in successfully", 
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        isEmailVerified: user.isEmailVerified,
        addresses: user.addresses,
        authProvider: user.authProvider
      }
    });
  } catch (error) {
    console.error('OAuth success error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get user data' 
    });
  }
});

// Logout (handles both regular and OAuth users)
app.post("/api/user/logout", (req, res) => {
  const token = req.cookies.authToken;
  
  req.logout(() => {
    res.clearCookie('authToken', getCookieConfig());
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  });
});

// ===============================
// HELPER FUNCTIONS - ADD THESE
// ===============================

const generateSimpleScalableOrderId = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return timestamp + random; // This naturally scales with time
};

// Generate Amazon-style order number (10 digits exactly)
const generateAmazonStyleOrderNumber = () => {
    return generateSimpleScalableOrderId();
};

// Add these endpoints to your server.js file (before app.listen)

// ===============================
// SIMPLE PAYPAL ROUTES (for cart checkout)
// ===============================

// Simple PayPal order creation (what your frontend is calling)
app.post('/create-paypal-order', async (req, res) => {
    console.log('Creating PayPal order');
    
    const { amount, currency = 'GBP', orderId } = req.body; // orderId is our DB order ID
    
    if (!amount || !orderId) {
        return res.status(400).json({ error: 'Amount and orderId are required' });
    }
    
    try {
        // Get PayPal access token
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

        // Create PayPal order
        const orderRes = await axios.post(
            'https://api-m.sandbox.paypal.com/v2/checkout/orders',
            {
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        reference_id: orderId, // Our DB order ID for reference
                        amount: {
                            currency_code: currency,
                            value: amount.toString(),
                        },
                    },
                ],
                application_context: {
                    return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-success`,
                    cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/basket`,
                },
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        console.log('PayPal order created:', orderRes.data.id);

        // Update our database order with PayPal order ID
        await Order.findOneAndUpdate(
            { orderId },
            { 
                'payment.paypalOrderId': orderRes.data.id,
                notes: `PayPal order created: ${orderRes.data.id}. Awaiting payment completion.`,
                updatedAt: new Date()
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

// Add this route to your index.js - the frontend is calling this endpoint

const generateScalableOrderId = async () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let length = 8; // Start with 8 characters
    let maxAttempts = 1000; // Prevent infinite loops
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        // Generate random ID of current length
        let orderId = '';
        for (let i = 0; i < length; i++) {
            orderId += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // Check if this ID already exists in database
        const existingOrder = await Order.findOne({ orderId });
        
        if (!existingOrder) {
            return orderId; // Found unique ID
        }
        
        attempts++;
        
        // If we've tried too many times with current length, increase it
        if (attempts >= maxAttempts) {
            length++; // Increase to 9, 10, 11, etc.
            attempts = 0; // Reset attempts counter
            maxAttempts = 1000; // Reset max attempts for new length
            
            console.log(`🔄 Order ID length increased to ${length} characters due to collision`);
        }
    }
    
    // Fallback (should never reach here)
    return Date.now().toString(36).toUpperCase();
};

// app.post('/capture-paypal-payment', async (req, res) => {
//     try {
//         const { paypalOrderId } = req.body;
        
//         console.log('🔥 Clean Capture PayPal Payment - PayPal Order ID:', paypalOrderId);
        
//         if (!paypalOrderId) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'PayPal order ID is required'
//             });
//         }

//         // STEP 1: Check if we already processed this PayPal order
//         const existingOrder = await Order.findOne({ 'payment.paypalOrderId': paypalOrderId });
//         if (existingOrder && existingOrder.paymentStatus === 'paid') {
//             console.log('✅ Order already processed:', existingOrder.orderId);
//             return res.json({
//                 success: true,
//                 data: {
//                     orderId: existingOrder.orderId,
//                     amount: existingOrder.payment.amount,
//                     currency: existingOrder.payment.currency,
//                     paymentId: existingOrder.payment.paypalPaymentId,
//                     paymentStatus: 'completed'
//                 }
//             });
//         }

//         // STEP 2: Get PayPal Access Token
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

//         // STEP 3: Try to capture the PayPal order
//         let captureRes;
//         try {
//             captureRes = await axios.post(
//                 `https://api-m.sandbox.paypal.com/v2/checkout/orders/${paypalOrderId}/capture`,
//                 {},
//                 {
//                     headers: {
//                         'Content-Type': 'application/json',
//                         'Authorization': `Bearer ${accessToken}`,
//                     },
//                 }
//             );
//         } catch (captureError) {
//             // Handle "ORDER_ALREADY_CAPTURED" error
//             if (captureError.response?.data?.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED') {
//                 console.log('PayPal order already captured, fetching order details...');
                
//                 const orderDetailsRes = await axios.get(
//                     `https://api-m.sandbox.paypal.com/v2/checkout/orders/${paypalOrderId}`,
//                     {
//                         headers: {
//                             'Content-Type': 'application/json',
//                             'Authorization': `Bearer ${accessToken}`,
//                         },
//                     }
//                 );
                
//                 captureRes = { data: orderDetailsRes.data };
//             } else {
//                 throw captureError;
//             }
//         }

//         console.log('PayPal capture response status:', captureRes.data.status);

//         // STEP 4: Process the order if payment is completed
//         if (captureRes.data.status === 'COMPLETED') {
            
//             // Extract payment details
//             let paymentDetails;
//             let amount;
            
//             if (captureRes.data.purchase_units?.[0]?.payments?.captures?.[0]) {
//                 // This is a capture response
//                 paymentDetails = captureRes.data.purchase_units[0].payments.captures[0];
//                 amount = parseFloat(paymentDetails.amount.value);
//             } else if (captureRes.data.purchase_units?.[0]?.amount?.value) {
//                 // This is an order details response
//                 const purchaseUnit = captureRes.data.purchase_units[0];
//                 amount = parseFloat(purchaseUnit.amount.value);
//                 paymentDetails = {
//                     id: paypalOrderId,
//                     amount: purchaseUnit.amount
//                 };
//             } else {
//                 throw new Error('Unable to extract payment details from PayPal response');
//             }

//             // STEP 5: Create or update order in database
//             if (existingOrder) {
//                 // Update existing order
//                 await Order.findOneAndUpdate(
//                     { orderId: existingOrder.orderId },
//                     { 
//                         paymentStatus: 'paid',
//                         orderStatus: 'processing',
//                         'payment.paypalPaymentId': paymentDetails.id,
//                         'payment.transactionId': paymentDetails.id,
//                         'payment.amount': amount,
//                         'dates.paid': new Date(),
//                         updatedAt: new Date()
//                     }
//                 );

//                 console.log('✅ Updated existing order:', existingOrder.orderId);
                
//                 return res.json({
//                     success: true,
//                     data: {
//                         orderId: existingOrder.orderId,
//                         amount: amount,
//                         currency: paymentDetails.amount?.currency_code || 'GBP',
//                         paymentId: paymentDetails.id,
//                         paymentStatus: 'completed'
//                     }
//                 });
//             } else {
//                 // Create new order if none exists (fallback scenario)
//                 const newOrderId = await generateScalableOrderId();
                
//                 const newOrder = new Order({
//                     orderId: newOrderId,
//                     customer: {
//                         firstName: captureRes.data.payer?.name?.given_name || 'PayPal',
//                         lastName: captureRes.data.payer?.name?.surname || 'Customer',
//                         email: captureRes.data.payer?.email_address || 'customer@example.com',
//                         phone: '',
//                         address: 'Not provided',
//                         city: 'Not provided',
//                         postcode: 'Not provided',
//                         country: 'GB'
//                     },
//                     orderStatus: 'processing',
//                     paymentStatus: 'paid',
//                     items: [{
//                         name: 'Number Plate',
//                         type: 'plate',
//                         price: amount,
//                         quantity: 1,
//                         subtotal: amount,
//                         plateConfiguration: {
//                             text: 'UNKNOWN',
//                             spacing: 'legal',
//                             displayText: 'UNKNOWN',
//                             side: 'front',
//                             size: { key: 'standard', label: 'Standard Size', dimensions: '520mm x 111mm' },
//                             plateStyle: { key: 'standard', label: 'Standard Plate', font: 'Charles Wright', fontSize: 79, price: 0 },
//                             fontColor: { key: 'black', name: 'Black', color: '#000000', price: 0 },
//                             border: { key: 'none', name: 'No Border', type: 'none', color: '', borderWidth: 0, price: 0 },
//                             countryBadge: { key: 'none', name: 'No Badge', country: 'uk', flagImage: '', position: 'left', price: 0 },
//                             finish: { key: 'standard', label: 'Standard Finish', description: '', price: 0 },
//                             thickness: { key: '3mm', label: '3mm Standard', value: 3, price: 0 },
//                             shadowEffect: { key: 'none', name: 'No Effect', description: '', price: 0 },
//                             roadLegal: 'No',
//                             legalNotes: 'Show plates only - not for road use'
//                         }
//                     }],
//                     pricing: {
//                         subtotal: amount,
//                         discount: 0,
//                         shipping: 0,
//                         tax: 0,
//                         total: amount
//                     },
//                     payment: {
//                         provider: 'paypal',
//                         paypalOrderId: paypalOrderId,
//                         paypalPaymentId: paymentDetails.id,
//                         transactionId: paymentDetails.id,
//                         amount: amount,
//                         currency: paymentDetails.amount?.currency_code || 'GBP'
//                     },
//                     dates: {
//                         ordered: new Date(),
//                         paid: new Date()
//                     }
//                 });
                
//                 await newOrder.save();
//                 console.log('✅ Created new order:', newOrderId);
                
//                 return res.json({
//                     success: true,
//                     data: {
//                         orderId: newOrderId,
//                         amount: amount,
//                         currency: paymentDetails.amount?.currency_code || 'GBP',
//                         paymentId: paymentDetails.id,
//                         paymentStatus: 'completed'
//                     }
//                 });
//             }
//         } else {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Payment not completed',
//                 paymentStatus: captureRes.data.status
//             });
//         }

//     } catch (err) {
//         console.error('❌ Error capturing PayPal payment:', err.response ? err.response.data : err.message);
//         res.status(500).json({ 
//             success: false,
//             error: 'Failed to capture payment',
//             details: err.response ? err.response.data : err.message
//         });
//     }
// });
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

// Admin Print Order Details Route
app.get('/admin/print-order/:orderId', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ orderId });
        
        if (!order) {
            return res.status(404).send('<h1>Order not found</h1>');
        }

        const formatCurrency = (amount, currency = 'GBP') => {
            if (!amount) return '£0.00';
            const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency;
            return `${symbol}${parseFloat(amount).toFixed(2)}`;
        };

        const formatDate = (dateString) => {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Order Details - ${order.orderId}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    font-size: 12px;
                    line-height: 1.4;
                    color: #333;
                    max-width: 1000px;
                    margin: 0 auto;
                    padding: 20px;
                }
                
                .header {
                    text-align: center;
                    border-bottom: 3px solid #ffc107;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                
                .header h1 {
                    font-size: 28px;
                    color: #333;
                    margin-bottom: 5px;
                }
                
                .header .subtitle {
                    color: #666;
                    font-size: 16px;
                }
                
                .admin-badge {
                    background: #dc3545;
                    color: white;
                    padding: 5px 15px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: bold;
                    display: inline-block;
                    margin-top: 10px;
                }
                
                .order-header {
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 25px;
                }
                
                .order-header h2 {
                    color: #495057;
                    margin-bottom: 15px;
                    font-size: 18px;
                }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 30px;
                    margin-bottom: 25px;
                }
                
                .info-section {
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    overflow: hidden;
                }
                
                .info-section-header {
                    background: #6c757d;
                    color: white;
                    padding: 12px 15px;
                    font-weight: bold;
                    font-size: 14px;
                }
                
                .info-section-body {
                    padding: 15px;
                }
                
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 10px;
                    padding: 5px 0;
                    border-bottom: 1px dotted #dee2e6;
                }
                
                .info-row:last-child {
                    border-bottom: none;
                    margin-bottom: 0;
                }
                
                .info-row .label {
                    font-weight: 500;
                    color: #495057;
                    flex: 0 0 40%;
                }
                
                .info-row .value {
                    flex: 1;
                    text-align: right;
                    color: #212529;
                    word-break: break-all;
                }
                
                .order-id {
                    font-family: 'Courier New', monospace;
                    background: #e3f2fd;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    color: #1976d2;
                }
                
                .status-badge {
                    padding: 4px 10px;
                    border-radius: 15px;
                    font-size: 10px;
                    font-weight: bold;
                    text-transform: uppercase;
                }
                
                .status-paid { background: #d4edda; color: #155724; }
                .status-pending { background: #fff3cd; color: #856404; }
                .status-processing { background: #cce7ff; color: #004085; }
                .status-shipped { background: #e2e3e5; color: #383d41; }
                
                .amount {
                    font-size: 16px;
                    font-weight: bold;
                    color: #28a745;
                }
                
                .items-section {
                    margin-bottom: 25px;
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    overflow: hidden;
                }
                
                .items-header {
                    background: #007bff;
                    color: white;
                    padding: 12px 15px;
                    font-weight: bold;
                    font-size: 14px;
                }
                
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                
                .items-table th {
                    background: #f8f9fa;
                    padding: 10px;
                    text-align: left;
                    font-weight: 600;
                    border-bottom: 2px solid #dee2e6;
                    font-size: 11px;
                }
                
                .items-table td {
                    padding: 10px;
                    border-bottom: 1px solid #dee2e6;
                    font-size: 11px;
                }
                
                .items-table tr:last-child td {
                    border-bottom: none;
                }
                
                .items-table tr:nth-child(even) {
                    background: #f8f9fa;
                }
                
                .plate-text {
                    font-family: 'Courier New', monospace;
                    background: #343a40;
                    color: white;
                    padding: 3px 6px;
                    border-radius: 3px;
                    font-size: 10px;
                }
                
                .pricing-section {
                    border: 2px solid #28a745;
                    border-radius: 8px;
                    overflow: hidden;
                    margin-bottom: 25px;
                }
                
                .pricing-header {
                    background: #28a745;
                    color: white;
                    padding: 12px 15px;
                    font-weight: bold;
                    font-size: 14px;
                }
                
                .pricing-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                
                .pricing-table td {
                    padding: 8px 15px;
                    border-bottom: 1px solid #dee2e6;
                }
                
                .pricing-table tr:last-child td {
                    border-bottom: none;
                    background: #f8f9fa;
                    font-weight: bold;
                    font-size: 14px;
                }
                
                .shipping-section {
                    border: 1px solid #17a2b8;
                    border-radius: 8px;
                    overflow: hidden;
                    margin-bottom: 25px;
                }
                
                .shipping-header {
                    background: #17a2b8;
                    color: white;
                    padding: 12px 15px;
                    font-weight: bold;
                    font-size: 14px;
                }
                
                .shipping-body {
                    padding: 15px;
                }
                
                .address-box {
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 5px;
                    padding: 10px;
                    font-size: 11px;
                }
                
                .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 2px solid #dee2e6;
                    text-align: center;
                    color: #6c757d;
                    font-size: 10px;
                }
                
                @media print {
                    body { margin: 0; padding: 10px; }
                    .no-print { display: none !important; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>PlateForge</h1>
                <div class="subtitle">Admin Order Details Report</div>
                <div class="admin-badge">INTERNAL USE ONLY</div>
            </div>
            
            <div class="order-header">
                <h2>Order Summary</h2>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>Order ID:</strong> 
                        <span class="order-id">${order.orderId}</span>
                    </div>
                    <div>
                        <strong>Generated:</strong> ${formatDate(new Date())}
                    </div>
                </div>
            </div>
            
            <div class="info-grid">
                <div class="info-section">
                    <div class="info-section-header">Customer Information</div>
                    <div class="info-section-body">
                        <div class="info-row">
                            <span class="label">Name:</span>
                            <span class="value">
                                ${order.customer?.firstName && order.customer?.lastName ? 
                                    `${order.customer.firstName} ${order.customer.lastName}` :
                                    'N/A'
                                }
                            </span>
                        </div>
                        <div class="info-row">
                            <span class="label">Email:</span>
                            <span class="value">${order.customer?.email || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Phone:</span>
                            <span class="value">${order.customer?.phone || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Customer ID:</span>
                            <span class="value">${order.customer?._id || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="info-section">
                    <div class="info-section-header">Order Status</div>
                    <div class="info-section-body">
                        <div class="info-row">
                            <span class="label">Order Status:</span>
                            <span class="value">
                                <span class="status-badge status-${(order.orderStatus || '').toLowerCase()}">
                                    ${order.orderStatus || 'Unknown'}
                                </span>
                            </span>
                        </div>
                        <div class="info-row">
                            <span class="label">Payment Status:</span>
                            <span class="value">
                                <span class="status-badge status-${(order.paymentStatus || '').toLowerCase()}">
                                    ${order.paymentStatus || 'Unknown'}
                                </span>
                            </span>
                        </div>
                        <div class="info-row">
                            <span class="label">Order Date:</span>
                            <span class="value">${formatDate(order.dates?.ordered || order.createdAt)}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Last Updated:</span>
                            <span class="value">${formatDate(order.updatedAt)}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            ${order.items && order.items.length > 0 ? `
            <div class="items-section">
                <div class="items-header">Order Items (${order.items.length})</div>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Item #</th>
                            <th>Plate Text</th>
                            <th>Style</th>
                            <th>Configuration</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map((item, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>
                                <span class="plate-text">${item.plateText || item.text || 'N/A'}</span>
                            </td>
                            <td>${item.configuration?.plateStyle || item.plateStyle || 'Standard'}</td>
                            <td>
                                ${item.configuration ? `
                                    Font: ${item.configuration.fontColor || 'Default'}<br>
                                    Border: ${item.configuration.borderStyle || 'None'}<br>
                                    Shadow: ${item.configuration.shadowEffect || 'None'}
                                ` : 'N/A'}
                            </td>
                            <td style="text-align: center;">${item.quantity || 1}</td>
                            <td style="text-align: right;">${formatCurrency(item.unitPrice || 0, order.currency)}</td>
                            <td style="text-align: right;"><strong>${formatCurrency(item.subtotal || item.price || 0, order.currency)}</strong></td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}
            
            ${order.pricing ? `
            <div class="pricing-section">
                <div class="pricing-header">Pricing Breakdown</div>
                <table class="pricing-table">
                    <tr>
                        <td>Subtotal:</td>
                        <td style="text-align: right;">${formatCurrency(order.pricing.subtotal, order.currency)}</td>
                    </tr>
                    ${order.pricing.discount > 0 ? `
                    <tr>
                        <td>Discount ${order.pricing.discountCode ? `(${order.pricing.discountCode})` : ''}:</td>
                        <td style="text-align: right; color: #dc3545;">-${formatCurrency(order.pricing.discount, order.currency)}</td>
                    </tr>
                    ` : ''}
                    <tr>
                        <td>Shipping:</td>
                        <td style="text-align: right;">${order.pricing.shipping > 0 ? formatCurrency(order.pricing.shipping, order.currency) : 'Free'}</td>
                    </tr>
                    <tr>
                        <td>VAT:</td>
                        <td style="text-align: right;">${formatCurrency(order.pricing.vat || 0, order.currency)}</td>
                    </tr>
                    <tr>
                        <td><strong>Total Amount:</strong></td>
                        <td style="text-align: right;"><strong class="amount">${formatCurrency(order.pricing.total, order.currency)}</strong></td>
                    </tr>
                </table>
            </div>
            ` : ''}
            
            <div class="info-grid">
                <div class="info-section">
                    <div class="info-section-header">Payment Information</div>
                    <div class="info-section-body">
                        <div class="info-row">
                            <span class="label">Payment Method:</span>
                            <span class="value">PayPal</span>
                        </div>
                        <div class="info-row">
                            <span class="label">PayPal Order ID:</span>
                            <span class="value" style="font-family: monospace; font-size: 10px;">
                                ${order.paypalOrderId || 'N/A'}
                            </span>
                        </div>
                        <div class="info-row">
                            <span class="label">Transaction ID:</span>
                            <span class="value" style="font-family: monospace; font-size: 10px;">
                                ${order.paypalPaymentId || 'N/A'}
                            </span>
                        </div>
                        <div class="info-row">
                            <span class="label">Currency:</span>
                            <span class="value">${order.currency || 'GBP'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="shipping-section">
                    <div class="shipping-header">Shipping Information</div>
                    <div class="shipping-body">
                        ${order.shippingAddress || order.customer?.address ? `
                        <div class="address-box">
                            ${order.shippingAddress?.street || order.customer?.address ? `
                                <div><strong>Street:</strong> ${order.shippingAddress?.street || order.customer?.address}</div>
                            ` : ''}
                            ${order.shippingAddress?.city || order.customer?.city ? `
                                <div><strong>City:</strong> ${order.shippingAddress?.city || order.customer?.city}</div>
                            ` : ''}
                            ${order.shippingAddress?.postcode || order.customer?.postcode ? `
                                <div><strong>Postcode:</strong> ${order.shippingAddress?.postcode || order.customer?.postcode}</div>
                            ` : ''}
                            ${order.shippingAddress?.country || order.customer?.country ? `
                                <div><strong>Country:</strong> ${order.shippingAddress?.country || order.customer?.country}</div>
                            ` : ''}
                            ${order.shippingAddress?.phone || order.customer?.phone ? `
                                <div><strong>Phone:</strong> ${order.shippingAddress?.phone || order.customer?.phone}</div>
                            ` : ''}
                        </div>
                        ` : `
                        <div class="alert alert-info">
                            No shipping address available
                        </div>
                        `}
                    </div>
                </div>
            </div>
            
            ${order.adminNotes ? `
            <div class="info-section" style="margin-bottom: 25px;">
                <div class="info-section-header">Admin Notes</div>
                <div class="info-section-body">
                    <div style="background: #fff3cd; padding: 10px; border-radius: 5px; border-left: 4px solid #ffc107;">
                        ${order.adminNotes}
                    </div>
                </div>
            </div>
            ` : ''}
            
            <div class="footer">
                <p><strong>PlateForge Ltd</strong> - Admin Order Report</p>
                <p>Generated on ${formatDate(new Date())} | Order ID: ${order.orderId}</p>
                <p>This document contains confidential customer information - Handle with care</p>
                <br>
                <p style="font-size: 9px; color: #999;">
                    Internal Reference: ${order._id} | 
                    Database ID: ${order.orderId} | 
                    Print Time: ${new Date().toISOString()}
                </p>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
        `;

        res.send(printHTML);
        
    } catch (error) {
        console.error('Error generating print view:', error);
        res.status(500).send('<h1>Error generating print view</h1><p>' + error.message + '</p>');
    }
});

// Generate PDF endpoint for downloads
app.get('/api/admin/orders/:orderId/pdf', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ orderId });
        
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // For now, redirect to the print view
        // In production, you might want to use a PDF generation library like puppeteer
        res.redirect(`/admin/print-order/${orderId}`);
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate PDF'
        });
    }
});

// Alternative: Using HTML to PDF conversion (add this if you want actual PDF generation)
// You'll need to install: npm install puppeteer
/*
const puppeteer = require('puppeteer');

app.get('/api/admin/orders/:orderId/pdf', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ orderId });
        
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Launch puppeteer
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        // Navigate to the print page
        await page.goto(`${process.env.FRONTEND_URL || 'http://localhost:5000'}/admin/print-order/${orderId}`, {
            waitUntil: 'networkidle0'
        });
        
        // Generate PDF
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                bottom: '20px',
                left: '20px',
                right: '20px'
            }
        });
        
        await browser.close();
        
        // Send PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="order-${orderId}.pdf"`);
        res.send(pdf);
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate PDF'
        });
    }
});
*/

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

// Create Order Endpoint (called when user fills checkout form)
// app.post('/api/orders/create', async (req, res) => {
//     try {
//         const { customer, items, pricing, originalCartData } = req.body;
        
//         // Validate required fields
//         if (!customer || !items || !pricing) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Missing required order data'
//             });
//         }
        
//         // Generate internal order ID
//         const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
//         console.log('Creating order:', orderId);
        
//         // Create order with pending payment status
//         const order = new Order({
//             orderId,
//             customer,
//             orderStatus: 'pending',
//             paymentStatus: 'pending',
//             items,
//             pricing,
//             originalCartData: originalCartData || [],
//             payment: {
//                 provider: 'paypal',
//                 amount: pricing.total,
//                 currency: 'GBP'
//             },
//             dates: {
//                 ordered: new Date()
//             },
//             notes: `Order created with ${items.length} item(s). Awaiting PayPal payment.`
//         });
        
//         await order.save();
//         console.log('Order created successfully:', orderId);
        
//         res.json({
//             success: true,
//             orderId,
//             message: 'Order created successfully'
//         });
        
//     } catch (error) {
//         console.error('Error creating order:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to create order',
//             details: error.message
//         });
//     }
// });

// ===============================
// ENHANCED ORDER CREATION WITH USER INTEGRATION
// ===============================

// Update the existing order creation endpoint to link with users
app.post('/api/orders/create', async (req, res) => {
    try {
        const { customer, items, pricing, originalCartData } = req.body;
        
        // Check if user is authenticated
        const authHeader = req.headers['authorization'];
        let userId = null;
        
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                if (decoded.type === 'user') {
                    userId = decoded.id;
                }
            } catch (err) {
                console.log('Invalid token in order creation, continuing as guest');
            }
        }
        
        // Cancel any existing pending orders for this user/email
        if (userId) {
            await Order.updateMany(
                {
                    userId: userId,
                    orderStatus: 'pending',
                    paymentStatus: 'pending'
                },
                {
                    orderStatus: 'cancelled',
                    paymentStatus: 'cancelled',
                    notes: 'Cancelled due to new order creation',
                    updatedAt: new Date()
                }
            );
        } else if (customer.email) {
            await Order.updateMany(
                {
                    'customer.email': customer.email,
                    orderStatus: 'pending',
                    paymentStatus: 'pending'
                },
                {
                    orderStatus: 'cancelled',
                    paymentStatus: 'cancelled',
                    notes: 'Cancelled due to new order creation',
                    updatedAt: new Date()
                }
            );
        }
        
        // Validate required fields
        if (!customer || !items || !pricing) {
            return res.status(400).json({
                success: false,
                error: 'Missing required order data'
            });
        }
        
        // Generate our internal order ID
        const orderId = await generateScalableOrderId();
        
        console.log('Creating new order:', orderId, userId ? `for user ${userId}` : 'as guest');
        
        // Create order with PENDING status and complete cart data
        const order = new Order({
            orderId,
            userId,
            customer,
            orderStatus: 'pending',
            paymentStatus: 'pending',
            items,
            pricing,
            originalCartData: originalCartData || [],
            payment: {
                provider: 'paypal', // We know it will be PayPal
                amount: pricing.total,
                currency: 'GBP'
                // paypalOrderId will be added later
            },
            dates: {
                ordered: new Date()
            },
            notes: `Order created with ${items.length} item(s). ${userId ? '(Authenticated User)' : '(Guest)'} Awaiting PayPal payment.`
        });
        
        const savedOrder = await order.save();
        
        // Save address for authenticated users
        if (userId) {
            try {
                const user = await User.findById(userId);
                if (user) {
                    const existingAddress = user.addresses.find(addr => 
                        addr.address === customer.address &&
                        addr.city === customer.city &&
                        addr.postcode === customer.postcode
                    );
                    
                    if (!existingAddress) {
                        user.addresses.push({
                            type: 'both',
                            firstName: customer.firstName,
                            lastName: customer.lastName,
                            address: customer.address,
                            city: customer.city,
                            postcode: customer.postcode,
                            country: customer.country,
                            isDefault: user.addresses.length === 0
                        });
                        await user.save();
                        console.log('Address saved for user:', userId);
                    }
                }
            } catch (userError) {
                console.error('Error updating user address:', userError);
            }
        }
        
        res.status(201).json({
            success: true,
            data: {
                orderId: savedOrder.orderId,
                _id: savedOrder._id,
                message: 'Order created successfully - ready for payment'
            }
        });
        
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create order'
        });
    }
});

// Update Order Schema to include userId
// Add this to your existing orderSchema (before the model creation)

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

// FIXED: PayPal payment capture endpoint (the one your frontend calls)
app.post('/capture-paypal-payment', async (req, res) => {
    try {
        const { paypalOrderId } = req.body;
        
        if (!paypalOrderId) {
            return res.status(400).json({
                success: false,
                error: 'PayPal order ID is required'
            });
        }

        // Find existing order by PayPal order ID
        const existingOrder = await Order.findOne({ 'payment.paypalOrderId': paypalOrderId });
        if (!existingOrder) {
            return res.status(404).json({
                success: false,
                error: 'Order not found for this PayPal transaction'
            });
        }

        // Check if already processed
        if (existingOrder.paymentStatus === 'paid') {
            console.log('Order already processed:', existingOrder.orderId);
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
            if (captureError.response?.data?.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED') {
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
                amount = existingOrder.payment.amount;
                paymentDetails = { id: paypalOrderId, amount: { value: amount, currency_code: 'GBP' } };
            }
            
            // Update order status to paid
            const updatedOrder = await Order.findOneAndUpdate(
                { orderId: existingOrder.orderId },
                { 
                    paymentStatus: 'paid',
                    orderStatus: 'processing',
                    'payment.paypalPaymentId': paymentDetails.id,
                    'payment.transactionId': paymentDetails.id,
                    'payment.amount': amount,
                    'dates.paid': new Date(),
                    notes: `Payment completed successfully via PayPal. Transaction: ${paymentDetails.id}`,
                    updatedAt: new Date()
                },
                { new: true }
            );
            
            console.log('Order payment completed:', existingOrder.orderId);
            
            return res.json({
                success: true,
                status: 'COMPLETED',
                orderId: updatedOrder.orderId,
                paymentId: paymentDetails.id,
                amount: amount,
                currency: paymentDetails.amount?.currency_code || 'GBP'
            });
            
        } else {
            return res.status(400).json({
                success: false,
                error: 'Payment not completed',
                status: captureRes.data.status
            });
        }

    } catch (err) {
        console.error('Error capturing PayPal payment:', err.response ? err.response.data : err.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to capture payment',
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

// Update Order with Worldpay Payment ID
app.patch('/api/orders/:orderId/worldpay', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { worldpayPaymentId, transactionReference } = req.body;
        
        const order = await Order.findOneAndUpdate(
            { orderId },
            { 
                'payment.provider': 'worldpay',
                'payment.worldpayPaymentId': worldpayPaymentId,
                'payment.worldpayTransactionRef': transactionReference,
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
        
        console.log('Order updated with Worldpay ID:', orderId, worldpayPaymentId);
        
        res.json({
            success: true,
            message: 'Order updated with Worldpay payment ID'
        });
        
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update order'
        });
    }
});

// ===============================
// ADDRESS MANAGEMENT ROUTES (ADD AFTER USER ORDERS ROUTES)
// ===============================

// Add new address
app.post('/api/user/addresses', authenticateUserToken, async (req, res) => {
    try {
        const { type, firstName, lastName, address, city, postcode, country, isDefault } = req.body;
        
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // If this is set as default, remove default from other addresses
        if (isDefault) {
            user.addresses.forEach(addr => addr.isDefault = false);
        }

        // If this is the first address, make it default
        const makeDefault = isDefault || user.addresses.length === 0;

        // Add new address
        const newAddress = {
            type: type || 'both',
            firstName,
            lastName,
            address,
            city,
            postcode,
            country: country || 'GB',
            isDefault: makeDefault
        };

        user.addresses.push(newAddress);
        await user.save();

        res.json({
            success: true,
            message: 'Address added successfully',
            addresses: user.addresses
        });

    } catch (error) {
        console.error('Error adding address:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add address'
        });
    }
});

// Update address
app.put('/api/user/addresses/:addressId', authenticateUserToken, async (req, res) => {
    try {
        const { addressId } = req.params;
        const { type, firstName, lastName, address, city, postcode, country, isDefault } = req.body;
        
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
        if (addressIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Address not found'
            });
        }

        // If this is set as default, remove default from other addresses
        if (isDefault) {
            user.addresses.forEach(addr => addr.isDefault = false);
        }

        // Update address
        user.addresses[addressIndex] = {
            ...user.addresses[addressIndex],
            type: type || 'both',
            firstName,
            lastName,
            address,
            city,
            postcode,
            country: country || 'GB',
            isDefault: isDefault || false
        };

        await user.save();

        res.json({
            success: true,
            message: 'Address updated successfully',
            addresses: user.addresses
        });

    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update address'
        });
    }
});

// Delete address
app.delete('/api/user/addresses/:addressId', authenticateUserToken, async (req, res) => {
    try {
        const { addressId } = req.params;
        
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
        if (addressIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Address not found'
            });
        }

        // Check if this was the default address
        const wasDefault = user.addresses[addressIndex].isDefault;

        // Remove address
        user.addresses.splice(addressIndex, 1);

        // If the deleted address was default and there are other addresses, make the first one default
        if (wasDefault && user.addresses.length > 0) {
            user.addresses[0].isDefault = true;
        }

        await user.save();

        res.json({
            success: true,
            message: 'Address deleted successfully',
            addresses: user.addresses
        });

    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete address'
        });
    }
});

// Get user addresses
app.get('/api/user/addresses', authenticateUserToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            addresses: user.addresses
        });

    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch addresses'
        });
    }
});

// Order cleanup function - call this periodically
const cleanupPendingOrders = async () => {
    try {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        
        const result = await Order.updateMany(
            {
                orderStatus: 'pending',
                paymentStatus: 'pending',
                'dates.ordered': { $lt: thirtyMinutesAgo }
            },
            {
                orderStatus: 'cancelled',
                paymentStatus: 'cancelled',
                notes: 'Auto-cancelled after 30 minutes of inactivity',
                updatedAt: new Date()
            }
        );
        
        if (result.modifiedCount > 0) {
            console.log(`🧹 Cleaned up ${result.modifiedCount} pending orders`);
        }
    } catch (error) {
        console.error('Error cleaning up orders:', error);
    }
};

// Run cleanup every 15 minutes
setInterval(cleanupPendingOrders, 15 * 60 * 1000);






app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});