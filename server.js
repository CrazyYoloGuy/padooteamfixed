const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const http = require('http');
const webpush = require('web-push');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server for WebSocket
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients with their user info
const clients = new Map();

// Configure web-push for push notifications
webpush.setVapidDetails(
    'mailto:admin@padoodelivery.com',
    'BG_qTrWFr2qESzBzbog1Ajx_6r79bf4WheyZD2jgdzz_o68TzMkzR4Fd-WS0Y-G2gJK7xQcD0HvQ259UgQk4kM8', // Public key (matches client)
    'G3uFORceYvwJtXujTs_dagHETHd1sGIJrRndMP7-hDk' // Private key (keep secret)
);

console.log('🔔 Web push notifications configured');

// In-memory session store (in production, use Redis or database)
const activeSessions = new Map(); // userId -> sessionData
const sessionTokens = new Map(); // sessionToken -> userId

// Session management functions
function createSession(userId, userType, sessionToken) {
    const sessionData = {
        userId,
        userType,
        sessionToken,
        createdAt: new Date(),
        lastActivity: new Date(),
        userAgent: null,
        ipAddress: null
    };

    // Remove any existing session for this user
    removeUserSession(userId);

    // Store new session
    activeSessions.set(userId, sessionData);
    sessionTokens.set(sessionToken, userId);

    console.log(`✅ Session created for ${userType} ${userId}`);
    return sessionData;
}

function removeUserSession(userId) {
    const existingSession = activeSessions.get(userId);
    if (existingSession) {
        sessionTokens.delete(existingSession.sessionToken);
        activeSessions.delete(userId);
        console.log(`🗑️ Removed existing session for user ${userId}`);
        return existingSession;
    }
    return null;
}

function validateSession(sessionToken) {
    const userId = sessionTokens.get(sessionToken);
    if (!userId) {
        return null;
    }

    const session = activeSessions.get(userId);
    if (!session) {
        sessionTokens.delete(sessionToken);
        return null;
    }

    // Update last activity
    session.lastActivity = new Date();
    return session;
}

function isUserLoggedIn(userId) {
    return activeSessions.has(userId);
}

function getUserSession(userId) {
    return activeSessions.get(userId);
}

// Cleanup expired sessions (run every 5 minutes)
setInterval(() => {
    const now = new Date();
    const expiredSessions = [];

    for (const [userId, session] of activeSessions.entries()) {
        // Session expires after 24 hours of inactivity
        const timeDiff = now - session.lastActivity;
        if (timeDiff > 24 * 60 * 60 * 1000) {
            expiredSessions.push(userId);
        }
    }

        expiredSessions.forEach(userId => {
        removeUserSession(userId);
        console.log(`⏰ Cleaned up expired session for user ${userId}`);
    });
}, 5 * 60 * 1000);

// WebSocket connection handler
wss.on('connection', (ws, req) => {
    console.log('🔌 New WebSocket connection');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'authenticate') {
                const userId = data.userId;
                const userType = data.userType; // 'driver' or 'shop'
                const shopId = data.shopId; // for shop users

                // Validate session for WebSocket connection
                const session = getUserSession(userId);
                if (!session) {
                    console.log(`❌ WebSocket authentication rejected: No active session for ${userType} ${userId}`);
                    ws.send(JSON.stringify({
                        type: 'authentication_failed',
                        message: 'No active session found. Please log in again.'
                    }));
                    return;
                }

                // Store client with user info
                clients.set(ws, {
                    userId: userId,
                    userType: userType,
                    shopId: shopId,
                    sessionToken: session.sessionToken
                });

                console.log(`👤 User authenticated: ${userType} ${userId}`);

                // Send acknowledgment
                ws.send(JSON.stringify({
                    type: 'authenticated',
                    success: true
                }));
            } else if (data.type === 'session_heartbeat') {
                // Update session activity
                const client = clients.get(ws);
                if (client) {
                    const currentSession = getUserSession(client.userId);
                    if (currentSession) {
                        currentSession.lastActivity = new Date();
                    }
                }
            } else if (data.type === 'notification_update') {
                // Handle real-time notification updates
                handleNotificationUpdate(ws, data);
            } else if (data.type === 'order_action') {
                // data: { orderId, shopId, action: 'confirm'|'delete', order }
                if (data.shopId && data.action && data.order) {
                    broadcastOrderUpdateToShop(data.shopId, data.action, data.order);
                }
            }
        } catch (error) {
            console.error('❌ WebSocket message error:', error);
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log('🔌 WebSocket disconnected');
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        clients.delete(ws);
    });
});

// Broadcast notification to specific user
function broadcastToUser(userId, userType, notification) {
    clients.forEach((client, ws) => {
        if (ws.readyState === WebSocket.OPEN &&
            client.userId === userId &&
            client.userType === userType) {
            ws.send(JSON.stringify({
                type: 'notification',
                data: notification
            }));
        }
    });
}

// Broadcast notification to shop
function broadcastToShop(shopId, notification) {
    clients.forEach((client, ws) => {
        if (ws.readyState === WebSocket.OPEN &&
            client.userType === 'shop' &&
            client.shopId === parseInt(shopId)) {
            ws.send(JSON.stringify({
                type: 'notification',
                data: notification
            }));
        }
    });
}

// Broadcast notification count update
function broadcastNotificationCount(userId, userType, count) {
    clients.forEach((client, ws) => {
        if (ws.readyState === WebSocket.OPEN &&
            client.userId === userId &&
            client.userType === userType) {
            ws.send(JSON.stringify({
                type: 'notification_count',
                count: count
            }));
        }
    });
}

// Broadcast order removal to all drivers except the one who accepted it
function broadcastOrderRemoval(orderId, acceptingDriverId) {
    const message = JSON.stringify({
        type: 'order_removed',
        order_id: orderId,
        accepted_by: acceptingDriverId
    });

    // Send to all connected drivers except the accepting one
    clients.forEach((client, ws) => {
        if (ws.readyState === WebSocket.OPEN &&
            client.userType === 'driver' &&
            client.userId !== acceptingDriverId) {
            ws.send(message);
        }
    });
}

// Enhanced real-time notification updates with cross-platform support
function handleNotificationUpdate(ws, data) {
    const client = clients.get(ws);
    if (!client) {
        console.log('❌ No authenticated client for notification update');
        return;
    }

    console.log(`🔄 Processing notification update for ${client.userType} ${client.userId}:`, data.action);

    // Broadcast the update to all connected clients of the same type and user
    let updatesSent = 0;
    clients.forEach((otherClient, otherWs) => {
        if (otherWs.readyState === WebSocket.OPEN &&
            otherClient.userType === client.userType &&
            otherClient.userId === client.userId) {

            try {
                otherWs.send(JSON.stringify({
                    type: 'notification_update',
                    action: data.action,
                    notificationId: data.notificationId,
                    data: data.data,
                    timestamp: new Date().toISOString()
                }));
                updatesSent++;
            } catch (error) {
                console.error(`❌ Failed to send notification update to ${otherClient.userType} ${otherClient.userId}:`, error);
            }
        }
    });

    console.log(`📡 Notification update broadcasted to ${updatesSent} clients`);
}

// Enhanced broadcast notification update with reliability improvements
function broadcastNotificationUpdate(userId, userType, action, notificationId, data) {
    let updatesSent = 0;
    let failedSends = 0;

    console.log(`📡 Broadcasting ${action} update for notification ${notificationId} to ${userType} ${userId}`);

    clients.forEach((client, ws) => {
        if (ws.readyState === WebSocket.OPEN &&
            client.userId === userId &&
            client.userType === userType) {

            try {
                ws.send(JSON.stringify({
                    type: 'notification_update',
                    action: action,
                    notificationId: notificationId,
                    data: data,
                    timestamp: new Date().toISOString(),
                    reliability: true
                }));
                updatesSent++;
            } catch (error) {
                console.error(`❌ Failed to send notification update to ${userType} ${userId}:`, error);
                failedSends++;

                // Remove dead connection
                if (error.code === 'ECONNRESET' || error.code === 'EPIPE') {
                    console.log(`🧹 Cleaning up dead connection for ${userType} ${userId}`);
                    clients.delete(ws);
                }
            }
        }
    });

    console.log(`✅ Notification update sent to ${updatesSent} clients, ${failedSends} failed`);
    return { sent: updatesSent, failed: failedSends };
}

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase configuration missing!');
    console.error('Please check your .env file has:');
    console.error('- SUPABASE_URL');
    console.error('- SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files with proper MIME types
app.use(express.static('.', {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json');
        } else if (path.endsWith('.svg')) {
            res.setHeader('Content-Type', 'image/svg+xml');
        } else if (path.endsWith('manifest.json')) {
            res.setHeader('Content-Type', 'application/manifest+json');
        }
    }
}));

// Middleware to extract and validate user from session token
function authenticateUser(req, res, next) {
    try {
        // Try to get user from session token in Authorization header
        const authHeader = req.headers.authorization;
        let sessionToken = null;
        let userId = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            sessionToken = authHeader.substring(7);
        }

        // Validate session if token is provided
        if (sessionToken) {
            const session = validateSession(sessionToken);
            if (session) {
                userId = session.userId;
                req.userType = session.userType;
                console.log(`✅ Session validated for ${session.userType} ${userId}`);
            } else {
                console.log('❌ Invalid or expired session token');
                return res.status(401).json({
                    success: false,
                    message: 'Session expired. Please log in again.'
                });
            }
        }

        // Alternative: check for user ID in request body (for backward compatibility)
        if (!userId && req.body && req.body.userId) {
            userId = req.body.userId;
        }

        // Alternative: check for user ID in query params
        if (!userId && req.query && req.query.userId) {
            userId = req.query.userId;
        }

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please provide user ID.'
            });
        }

        // Set user object with ID for consistent access
        req.user = { id: userId };
        req.userId = userId; // Keep for backward compatibility

        console.log('✅ User authenticated:', userId);
        next();
    } catch (error) {
        console.error('❌ Authentication error:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid authentication'
        });
    }
}

// ==================== ROUTES ====================

// Serve landing page as root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'landingpage', 'index.html'));
});

// Serve icons folder explicitly
app.use('/icons', express.static('icons', {
    setHeaders: (res, path) => {
        if (path.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
        } else if (path.endsWith('.ico')) {
            res.setHeader('Content-Type', 'image/x-icon');
        }
    }
}));

// Serve PWA files explicitly
app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.sendFile(path.join(__dirname, 'manifest.json'));
});

app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'sw.js'));
});

// Serve icons folder explicitly
app.use('/icons', express.static('icons', {
    setHeaders: (res, path) => {
        if (path.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
        } else if (path.endsWith('.ico')) {
            res.setHeader('Content-Type', 'image/x-icon');
        }
    }
}));

// Serve landing page static files
app.use('/landingpage', express.static('landingpage'));

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login', 'index.html'));
});

// Serve login static files
app.use('/login', express.static('login'));

// Serve main app (delivery app)
app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, 'mainapp', 'delivery', 'index.html'));
});

// Serve delivery app static files
app.use('/mainapp', express.static('mainapp'));

// Serve shop app
app.get('/shop', (req, res) => {
    res.sendFile(path.join(__dirname, 'mainapp', 'shop', 'index.html'));
});

// Serve dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard', 'index.html'));
});

// Serve dashboard static files
app.use('/dashboard', express.static('dashboard'));

// ==================== API ENDPOINTS ====================

// API health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is working',
        timestamp: new Date().toISOString(),
        database: 'Connected to Supabase'
    });
});

// GET /api/admin/users - Get all users from database
app.get('/api/admin/users', async (req, res) => {
    try {
        console.log('Loading users from database...');

        const { data, error } = await supabase
            .from('users')
            .select('id, email, user_type, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        console.log('Users loaded:', data?.length || 0);

        res.json({
            success: true,
            users: data || []
        });
    } catch (error) {
        console.error('Error loading users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load users',
            error: error.message
        });
    }
});

// POST /api/admin/users - Create new user
app.post('/api/admin/users', async (req, res) => {
    try {
        const { email, password, user_type } = req.body;

        console.log('Creating user:', email, user_type);

        if (!email || !password || !user_type) {
            return res.status(400).json({
                success: false,
                message: 'Email, password, and user type are required'
            });
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const { data, error } = await supabase
            .from('users')
            .insert([{
                id: uuidv4(),
                email: email,
                password: hashedPassword,
                user_type: user_type
            }])
            .select('id, email, user_type, created_at')
            .single();

        if (error) {
            throw error;
        }

        console.log('User created successfully:', data.id);

        res.json({
            success: true,
            user: data
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create user',
            error: error.message
        });
    }
});

// DELETE /api/admin/users/:id - Delete user
app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        console.log('Deleting user:', id);

        // First, check if user exists
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id, email, user_type')
            .eq('id', id)
            .single();

        if (checkError || !existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Delete user from database
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) {
            throw error;
        }

        console.log('User deleted successfully:', id);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user',
            error: error.message
        });
    }
});

// PUT /api/admin/users/:id - Update user
app.put('/api/admin/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { email, user_type } = req.body;

        console.log('Updating user:', id, { email, user_type });

        // First, check if user exists
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id, email, user_type')
            .eq('id', id)
            .single();

        if (checkError || !existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prepare update data
        const updateData = {};
        if (email && email !== existingUser.email) {
            updateData.email = email;
        }
        if (user_type && user_type !== existingUser.user_type) {
            updateData.user_type = user_type;
        }

        // Only update if there are changes
        if (Object.keys(updateData).length === 0) {
            return res.json({
                success: true,
                message: 'No changes needed',
                user: existingUser
            });
        }

        // Update user in database
        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select('id, email, user_type, created_at')
            .single();

        if (error) {
            throw error;
        }

        console.log('User updated successfully:', id);

        res.json({
            success: true,
            user: data
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user',
            error: error.message
        });
    }
});

// GET /api/admin/shop-accounts - Get all shop accounts from database
app.get('/api/admin/shop-accounts', async (req, res) => {
    try {
        console.log('Loading shop accounts from database...');

        const { data, error } = await supabase
            .from('shop_accounts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        console.log('Shop accounts loaded:', data?.length || 0);

        res.json({
            success: true,
            shopAccounts: data || []
        });
    } catch (error) {
        console.error('Error loading shop accounts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load shop accounts',
            error: error.message
        });
    }
});

// POST /api/admin/shop-accounts - Create a new shop account
app.post('/api/admin/shop-accounts', async (req, res) => {
    try {
        const { email, password, shop_name, contact_person, phone, address, afm, category_id, status } = req.body;
        if (!email || !password || !shop_name || !afm || !category_id) {
            return res.status(400).json({ success: false, message: 'Email, password, shop name, AFM, and category are required' });
        }

        console.log('Creating shop account:', { email, shop_name, category_id });

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if email already exists in shop_accounts
        const { data: existingShop } = await supabase
            .from('shop_accounts')
            .select('email')
            .eq('email', email)
            .single();

        if (existingShop) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        // Create shop account (only in shop_accounts table - no duplicate in users table)
        const { data: shop, error: shopError } = await supabase
            .from('shop_accounts')
            .insert([{
                email,
                password: hashedPassword,
                shop_name,
                contact_person,
                phone,
                address,
                afm,
                category_id: parseInt(category_id),
                status: status || 'active'
            }])
            .select('*')
            .single();

        if (shopError || !shop) {
            console.error('Shop creation error:', shopError);
            return res.status(500).json({ success: false, message: 'Failed to create shop account', error: shopError?.message });
        }

        console.log('Shop account created successfully:', shop.id);
        res.json({ success: true, shop });
    } catch (error) {
        console.error('Error creating shop account:', error);
        res.status(500).json({ success: false, message: 'Failed to create shop account', error: error.message });
    }
});

// PUT /api/admin/shop-accounts/:id - Update a shop account
app.put('/api/admin/shop-accounts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { shop_name, contact_person, phone, address, afm, category_id, status } = req.body;
        const updates = { shop_name, contact_person, phone, address, afm, category_id: category_id ? parseInt(category_id) : undefined, status, updated_at: new Date().toISOString() };
        const { data, error } = await supabase
            .from('shop_accounts')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single();
        if (error || !data) {
            return res.status(500).json({ success: false, message: 'Failed to update shop account', error: error?.message });
        }
        res.json({ success: true, shop: data });
    } catch (error) {
        console.error('Error updating shop account:', error);
        res.status(500).json({ success: false, message: 'Failed to update shop account', error: error.message });
    }
});

// DELETE /api/admin/shop-accounts/:id - Delete shop account
app.delete('/api/admin/shop-accounts/:id', async (req, res) => {
    try {
        const { id } = req.params;

        console.log('Deleting shop account:', id);

        const { error } = await supabase
            .from('shop_accounts')
            .delete()
            .eq('id', id);

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            message: 'Shop account deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting shop account:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete shop account',
            error: error.message
        });
    }
});

// GET /api/admin/orders - Get orders from database
app.get('/api/admin/orders', async (req, res) => {
    try {
        console.log('Loading orders from database...');

        // Get orders with user information
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select(`
                *,
                users!inner(email),
                partner_shops(name)
            `)
            .order('created_at', { ascending: false });

        if (ordersError) {
            console.error('Orders error:', ordersError);
            // If orders table doesn't exist, return empty array
            return res.json({
                success: true,
                orders: []
            });
        }

        // Format the orders for the dashboard
        const formattedOrders = (orders || []).map(order => ({
            id: order.id,
            user_id: order.user_id, // Add user_id
            shop_id: order.shop_id, // Add shop_id
            user_email: order.users?.email || 'Unknown',
            shop_name: order.partner_shops?.name || 'Unknown Shop',
            price: order.price,
            earnings: order.earnings,
            notes: order.notes,
            created_at: order.created_at
        }));

        console.log('Orders loaded:', formattedOrders.length);

        res.json({
            success: true,
            orders: formattedOrders
        });
    } catch (error) {
        console.error('Error loading orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load orders',
            error: error.message
        });
    }
});

// POST /api/auth/login - Database authentication
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, loginType } = req.body;

        console.log('🔐 Login attempt:', email, 'as', loginType);

        if (!email || !password || !loginType) {
            return res.status(400).json({
                success: false,
                message: 'Email, password, and login type are required'
            });
        }

        let user = null;
        let redirectUrl = '';

        if (loginType === 'driver') {
            // Check users table for drivers
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (error || !data) {
                console.log('❌ Driver not found:', email);
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, data.password);
            if (!isValidPassword) {
                console.log('❌ Invalid password for driver:', email);
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            user = data;
            redirectUrl = '/app';

        } else if (loginType === 'shop') {
            // Check shop_accounts table for shops
            const { data, error } = await supabase
                .from('shop_accounts')
                .select('*')
                .eq('email', email)
                .single();

            if (error || !data) {
                console.log('❌ Shop not found:', email);
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, data.password);
            if (!isValidPassword) {
                console.log('❌ Invalid password for shop:', email);
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            user = data;
            console.log('Shop authenticated, ID:', user.id);
            redirectUrl = '/shop';

        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid login type. Must be "driver" or "shop"'
            });
        }

        // Check if user is already logged in and immediately log them out
        if (isUserLoggedIn(user.id)) {
            const existingSession = getUserSession(user.id);
            console.log(`⚠️ User ${user.email} already has an active session - logging them out immediately`);
            removeUserSession(user.id);
            const conflictNotification = {
                type: 'session_conflict',
                message: 'Someone else has logged into your account. You have been logged out.',
                timestamp: new Date().toISOString(),
                newLoginTime: new Date().toISOString(),
                immediate: true
            };
            broadcastToUser(user.id, loginType, conflictNotification);
            // Force close any WebSocket connections for this user (shop or driver)
            clients.forEach((client, ws) => {
                if (client.userId === user.id && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'force_logout',
                        message: 'Your session has been terminated due to new login',
                        timestamp: new Date().toISOString()
                    }));
                    ws.close(1000, 'Session terminated');
                }
            });
            console.log(`🔄 Immediately logged out existing session for ${user.email}`);
        }

        // Create new session
        const sessionToken = `session_${user.id}_${Date.now()}`;
        const sessionData = createSession(user.id, loginType, sessionToken);

        // Store user agent and IP for session tracking
        sessionData.userAgent = req.headers['user-agent'];
        sessionData.ipAddress = req.ip || req.connection.remoteAddress;

        console.log('✅ Login successful:', user.email, '-> Redirecting to:', redirectUrl);

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            success: true,
            message: 'Login successful',
            user: userWithoutPassword,
            userType: loginType,
            sessionToken: sessionToken,
            redirectUrl: redirectUrl,
            sessionCreated: sessionData.createdAt
        });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
});

// POST /api/auth/logout - Logout and clear session
app.post('/api/auth/logout', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const userType = req.userType || 'driver';

        console.log(`🚪 Logout request for ${userType} ${userId}`);

        // Remove session
        const removedSession = removeUserSession(userId);

        if (removedSession) {
            console.log(`✅ Session removed for ${userType} ${userId}`);
            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        } else {
            console.log(`⚠️ No active session found for ${userType} ${userId}`);
            res.json({
                success: true,
                message: 'No active session found'
            });
        }

    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed',
            error: error.message
        });
    }
});

// PUT /api/user/settings - Update user settings
app.put('/api/user/settings', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { earnings_per_order } = req.body;

        console.log(`⚙️ Updating settings for user ${userId}:`, req.body);

        // Validate earnings_per_order
        if (earnings_per_order !== undefined && (isNaN(earnings_per_order) || earnings_per_order < 0)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid earnings per order value'
            });
        }

        // Set user context for RLS policies
        await supabase.rpc('set_request_user_id', { user_id: userId });

        // Check if user settings exist
        const { data: existingSettings, error: checkError } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking user settings:', checkError);
            throw checkError;
        }

        let result;

        if (existingSettings) {
            // Update existing settings
            const { data, error } = await supabase
                .from('user_settings')
                .update({
                    earnings_per_order: earnings_per_order,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select('*')
                .single();

            if (error) {
                console.error('Error updating user settings:', error);
                throw error;
            }

            result = data;
        } else {
            // Create new settings
            const { data, error } = await supabase
                .from('user_settings')
                .insert({
                    user_id: userId,
                    earnings_per_order: earnings_per_order || 1.50
                })
                .select('*')
                .single();

            if (error) {
                console.error('Error creating user settings:', error);
                throw error;
            }

            result = data;
        }

        console.log(`✅ Settings updated for user ${userId}`);

        res.json({
            success: true,
            message: 'Settings updated successfully',
            settings: result
        });

    } catch (error) {
        console.error('Error updating user settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update settings',
            error: error.message
        });
    }
});

// PUT /api/admin/users/:id/password - Change user password
app.put('/api/admin/users/:id/password', async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        console.log('Updating password for user:', id);

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password hashed successfully');

        // First check if user exists
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id, email')
            .eq('id', id)
            .single();

        if (checkError) {
            console.error('Error checking user existence:', checkError);
            if (checkError.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            throw checkError;
        }

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log('User exists:', existingUser.email);

        // Update password in database
        const { data, error } = await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('id', id)
            .select('id, email')
            .single();

        if (error) {
            console.error('Error updating password:', error);
            throw error;
        }

        console.log('User password updated successfully:', data.email);

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        console.error('Error updating user password:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update password',
            error: error.message,
            details: error.details || error.hint || 'Check server logs for more information'
        });
    }
});

// PUT /api/admin/shop-accounts/:id/password - Change shop password
app.put('/api/admin/shop-accounts/:id/password', async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        console.log(`Attempting to update password for shop ID: ${id}`);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Shop ID is required'
            });
        }

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // First check if shop exists
        const { data: existingShop, error: checkError } = await supabase
            .from('shop_accounts')
            .select('id, shop_name, email')
            .eq('id', id)
            .single();

        if (checkError) {
            console.error('Error checking shop existence:', checkError);
            return res.status(500).json({
                success: false,
                message: 'Error checking shop existence',
                error: checkError.message
            });
        }

        if (!existingShop) {
            console.error(`Shop with ID ${id} not found`);
            return res.status(404).json({
                success: false,
                message: 'Shop not found'
            });
        }

        console.log(`Found shop: ${existingShop.shop_name} (${existingShop.email})`);

        // Update password in database
        const { data, error } = await supabase
            .from('shop_accounts')
            .update({
                password: hashedPassword,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('id, shop_name, email')
            .single();

        if (error) {
            console.error('Error updating shop password:', error);
            throw error;
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Shop not found or password could not be updated'
            });
        }

        console.log('Shop password updated successfully:', data.shop_name);

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        console.error('Error updating shop password:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update password',
            error: error.message
        });
    }
});

// GET /api/user/shops - Get shops where driver is a team member (UPDATED)
app.get('/api/user/shops', authenticateUser, async (req, res) => {
    try {
        console.log('Loading team shops for driver:', req.userId);

        // Get shops where this driver is a team member
        const { data, error } = await supabase
            .from('shop_team_members')
            .select(`
                shop_id,
                shop_accounts!inner(
                    id,
                    shop_name,
                    category_id,
                    created_at,
                    status
                )
            `)
            .eq('driver_id', req.userId)
            .eq('shop_accounts.status', 'active')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        // Format the response to match the expected structure
        const shops = (data || []).map(item => ({
            id: item.shop_accounts.id,
            name: item.shop_accounts.shop_name,
            category_id: item.shop_accounts.category_id,
            created_at: item.shop_accounts.created_at
        }));

        console.log(`✅ Loaded ${shops.length} team shops for driver ${req.userId}`);

        res.json({
            success: true,
            shops: shops
        });
    } catch (error) {
        console.error('Error loading team shops:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load team shops',
            error: error.message
        });
    }
});

// POST /api/user/shops - DISABLED: Drivers can no longer create their own shops
app.post('/api/user/shops', authenticateUser, async (req, res) => {
    try {
        console.log('Driver shop creation attempt blocked for user:', req.userId);

        return res.status(403).json({
            success: false,
            message: 'Drivers can no longer create their own shops. Please contact a shop owner to add you to their team.',
            code: 'FEATURE_DISABLED'
        });
    } catch (error) {
        console.error('Error in disabled shop creation endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'This feature is no longer available',
            error: error.message
        });
    }
});

// DELETE /api/user/shops/:id - DISABLED: Drivers can no longer manage their own shops
app.delete('/api/user/shops/:id', authenticateUser, async (req, res) => {
    try {
        console.log('Driver shop deletion attempt blocked for user:', req.userId);

        return res.status(403).json({
            success: false,
            message: 'Drivers can no longer manage their own shops. Contact the shop owner if you need to be removed from a team.',
            code: 'FEATURE_DISABLED'
        });
    } catch (error) {
        console.error('Error in disabled shop deletion endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'This feature is no longer available',
            error: error.message
        });
    }
});

// PUT /api/partner_shops/:id - Update a shop name for a user
app.put('/api/partner_shops/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category_id } = req.body;

        console.log('Updating shop', id, 'for user', req.userId, 'New name:', name, 'Category ID:', category_id);

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Shop name is required'
            });
        }

        if (!category_id) {
            return res.status(400).json({
                success: false,
                message: 'Category is required'
            });
        }

        // First check if shop exists and belongs to the user
        const { data: existingShop, error: checkError } = await supabase
            .from('partner_shops')
            .select('id, name')
            .eq('id', id)
            .eq('user_id', req.userId)
            .single();

        if (checkError) {
            console.error('Error checking shop existence:', checkError);
            return res.status(404).json({
                success: false,
                message: 'Shop not found or does not belong to you'
            });
        }

        if (!existingShop) {
            return res.status(404).json({
                success: false,
                message: 'Shop not found or does not belong to you'
            });
        }

        // Update the shop name and category
        const { data, error } = await supabase
            .from('partner_shops')
            .update({ name: name, category_id: parseInt(category_id) })
            .eq('id', id)
            .eq('user_id', req.userId)
            .select('id, name, category_id, created_at')
            .single();

        if (error) {
            throw error;
        }

        console.log('✅ Shop updated successfully for user', req.userId, ':', data.id);

        res.json({
            success: true,
            shop: data,
            message: 'Shop updated successfully'
        });
    } catch (error) {
        console.error('Error updating shop:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update shop',
            error: error.message
        });
    }
});

// GET /api/user/orders - Get orders for a user (driver) - FIXED with proper user filtering
app.get('/api/user/orders', authenticateUser, async (req, res) => {
    try {
        console.log('Loading orders for user:', req.userId);

        // Filter orders by the authenticated user ID
        const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', req.userId)
            .order('created_at', { ascending: false });

        if (ordersError) {
            console.error('Error loading orders:', ordersError);
            throw ordersError;
        }

        // Get user's partner shops for joining
        const { data: shopsData, error: shopsError } = await supabase
            .from('partner_shops')
            .select('*')
            .eq('user_id', req.userId);

        if (shopsError) {
            console.error('Error loading shops:', shopsError);
            throw shopsError;
        }

        // Manually join the data
        const orders = ordersData?.map(order => {
            const shop = shopsData?.find(s => s.id === order.shop_id);
            return {
                id: order.id,
                price: order.price,
                earnings: order.earnings,
                notes: order.notes,
                address: order.address,
                created_at: order.created_at,
                shop_name: shop?.name || 'Unknown Shop'
            };
        }) || [];

        console.log(`✅ Loaded ${orders.length} orders for user ${req.userId}`);

        res.json({
            success: true,
            orders: orders
        });
    } catch (error) {
        console.error('Error loading user orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load orders',
            error: error.message
        });
    }
});

// POST /api/user/orders - Add a new order for a user - FIXED with proper user filtering
app.post('/api/user/orders', authenticateUser, async (req, res) => {
    try {
        const { shop_id, price, earnings, notes, address, payment_method } = req.body;

        console.log('Received order data:', { shop_id, price, earnings, notes, address, payment_method, userId: req.userId });

        if (!shop_id || !price || !earnings) {
            return res.status(400).json({
                success: false,
                message: 'Shop, price, and earnings are required',
                received: { shop_id, price, earnings }
            });
        }

        // Verify the shop belongs to the authenticated user
        const { data: shopData, error: shopError } = await supabase
            .from('partner_shops')
            .select('id, name')
            .eq('id', parseInt(shop_id))
            .eq('user_id', req.userId)
            .single();

        if (shopError || !shopData) {
            return res.status(400).json({
                success: false,
                message: 'Shop not found or does not belong to you'
            });
        }

        console.log('Adding order for user:', req.userId);

        // Insert the order with the authenticated user's ID
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert([{
                user_id: req.userId,
                shop_id: parseInt(shop_id),
                price: parseFloat(price),
                earnings: parseFloat(earnings),
                notes: notes || '',
                address: address || '',
                payment_method: payment_method || 'cash'
            }])
            .select('*')
            .single();

        if (orderError) {
            console.error('Error inserting order:', orderError);
            throw orderError;
        }

        // Combine the data
        const order = {
            id: orderData.id,
            price: orderData.price,
            earnings: orderData.earnings,
            notes: orderData.notes,
            address: orderData.address,
            payment_method: orderData.payment_method,
            created_at: orderData.created_at,
            shop_name: shopData.name
        };

        console.log('✅ Order added successfully for user', req.userId, ':', order.id);

        res.json({
            success: true,
            order: order,
            message: 'Order added successfully'
        });
    } catch (error) {
        console.error('Error adding order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add order',
            error: error.message
        });
    }
});

// GET /api/shop/delivery-drivers - Get available delivery drivers for shops
app.get('/api/shop/delivery-drivers', async (req, res) => {
    try {
        let { page = 1, limit = 10, search = '' } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);
        let offset = (page - 1) * limit;

        // If no search, return 5 random drivers using supported syntax
        if (!search) {
            // Get all drivers (or a reasonable limit, e.g., 100), then shuffle and pick 5
            const { data, error } = await supabase
                .from('users')
                .select('id, email, created_at')
                .eq('user_type', 'driver')
                .limit(100);
            if (error) throw error;
            // Shuffle and pick 5
            const shuffled = (data || []).sort(() => 0.5 - Math.random());
            const randomFive = shuffled.slice(0, 5);
            return res.json({
                success: true,
                drivers: randomFive,
                pagination: {
                    currentPage: 1,
                    totalPages: 1,
                    totalCount: randomFive.length,
                    hasNext: false,
                    hasPrevious: false
                }
            });
        }

        // If searching, use the existing search logic
        let query = supabase
            .from('users')
            .select('id, email, created_at')
            .eq('user_type', 'driver');
        if (search) {
            query = query.ilike('email', `%${search}%`);
        }
        const { count } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('user_type', 'driver');
        const { data, error } = await query
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });
        if (error) throw error;
        const totalPages = Math.ceil(count / limit);
        res.json({
            success: true,
            drivers: data || [],
            pagination: {
                currentPage: page,
                totalPages,
                totalCount: count,
                hasNext: page < totalPages,
                hasPrevious: page > 1
            }
        });
    } catch (error) {
        console.error('Error loading delivery drivers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load delivery drivers',
            error: error.message
        });
    }
});

// GET /api/shop/:shopId/selected-drivers - Get selected drivers for a shop
app.get('/api/shop/:shopId/selected-drivers', async (req, res) => {
    try {
        const { shopId } = req.params;

        // Get team members from shop_team_members table
        const { data, error } = await supabase
            .from('shop_team_members')
            .select(`
                driver_id,
                users!inner(id, email, created_at)
            `)
            .eq('shop_id', parseInt(shopId));

        if (error) {
            console.error('Error loading team members:', error);
            throw error;
        }

        // Format the response
        const selectedDrivers = (data || []).map(item => ({
            id: item.users.id,
            email: item.users.email,
            created_at: item.users.created_at
        }));

        console.log(`Loaded ${selectedDrivers.length} team members for shop ${shopId}`);

        res.json({
            success: true,
            selectedDrivers: selectedDrivers
        });
    } catch (error) {
        console.error('Error loading selected drivers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load selected drivers',
            error: error.message
        });
    }
});

// POST /api/shop/:shopId/add-driver - Add a driver to shop's list
app.post('/api/shop/:shopId/add-driver', async (req, res) => {
    try {
        const { shopId } = req.params;
        const { driverId } = req.body;

        if (!shopId || !driverId) {
            return res.status(400).json({
                success: false,
                message: 'Shop ID and Driver ID are required'
            });
        }

        console.log(`Shop ${shopId} wants to add driver ${driverId}`);

        // Validate shop exists first
        const { data: shopData, error: shopCheckError } = await supabase
            .from('shop_accounts')
            .select('id, shop_name')
            .eq('id', parseInt(shopId))
            .single();

        if (shopCheckError) {
            console.error('Error checking shop existence:', shopCheckError);
            return res.status(404).json({
                success: false,
                message: 'Shop not found',
                error: shopCheckError.message
            });
        }

        if (!shopData) {
            return res.status(404).json({
                success: false,
                message: 'Shop not found'
            });
        }

        // Validate driver exists
        const { data: driverData, error: driverCheckError } = await supabase
            .from('users')
            .select('id, email')
            .eq('id', driverId)
            .single();

        if (driverCheckError) {
            console.error('Error checking driver existence:', driverCheckError);
            return res.status(404).json({
                success: false,
                message: 'Driver not found',
                error: driverCheckError.message
            });
        }

        if (!driverData) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        // Check if the association already exists
        const { data: existingTeamMember, error: checkError } = await supabase
            .from('shop_team_members')
            .select('id')
            .eq('shop_id', parseInt(shopId))
            .eq('driver_id', driverId)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            // PGRST116 means not found, which is expected
            console.error('Error checking existing team member:', checkError);
            throw checkError;
        }

        if (existingTeamMember) {
            return res.json({
                success: true,
                message: 'Driver is already in your team'
            });
        }

        // Add the driver to the team
        const { data, error } = await supabase
            .from('shop_team_members')
            .insert([{
                shop_id: parseInt(shopId),
                driver_id: driverId
            }])
            .select('id')
            .single();

        if (error) {
            console.error('Error adding team member:', error);

            // Handle specific database errors
            if (error.code === '23505') {
                // Unique constraint violation - driver already in team
                return res.json({
                    success: true,
                    message: 'Driver is already in your team'
                });
            } else if (error.code === '23503') {
                // Foreign key constraint violation
                return res.status(400).json({
                    success: false,
                    message: 'Invalid shop or driver ID',
                    error: error.message
                });
            }

            throw error;
        }

        console.log(`Added driver ${driverId} to shop ${shopId} team`);

        res.json({
            success: true,
            message: 'Driver added to your delivery team',
            teamMemberId: data.id
        });
    } catch (error) {
        console.error('Error adding driver:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add driver',
            error: error.message
        });
    }
});

// DELETE /api/shop/:shopId/remove-driver/:driverId - Remove a driver from shop's team
app.delete('/api/shop/:shopId/remove-driver/:driverId', async (req, res) => {
    try {
        const { shopId, driverId } = req.params;

        if (!shopId || !driverId) {
            return res.status(400).json({
                success: false,
                message: 'Shop ID and Driver ID are required'
            });
        }

        console.log(`Shop ${shopId} wants to remove driver ${driverId}`);

        // Remove the driver from the team
        const { error } = await supabase
            .from('shop_team_members')
            .delete()
            .eq('shop_id', parseInt(shopId))
            .eq('driver_id', driverId);

        if (error) {
            console.error('Error removing team member:', error);
            throw error;
        }

        console.log(`Removed driver ${driverId} from shop ${shopId} team`);

        res.json({
            success: true,
            message: 'Driver removed from your delivery team'
        });
    } catch (error) {
        console.error('Error removing driver:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove driver',
            error: error.message
        });
    }
});

// POST /api/shop/:shopId/notify-driver/:driverId - Send notification to specific driver
app.post('/api/shop/:shopId/notify-driver/:driverId', async (req, res) => {
    try {
        const { shopId, driverId } = req.params;
        const { message } = req.body;

        if (!shopId || !driverId || !message) {
            return res.status(400).json({
                success: false,
                message: 'Shop ID, Driver ID, and message are required'
            });
        }

        console.log(`Shop ${shopId} sending notification to driver ${driverId}`);

        // Get shop information for the notification
        const { data: shopData, error: shopError } = await supabase
            .from('shop_accounts')
            .select('id, shop_name, email')
            .eq('id', parseInt(shopId))
            .single();

        if (shopError) {
            console.error('Error loading shop data:', shopError);
            throw shopError;
        }

        // Store the notification in the database
        const { data, error } = await supabase
            .from('driver_notifications')
            .insert([{
                shop_id: parseInt(shopId),
                driver_id: driverId,
                message: message
            }])
            .select('id, created_at, message, status, is_read')
            .single();

        if (error) {
            console.error('Error creating notification:', error);
            throw error;
        }

        console.log(`Notification sent to driver ${driverId} from shop ${shopId}`);

        // Broadcast real-time notification to driver
        const realtimeNotification = {
            id: data.id,
            message: data.message,
            status: data.status || 'pending',
            is_read: data.is_read || false,
            created_at: data.created_at,
            confirmed_at: null,
            shop: {
                id: shopData.id,
                name: shopData.shop_name,
                email: shopData.email
            }
        };

        broadcastToUser(driverId, 'driver', realtimeNotification);

        // Send push notification to driver's mobile device
        await sendPushNotification(driverId, 'driver', {
            id: data.id,
            title: `New order from ${shopData.shop_name}`,
            message: data.message,
            shop_name: shopData.shop_name
        });

        // Get updated notification count for driver
        const { count, error: countError } = await supabase
            .from('driver_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('driver_id', driverId)
            .eq('is_read', false);

        if (!countError) {
            broadcastNotificationCount(driverId, 'driver', count || 0);
        }

        res.json({
            success: true,
            message: 'Notification sent successfully',
            notification: {
                id: data.id,
                created_at: data.created_at
            }
        });
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send notification',
            error: error.message
        });
    }
});

// POST /api/shop/:shopId/notify-team - Send notification to entire team
app.post('/api/shop/:shopId/notify-team', async (req, res) => {
    try {
        const { shopId } = req.params;
        const { message } = req.body;

        if (!shopId || !message) {
            return res.status(400).json({
                success: false,
                message: 'Shop ID and message are required'
            });
        }

        console.log(`Shop ${shopId} sending notification to entire team`);

        // Get shop information for the notification
        const { data: shopData, error: shopError } = await supabase
            .from('shop_accounts')
            .select('id, shop_name, email')
            .eq('id', parseInt(shopId))
            .single();

        if (shopError) {
            console.error('Error loading shop data:', shopError);
            throw shopError;
        }

        // Get all team members
        const { data: teamMembers, error: teamError } = await supabase
            .from('shop_team_members')
            .select('driver_id')
            .eq('shop_id', parseInt(shopId));

        if (teamError) {
            console.error('Error loading team members:', teamError);
            throw teamError;
        }

        if (!teamMembers || teamMembers.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No team members found'
            });
        }

        // Prepare notifications for all team members
        const notifications = teamMembers.map(member => ({
            shop_id: parseInt(shopId),
            driver_id: member.driver_id,
            message: message
        }));

        // Insert all notifications
        const { data, error } = await supabase
            .from('driver_notifications')
            .insert(notifications)
            .select('id, created_at, message, status, is_read, driver_id');

        if (error) {
            console.error('Error creating notifications:', error);
            throw error;
        }

        console.log(`Sent notification to ${teamMembers.length} team members`);

        // Broadcast real-time notifications to all team members
        data.forEach(async (notificationData) => {
            const realtimeNotification = {
                id: notificationData.id,
                message: notificationData.message,
                status: notificationData.status || 'pending',
                is_read: notificationData.is_read || false,
                created_at: notificationData.created_at,
                confirmed_at: null,
                shop: {
                    id: shopData.id,
                    name: shopData.shop_name,
                    email: shopData.email
                }
            };

            broadcastToUser(notificationData.driver_id, 'driver', realtimeNotification);

            // Send push notification to each driver's mobile device
            await sendPushNotification(notificationData.driver_id, 'driver', {
                id: notificationData.id,
                title: `Team notification from ${shopData.shop_name}`,
                message: notificationData.message,
                shop_name: shopData.shop_name
            });

            // Update notification count for each driver
            const { count, error: countError } = await supabase
                .from('driver_notifications')
                .select('*', { count: 'exact', head: true })
                .eq('driver_id', notificationData.driver_id)
                .eq('is_read', false);

            if (!countError) {
                broadcastNotificationCount(notificationData.driver_id, 'driver', count || 0);
            }
        });

        res.json({
            success: true,
            message: `Notification sent to ${teamMembers.length} team members`,
            count: teamMembers.length
        });
    } catch (error) {
        console.error('Error sending team notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send team notification',
            error: error.message
        });
    }
});

// POST /api/shop/:shopId/orders - Create a new order and distribute to team members
app.post('/api/shop/:shopId/orders', async (req, res) => {
    try {
        const { shopId } = req.params;
        const { order_amount, customer_name, customer_phone, delivery_address, notes, payment_method, preparation_time } = req.body;

        if (!order_amount || !customer_phone || !delivery_address) {
            return res.status(400).json({
                success: false,
                message: 'Order amount, customer phone, and delivery address are required'
            });
        }

        console.log(`Shop ${shopId} creating new order:`, { order_amount, customer_name, customer_phone, delivery_address, preparation_time });

        // Get shop details
        const { data: shopData, error: shopError } = await supabase
            .from('shop_accounts')
            .select('shop_name')
            .eq('id', parseInt(shopId))
            .single();

        if (shopError || !shopData) {
            return res.status(404).json({
                success: false,
                message: 'Shop not found'
            });
        }

        // Create the order in shop_orders table
        const { data: orderData, error: orderError } = await supabase
            .from('shop_orders')
            .insert([{
                shop_account_id: parseInt(shopId),
                order_amount: parseFloat(order_amount),
                customer_name: customer_name || '',
                customer_phone: customer_phone,
                delivery_address: delivery_address,
                notes: notes || '',
                status: 'pending',
                preparation_time: parseInt(preparation_time) || 0
            }])
            .select('*')
            .single();

        if (orderError) {
            console.error('Error creating order:', orderError);
            throw orderError;
        }

        // Get all team members
        const { data: teamMembers, error: teamError } = await supabase
            .from('shop_team_members')
            .select('driver_id')
            .eq('shop_id', parseInt(shopId));

        if (teamError) {
            console.error('Error loading team members:', teamError);
            throw teamError;
        }

        if (teamMembers && teamMembers.length > 0) {
            // Create notification message
            const prepTimeText = preparation_time === 0 ? 'Ready Now' : `Ready in ${preparation_time} minutes`;
            const orderMessage = `🚚 New Order Available!
📦 Order #${orderData.id}
💰 Amount: €${order_amount}
📍 ${delivery_address}
📞 ${customer_phone}
⏰ ${prepTimeText}
${customer_name ? `👤 ${customer_name}` : ''}
${notes ? `📝 ${notes}` : ''}

Tap to accept this delivery order.`;

            // Prepare notifications for all team members
            const notifications = teamMembers.map(member => ({
                shop_id: parseInt(shopId),
                driver_id: member.driver_id,
                message: orderMessage,
                order_id: orderData.id
            }));

            // Insert all notifications
            const { data: notificationData, error: notificationError } = await supabase
                .from('driver_notifications')
                .insert(notifications)
                .select('id, created_at, message, status, is_read, driver_id');

            if (notificationError) {
                console.error('Error creating notifications:', notificationError);
                // Don't fail the order creation if notifications fail
            } else {
                console.log(`✅ Successfully sent ${notificationData.length} order notifications to team members`);

                // Broadcast real-time notifications to all team members
                notificationData.forEach(async (notification) => {
                    const realtimeNotification = {
                        id: notification.id,
                        message: notification.message,
                        status: notification.status || 'pending',
                        is_read: notification.is_read || false,
                        created_at: notification.created_at,
                        confirmed_at: null,
                        order_id: orderData.id,
                        shop: {
                            id: parseInt(shopId),
                            name: shopData.shop_name
                        },
                        shop_name: shopData.shop_name // Add this for backward compatibility
                    };

                    broadcastToUser(notification.driver_id, 'driver', realtimeNotification);

                    // Send push notification
                    await sendPushNotification(notification.driver_id, 'driver', {
                        id: notification.id,
                        title: `New Order from ${shopData.shop_name}`,
                        message: `€${order_amount} delivery to ${delivery_address}`,
                        shop_name: shopData.shop_name,
                        order_id: orderData.id
                    });
                });
            }
        }

        res.json({
            success: true,
            message: 'Order created and distributed to team members',
            order: {
                ...orderData,
                shop_name: shopData.shop_name
            },
            notifications_sent: teamMembers ? teamMembers.length : 0
        });

    } catch (error) {
        console.error('Error creating shop order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message
        });
    }
});

// GET /api/shop/:shopId/orders - Get orders for a shop (for history page)
app.get('/api/shop/:shopId/orders', authenticateUser, async (req, res) => {
    try {
        const { shopId } = req.params;
        const { limit = 50, offset = 0, status } = req.query;

        console.log(`Loading orders for shop ${shopId}, limit: ${limit}, offset: ${offset}, status: ${status}`);

        // Validate shopId
        if (!shopId || isNaN(parseInt(shopId))) {
            return res.status(400).json({
                success: false,
                message: 'Invalid shop ID'
            });
        }

        let query = supabase
            .from('shop_orders')
            .select('*')
            .eq('shop_account_id', parseInt(shopId))
            .order('created_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        // Filter by status if provided
        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error loading shop orders from database:', error);
            return res.status(503).json({
                success: false,
                message: 'Database error while loading orders',
                error: error.message
            });
        }

        if (!data) {
            console.log(`No orders found for shop ${shopId}`);
            return res.json({
                success: true,
                orders: [],
                total: 0
            });
        }

        // Fetch driver information for orders that have a driver assigned
        const ordersWithDriverInfo = await Promise.all(data.map(async (order) => {
            if (order.driver_id) {
                try {
                    const { data: driverData, error: driverError } = await supabase
                        .from('users')
                        .select('id, email, name')
                        .eq('id', order.driver_id)
                        .single();

                    if (!driverError && driverData) {
                        return { ...order, users: driverData, driver_email: driverData.email };
                    }
                } catch (err) {
                    console.warn(`Could not fetch driver info for order ${order.id}:`, err);
                }
            }
            return order;
        }));

        console.log(`Successfully loaded ${ordersWithDriverInfo.length} orders for shop ${shopId}`);

        res.json({
            success: true,
            orders: ordersWithDriverInfo || [],
            total: ordersWithDriverInfo.length
        });

    } catch (error) {
        console.error('Error in shop orders endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while loading orders',
            error: error.message
        });
    }
});

// PUT /api/shop/:shopId/orders/:orderId - Update order status
app.put('/api/shop/:shopId/orders/:orderId', async (req, res) => {
    try {
        const { shopId, orderId } = req.params;
        const { status, driver_id } = req.body;

        console.log(`Updating order ${orderId} for shop ${shopId}:`, { status, driver_id });

        const updateData = { status };
        if (driver_id) {
            updateData.driver_id = driver_id;
        }

        const { data, error } = await supabase
            .from('shop_orders')
            .update(updateData)
            .eq('id', parseInt(orderId))
            .eq('shop_account_id', parseInt(shopId))
            .select('*')
            .single();

        if (error) {
            console.error('Error updating order:', error);
            throw error;
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        console.log('Order updated successfully:', data.id);

        res.json({
            success: true,
            order: data,
            message: 'Order updated successfully'
        });

    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order',
            error: error.message
        });
    }
});

// GET /api/driver/:driverId/accepted-orders - Get accepted orders for a driver
app.get('/api/driver/:driverId/accepted-orders', async (req, res) => {
    try {
        const { driverId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        console.log(`Loading accepted orders for driver ${driverId}`);

        // Fetch only required columns to reduce payload
        const { data, error } = await supabase
            .from('shop_orders')
            .select('id, shop_account_id, driver_id, order_amount, customer_phone, delivery_address, status, notes, created_at, delivery_time, preparation_time, driver_earnings')
            .eq('driver_id', driverId)
            .in('status', ['assigned', 'picked_up', 'delivered'])
            .order('created_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        if (error) {
            console.error('Error loading accepted orders:', error);
            throw error;
        }

        // Batch fetch shop names to avoid N+1 queries
        const shopIds = Array.from(new Set((data || []).map(o => o.shop_account_id).filter(Boolean)));
        let shopsMap = new Map();
        if (shopIds.length > 0) {
            const { data: shops } = await supabase
                .from('shop_accounts')
                .select('id, shop_name')
                .in('id', shopIds);
            (shops || []).forEach(s => shopsMap.set(s.id, s.shop_name));
        }

        const formattedOrders = (data || []).map(order => ({
            ...order,
            shop_name: shopsMap.get(order.shop_account_id) || 'Unknown Shop'
        }));

        console.log(`Loaded ${formattedOrders.length} accepted orders for driver ${driverId}`);

        res.json({
            success: true,
            orders: formattedOrders || [],
            total: formattedOrders.length
        });

    } catch (error) {
        console.error('Error loading accepted orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load accepted orders',
            error: error.message
        });
    }
});

// Server-side cache for recent orders (5 minutes)
let recentOrdersCache = null;
let recentOrdersCacheTime = 0;
const RECENT_ORDERS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// GET /api/recent-orders - Get last 20 accepted orders with driver info (OPTIMIZED)
app.get('/api/recent-orders', authenticateUser, async (req, res) => {
    try {
        const now = Date.now();

        // Return cached data if fresh (server-side cache for all users)
        if (recentOrdersCache && (now - recentOrdersCacheTime < RECENT_ORDERS_CACHE_TTL)) {
            console.log('Serving recent orders from server cache');
            return res.json({
                success: true,
                orders: recentOrdersCache,
                total: recentOrdersCache.length,
                cached: true
            });
        }

        console.log('Loading fresh recent accepted orders');

        // Fetch orders first, then batch lookup related data
        const { data, error } = await supabase
            .from('shop_orders')
            .select('id, shop_account_id, driver_id, order_amount, customer_phone, delivery_address, status, notes, created_at, preparation_time')
            .not('driver_id', 'is', null)
            .in('status', ['assigned', 'picked_up', 'delivered'])
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('Error loading recent orders:', error);
            throw error;
        }

        // Batch fetch shop names and driver emails to avoid N+1 queries
        const shopIds = Array.from(new Set((data || []).map(o => o.shop_account_id).filter(Boolean)));
        const driverIds = Array.from(new Set((data || []).map(o => o.driver_id).filter(Boolean)));

        let shopsMap = new Map();
        if (shopIds.length > 0) {
            const { data: shops } = await supabase
                .from('shop_accounts')
                .select('id, shop_name')
                .in('id', shopIds);
            (shops || []).forEach(s => shopsMap.set(s.id, s.shop_name));
        }

        let driversMap = new Map();
        if (driverIds.length > 0) {
            const { data: drivers } = await supabase
                .from('users')
                .select('id, email, name')
                .in('id', driverIds);
            (drivers || []).forEach(d => driversMap.set(d.id, d.name || d.email));
        }

        // Format with batched lookup data
        const formattedOrders = (data || []).map(order => ({
            id: order.id,
            order_amount: order.order_amount,
            customer_phone: order.customer_phone,
            delivery_address: order.delivery_address,
            status: order.status,
            notes: order.notes,
            created_at: order.created_at,
            preparation_time: order.preparation_time,
            shop_name: shopsMap.get(order.shop_account_id) || 'Unknown Shop',
            driver_email: driversMap.get(order.driver_id) || `Driver #${order.driver_id?.slice?.(0, 6)}`
        }));

        // Cache the results server-side
        recentOrdersCache = formattedOrders;
        recentOrdersCacheTime = now;

        console.log(`Loaded and cached ${formattedOrders.length} recent orders`);

        res.json({
            success: true,
            orders: formattedOrders,
            total: formattedOrders.length,
            cached: false
        });

    } catch (error) {
        console.error('Error loading recent orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load recent orders',
            error: error.message
        });
    }
});

// Server-side cache for shop completed orders (3 minutes)
let shopCompletedOrdersCache = new Map();
const SHOP_COMPLETED_ORDERS_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

// GET /api/shop/:shopId/completed-orders - Get completed orders for a shop (OPTIMIZED)
app.get('/api/shop/:shopId/completed-orders', authenticateUser, async (req, res) => {
    try {
        const { shopId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const now = Date.now();
        const cacheKey = `${shopId}_${limit}_${offset}`;

        // Return cached data if fresh (server-side cache per shop)
        if (shopCompletedOrdersCache.has(cacheKey)) {
            const cached = shopCompletedOrdersCache.get(cacheKey);
            if (now - cached.time < SHOP_COMPLETED_ORDERS_CACHE_TTL) {
                console.log(`Serving completed orders from server cache for shop ${shopId}`);
                return res.json({
                    success: true,
                    orders: cached.data,
                    total: cached.data.length,
                    cached: true
                });
            }
        }

        console.log(`Loading fresh completed orders for shop ${shopId}`);

        // Fetch completed orders with essential columns only
        const { data, error } = await supabase
            .from('shop_orders')
            .select('id, shop_account_id, driver_id, order_amount, customer_phone, delivery_address, status, notes, created_at, delivery_time, driver_earnings')
            .eq('shop_account_id', shopId)
            .eq('status', 'delivered')
            .order('created_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        if (error) {
            console.error('Error loading completed orders:', error);
            throw error;
        }

        // Batch fetch driver info for completed orders
        const driverIds = Array.from(new Set((data || []).map(o => o.driver_id).filter(Boolean)));
        let driversMap = new Map();
        if (driverIds.length > 0) {
            const { data: drivers } = await supabase
                .from('users')
                .select('id, email, name')
                .in('id', driverIds);
            (drivers || []).forEach(d => {
                driversMap.set(d.id, {
                    name: d.name || 'Driver',
                    email: d.email
                });
            });
        }

        // Format with driver info
        const formattedOrders = (data || []).map(order => {
            const driverInfo = driversMap.get(order.driver_id);
            return {
                ...order,
                driver_name: driverInfo?.name || 'Driver',
                driver_email: driverInfo?.email || 'Unknown',
                shop_name: 'Current Shop' // Shop already knows its own name
            };
        });

        // Cache the results server-side
        shopCompletedOrdersCache.set(cacheKey, { time: now, data: formattedOrders });

        console.log(`Loaded and cached ${formattedOrders.length} completed orders for shop ${shopId}`);

        res.json({
            success: true,
            orders: formattedOrders,
            total: formattedOrders.length,
            cached: false
        });

    } catch (error) {
        console.error('Error loading completed orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load completed orders',
            error: error.message
        });
    }
});
// PUT /api/orders/:orderId/complete - Mark order as completed
app.put('/api/orders/:orderId/complete', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { driver_id, auto_completed } = req.body;

        console.log(`Completing order ${orderId} by driver ${driver_id}`, {
            auto_completed: auto_completed || false
        });

        const updateData = {
            status: 'delivered',
            updated_at: new Date().toISOString()
        };

        // Mark if it was auto-completed by timer
        if (auto_completed) {
            updateData.auto_completed = true;
            updateData.completed_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('shop_orders')
            .update(updateData)
            .eq('id', parseInt(orderId))
            .eq('driver_id', driver_id)
            .select('*')
            .single();

        if (error) {
            console.error('Error completing order:', error);
            throw error;
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or not assigned to this driver'
            });
        }

        console.log(`Order ${orderId} completed successfully`);

        res.json({
            success: true,
            order: data,
            message: auto_completed ? 'Order auto-completed by timer' : 'Order completed successfully'
        });

    } catch (error) {
        console.error('Error completing order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete order',
            error: error.message
        });
    }
});

// PUT /api/orders/:orderId/pickup - Mark order as picked up with delivery time
app.put('/api/orders/:orderId/pickup', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { driver_id, delivery_time, delivery_minutes } = req.body;

        console.log(`Marking order ${orderId} as picked up by driver ${driver_id}`, {
            delivery_time,
            delivery_minutes
        });

        const updateData = {
            status: 'picked_up',
            updated_at: new Date().toISOString()
        };

        // Add delivery time fields if provided
        if (delivery_time) {
            updateData.delivery_time = delivery_time;
        }
        if (delivery_minutes) {
            updateData.delivery_minutes = delivery_minutes;
        }

        const { data, error } = await supabase
            .from('shop_orders')
            .update(updateData)
            .eq('id', parseInt(orderId))
            .eq('driver_id', driver_id)
            .select('*')
            .single();

        if (error) {
            console.error('Error updating order pickup status:', error);
            throw error;
        }

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or not assigned to this driver'
            });
        }

        console.log(`Order ${orderId} marked as picked up successfully`);

        res.json({
            success: true,
            order: data,
            message: 'Order marked as picked up'
        });

    } catch (error) {
        console.error('Error updating order pickup status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update pickup status',
            error: error.message
        });
    }
});

// GET /api/driver/:driverId/notifications - Get notifications for a driver
app.get('/api/driver/:driverId/notifications', async (req, res) => {
    try {
        const { driverId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        console.log(`Loading notifications for driver ${driverId}`);

        // Get ONLY PENDING notifications from database with shop information
        const { data, error } = await supabase
            .from('driver_notifications')
            .select(`
                id,
                message,
                status,
                is_read,
                created_at,
                confirmed_at,
                order_id,
                shop_accounts!inner(id, shop_name, email)
            `)
            .eq('driver_id', driverId)
            .eq('status', 'pending')  // Only show pending notifications
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error loading notifications:', error);
            throw error;
        }

        // Format notifications
        const notifications = (data || []).map(notification => ({
            id: notification.id,
            message: notification.message,
            status: notification.status,
            is_read: notification.is_read,
            created_at: notification.created_at,
            confirmed_at: notification.confirmed_at,
            order_id: notification.order_id,
            shop_name: notification.shop_accounts?.shop_name || 'Unknown Shop',
            shop: {
                id: notification.shop_accounts?.id,
                name: notification.shop_accounts?.shop_name || 'Unknown Shop',
                email: notification.shop_accounts?.email
            }
        }));

        // Get unread count
        const { count, error: countError } = await supabase
            .from('driver_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('driver_id', driverId)
            .eq('is_read', false);

        if (countError) {
            console.error('Error counting unread notifications:', countError);
            throw countError;
        }

        console.log(`Loaded ${notifications.length} notifications for driver ${driverId}`);

        res.json({
            success: true,
            notifications: notifications,
            unread_count: count || 0
        });
    } catch (error) {
        console.error('Error loading driver notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load notifications',
            error: error.message
        });
    }
});

// PUT /api/driver/:driverId/notifications/:notificationId/read - Mark notification as read
app.put('/api/driver/:driverId/notifications/:notificationId/read', async (req, res) => {
    try {
        const { driverId, notificationId } = req.params;

        console.log(`Marking notification ${notificationId} as read for driver ${driverId}`);

        // Update notification
        const { data, error } = await supabase
            .from('driver_notifications')
            .update({ is_read: true, updated_at: new Date().toISOString() })
            .eq('id', notificationId)
            .eq('driver_id', driverId)
            .select('id')
            .single();

        if (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }

        console.log(`Marked notification ${notificationId} as read`);

        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read',
            error: error.message
        });
    }
});

// PUT /api/driver/:driverId/notifications/read-all - Mark all notifications as read
app.put('/api/driver/:driverId/notifications/read-all', async (req, res) => {
    try {
        const { driverId } = req.params;

        console.log(`Marking all notifications as read for driver ${driverId}`);

        // Update all unread notifications
        const { data, error } = await supabase
            .from('driver_notifications')
            .update({ is_read: true, updated_at: new Date().toISOString() })
            .eq('driver_id', driverId)
            .eq('is_read', false);

        if (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }

        console.log(`Marked all notifications as read for driver ${driverId}`);

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read',
            error: error.message
        });
    }
});

// PUT /api/driver/:driverId/notifications/:notificationId/confirm - Confirm a notification (fastest-wins, atomic)
app.put('/api/driver/:driverId/notifications/:notificationId/confirm', async (req, res) => {
    try {
        const { driverId, notificationId } = req.params;
        console.log(`Confirming notification ${notificationId} for driver ${driverId}`);

        // 1) Load notification (including order_id)
        const { data: notification, error: fetchError } = await supabase
            .from('driver_notifications')
            .select('id, message, shop_id, order_id')
            .eq('id', notificationId)
            .eq('driver_id', driverId)
            .maybeSingle();

        if (fetchError || !notification) {
            console.error('Error fetching notification:', fetchError);
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        // 2) If notification is linked to an order, try to atomically claim it first
        let claimedOrderId = null;
        if (notification.order_id) {
            const { data: updatedOrder, error: assignError } = await supabase
                .from('shop_orders')
                .update({ status: 'assigned', driver_id: driverId, updated_at: new Date().toISOString() })
                .eq('id', notification.order_id)
                .eq('status', 'pending')
                .select('id')
                .maybeSingle();

            if (assignError) {
                console.error('Error assigning order:', assignError);
                return res.status(500).json({ success: false, message: 'Failed to assign order' });
            }

            if (!updatedOrder) {
                // Another driver already claimed it - tell the client and stop here
                console.log(`Order ${notification.order_id} already assigned by another driver`);
                return res.status(409).json({ success: false, code: 'ORDER_ALREADY_ACCEPTED', message: 'Order already accepted by another driver' });
            }

            claimedOrderId = updatedOrder.id;
        }

        // 3) Mark this driver notification as confirmed
        const { data: notifUpdate, error: notifError } = await supabase
            .from('driver_notifications')
            .update({
                status: 'confirmed',
                is_read: true,
                confirmed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', notificationId)
            .eq('driver_id', driverId)
            .select('id, order_id')
            .single();

        if (notifError) {
            console.error('Error confirming notification:', notifError);
            throw notifError;
        }

        // 4) If we claimed an order, remove all other drivers' notifications and broadcast removal
        if (claimedOrderId) {
            const { error: removeError } = await supabase
                .from('driver_notifications')
                .delete()
                .eq('order_id', claimedOrderId)
                .neq('driver_id', driverId);

            if (removeError) {
                console.error('Error removing notifications from other drivers:', removeError);
            } else {
                console.log(`Removed order ${claimedOrderId} notifications from other drivers`);
                broadcastOrderRemoval(claimedOrderId, driverId);
            }
        }

        // 5) Continue with shop notification (below)
        // Get driver email for the shop notification
        const { data: driver, error: driverError } = await supabase
            .from('users')
            .select('email')
            .eq('id', driverId)
            .single();

        if (!driverError && driver) {
            // Create a notification for the shop
            const { data: shopNotification, error: shopNotificationError } = await supabase
                .from('shop_notifications')
                .insert([{
                    shop_id: notification.shop_id,
                    driver_id: driverId,
                    original_notification_id: notificationId,
                    message: `Driver ${driver.email} confirmed: "${notification.message}"`,
                    driver_email: driver.email
                }])
                .select('id, message, driver_email, created_at, is_read')
                .single();

            if (shopNotificationError) {
                console.error('Error creating shop notification:', shopNotificationError);
                // Don't fail the request, just log the error
            } else {
                // Broadcast real-time notification to shop
                const realtimeShopNotification = {
                    id: shopNotification.id,
                    message: shopNotification.message,
                    driver_email: shopNotification.driver_email,
                    is_read: shopNotification.is_read,
                    created_at: shopNotification.created_at,
                    original_notification_id: notificationId
                };

                broadcastToShop(notification.shop_id, realtimeShopNotification);

                // Get updated notification count for shop
                const { count, error: countError } = await supabase
                    .from('shop_notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('shop_id', notification.shop_id)
                    .eq('is_read', false);

                if (!countError) {
                    broadcastNotificationCount(notification.shop_id.toString(), 'shop', count || 0);
                }
            }
        }

        // Broadcast updated notification count to driver
        const { count: driverCount, error: driverCountError } = await supabase
            .from('driver_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('driver_id', driverId)
            .eq('is_read', false);

        if (!driverCountError) {
            broadcastNotificationCount(driverId, 'driver', driverCount || 0);
        }

        // Broadcast real-time update to all connected drivers
        broadcastNotificationUpdate(driverId, 'driver', 'confirmed', notificationId, {
            status: 'confirmed',
            confirmed_at: new Date().toISOString()
        });

        // Also broadcast to the shop that created the notification
        if (notification.shop_id) {
            // Broadcast to all connected shop clients for this shop
            clients.forEach((client, ws) => {
                if (ws.readyState === WebSocket.OPEN &&
                    client.userType === 'shop' &&
                    parseInt(client.shopId) === parseInt(notification.shop_id)) {
                    ws.send(JSON.stringify({
                        type: 'notification_update',
                        action: 'confirmed',
                        notificationId: notificationId,
                        data: {
                            status: 'confirmed',
                            confirmed_at: new Date().toISOString(),
                            driver_email: driver?.email
                        }
                    }));
                }
            });
        }

        console.log(`Confirmed notification ${notificationId}`);

        res.json({
            success: true,
            message: 'Notification confirmed successfully'
        });
    } catch (error) {
        console.error('Error confirming notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to confirm notification',
            error: error.message
        });
    }
});

// PUT /api/driver/:driverId/notifications/:notificationId - Edit a notification
app.put('/api/driver/:driverId/notifications/:notificationId', async (req, res) => {
    try {
        const { driverId, notificationId } = req.params;
        const { message } = req.body;

        console.log(`Editing notification ${notificationId} for driver ${driverId}`);

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Message is required and cannot be empty'
            });
        }

        // First, get the notification details
        const { data: notification, error: fetchError } = await supabase
            .from('driver_notifications')
            .select('id, shop_id, message')
            .eq('id', notificationId)
            .eq('driver_id', driverId)
            .single();

        if (fetchError || !notification) {
            console.error('Error fetching notification:', fetchError);
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        // Update notification message
        const { data, error } = await supabase
            .from('driver_notifications')
            .update({
                message: message.trim(),
                updated_at: new Date().toISOString()
            })
            .eq('id', notificationId)
            .eq('driver_id', driverId)
            .select('id, message')
            .single();

        if (error) {
            console.error('Error updating notification:', error);
            throw error;
        }

        // Broadcast real-time update to all connected drivers
        broadcastNotificationUpdate(driverId, 'driver', 'edited', notificationId, {
            message: message.trim(),
            updated_at: new Date().toISOString()
        });

        // Also broadcast to the shop that created the notification
        if (notification.shop_id) {
            // Broadcast to all connected shop clients for this shop
            clients.forEach((client, ws) => {
                if (ws.readyState === WebSocket.OPEN &&
                    client.userType === 'shop' &&
                    parseInt(client.shopId) === parseInt(notification.shop_id)) {
                    ws.send(JSON.stringify({
                        type: 'notification_update',
                        action: 'edited',
                        notificationId: notificationId,
                        data: {
                            message: message.trim(),
                            updated_at: new Date().toISOString()
                        }
                    }));
                }
            });
        }

        console.log(`Updated notification ${notificationId}`);

        res.json({
            success: true,
            message: 'Notification updated successfully',
            data: {
                id: data.id,
                message: data.message
            }
        });
    } catch (error) {
        console.error('Error updating notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update notification',
            error: error.message
        });
    }
});

// PUT /api/shop/:shopId/notifications/:notificationId - Edit a shop notification
app.put('/api/shop/:shopId/notifications/:notificationId', async (req, res) => {
    try {
        const { shopId, notificationId } = req.params;
        const { message } = req.body;

        console.log(`Editing shop notification ${notificationId} for shop ${shopId}`);

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Message is required and cannot be empty'
            });
        }

        // First, try to update in driver_notifications table
        const { data: driverNotification, error: driverError } = await supabase
            .from('driver_notifications')
            .update({
                message: message.trim(),
                updated_at: new Date().toISOString()
            })
            .eq('id', notificationId)
            .eq('shop_id', parseInt(shopId))
            .select('id, driver_id, message')
            .single();

        if (!driverError && driverNotification) {
            // Broadcast real-time update to the driver
            broadcastNotificationUpdate(driverNotification.driver_id, 'driver', 'edited', notificationId, {
                message: message.trim(),
                updated_at: new Date().toISOString()
            });

            // Broadcast real-time update to all connected shops
            broadcastNotificationUpdate(parseInt(shopId).toString(), 'shop', 'edited', notificationId, {
                message: message.trim(),
                updated_at: new Date().toISOString()
            });

            console.log(`Updated driver notification ${notificationId}`);

            res.json({
                success: true,
                message: 'Notification updated successfully',
                data: {
                    id: driverNotification.id,
                    message: driverNotification.message
                }
            });
            return;
        }

        // If not found in driver_notifications, try shop_notifications
        const { data: shopNotification, error: shopError } = await supabase
            .from('shop_notifications')
            .update({
                message: message.trim(),
                updated_at: new Date().toISOString()
            })
            .eq('id', notificationId)
            .eq('shop_id', parseInt(shopId))
            .select('id, driver_id, original_notification_id, message')
            .single();

        if (shopError || !shopNotification) {
            console.error('Error updating shop notification:', shopError);
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        // Broadcast real-time update to all connected shops
        broadcastNotificationUpdate(parseInt(shopId).toString(), 'shop', 'edited', notificationId, {
            message: message.trim(),
            updated_at: new Date().toISOString()
        });

        // Also broadcast to the driver if this is a shop notification with original_notification_id
        if (shopNotification.original_notification_id) {
            broadcastNotificationUpdate(shopNotification.driver_id, 'driver', 'edited', shopNotification.original_notification_id, {
                message: message.trim(),
                updated_at: new Date().toISOString()
            });
        }

        console.log(`Updated shop notification ${notificationId}`);

        res.json({
            success: true,
            message: 'Notification updated successfully',
            data: {
                id: shopNotification.id,
                message: shopNotification.message
            }
        });
    } catch (error) {
        console.error('Error updating shop notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update notification',
            error: error.message
        });
    }
});

// GET /api/shop/:shopId/notifications - Get notifications for a shop
app.get('/api/shop/:shopId/notifications', async (req, res) => {
    try {
        const { shopId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        console.log(`Loading notifications for shop ${shopId}`);

        // Get confirmed notifications (shop notifications)
        const { data, error } = await supabase
            .from('shop_notifications')
            .select(`
                id,
                message,
                driver_email,
                is_read,
                created_at,
                original_notification_id
            `)
            .eq('shop_id', parseInt(shopId))
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error loading shop notifications:', error);
            throw error;
        }

        // Get unread count
        const { count, error: countError } = await supabase
            .from('shop_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('shop_id', parseInt(shopId))
            .eq('is_read', false);

        if (countError) {
            console.error('Error counting unread shop notifications:', countError);
            throw countError;
        }

        console.log(`Loaded ${data?.length || 0} notifications for shop ${shopId}`);

        res.json({
            success: true,
            notifications: data || [],
            unread_count: count || 0
        });
    } catch (error) {
        console.error('Error loading shop notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load notifications',
            error: error.message
        });
    }
});

// PUT /api/shop/:shopId/notifications/:notificationId/read - Mark shop notification as read
app.put('/api/shop/:shopId/notifications/:notificationId/read', async (req, res) => {
    try {
        const { shopId, notificationId } = req.params;

        console.log(`Marking shop notification ${notificationId} as read for shop ${shopId}`);

        // Update notification
        const { data, error } = await supabase
            .from('shop_notifications')
            .update({ is_read: true, updated_at: new Date().toISOString() })
            .eq('id', notificationId)
            .eq('shop_id', parseInt(shopId))
            .select('id')
            .single();

        if (error) {
            console.error('Error marking shop notification as read:', error);
            throw error;
        }

        console.log(`Marked shop notification ${notificationId} as read`);

        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        console.error('Error marking shop notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read',
            error: error.message
        });
    }
});

// GET /api/shop/:shopId/all-notifications - Get all notifications for a shop (both pending and confirmed)
app.get('/api/shop/:shopId/all-notifications', async (req, res) => {
    try {
        const { shopId } = req.params;
        const { limit = 100, offset = 0 } = req.query;

        console.log(`Loading all notifications for shop ${shopId}`);

        // Get sent notifications (driver_notifications) with their status
        const { data: sentNotifications, error: sentError } = await supabase
            .from('driver_notifications')
            .select(`
                id,
                message,
                status,
                is_read,
                created_at,
                confirmed_at,
                users!inner(email)
            `)
            .eq('shop_id', parseInt(shopId))
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (sentError) {
            console.error('Error loading sent notifications:', sentError);
            throw sentError;
        }

        // Transform data to include driver_email and proper status
        const notifications = (sentNotifications || []).map(notification => ({
            id: notification.id,
            message: notification.message,
            status: notification.status || 'pending',
            is_read: notification.is_read || false,
            created_at: notification.created_at,
            confirmed_at: notification.confirmed_at,
            driver_email: notification.users?.email || 'Unknown Driver'
        }));

        console.log(`Loaded ${notifications.length} notifications for shop ${shopId}`);

        res.json({
            success: true,
            notifications: notifications
        });
    } catch (error) {
        console.error('Error loading all shop notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load notifications',
            error: error.message
        });
    }
});

// DELETE /api/shop/:shopId/notifications/:notificationId - Delete a notification
app.delete('/api/shop/:shopId/notifications/:notificationId', async (req, res) => {
    try {
        const { shopId, notificationId } = req.params;

        console.log(`Deleting notification ${notificationId} for shop ${shopId}`);

        // First, try to delete from driver_notifications table
        const { data: deletedDriverNotification, error: driverError } = await supabase
            .from('driver_notifications')
            .delete()
            .eq('id', notificationId)
            .eq('shop_id', parseInt(shopId))
            .select('id')
            .single();

        // If found in driver_notifications, also delete related shop_notification
        if (deletedDriverNotification && !driverError) {
            // Delete related shop notification
            const { error: shopNotificationError } = await supabase
                .from('shop_notifications')
                .delete()
                .eq('original_notification_id', notificationId);

            if (shopNotificationError) {
                console.error('Error deleting related shop notification:', shopNotificationError);
                // Don't fail the request, just log the error
            }

            // Get the driver ID to broadcast to them
            const { data: driverNotification, error: fetchError } = await supabase
                .from('driver_notifications')
                .select('driver_id')
                .eq('id', notificationId)
                .single();

            // Broadcast real-time update to the driver
            if (!fetchError && driverNotification) {
                broadcastNotificationUpdate(driverNotification.driver_id, 'driver', 'deleted', notificationId, {
                    deleted: true
                });
            }

            // Broadcast real-time update to all connected shops
            broadcastNotificationUpdate(parseInt(shopId).toString(), 'shop', 'deleted', notificationId, {
                deleted: true
            });

            console.log(`Deleted driver notification ${notificationId}`);

            res.json({
                success: true,
                message: 'Notification deleted successfully'
            });
            return;
        }

        // If not found in driver_notifications, try shop_notifications
        const { data: deletedShopNotification, error: shopError } = await supabase
            .from('shop_notifications')
            .delete()
            .eq('id', notificationId)
            .eq('shop_id', parseInt(shopId))
            .select('id')
            .single();

        if (shopError || !deletedShopNotification) {
            console.error('Error deleting shop notification:', shopError);
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        // Broadcast real-time update to all connected shops
        broadcastNotificationUpdate(parseInt(shopId).toString(), 'shop', 'deleted', notificationId, {
            deleted: true
        });

        // Also broadcast to the driver if this is a shop notification with original_notification_id
        const { data: shopNotification, error: fetchError } = await supabase
            .from('shop_notifications')
            .select('original_notification_id, driver_id')
            .eq('id', notificationId)
            .single();

        if (!fetchError && shopNotification && shopNotification.original_notification_id) {
            // Broadcast to the driver
            broadcastNotificationUpdate(shopNotification.driver_id, 'driver', 'deleted', shopNotification.original_notification_id, {
                deleted: true
            });
        }

        // Update notification count
        const { count, error: countError } = await supabase
            .from('shop_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('shop_id', parseInt(shopId))
            .eq('is_read', false);

        if (!countError) {
            broadcastNotificationCount(parseInt(shopId).toString(), 'shop', count || 0);
        }

        console.log(`Deleted shop notification ${notificationId}`);

        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification',
            error: error.message
        });
    }
});

// DELETE /api/driver/:driverId/notifications/:notificationId - Delete a notification from driver side
app.delete('/api/driver/:driverId/notifications/:notificationId', async (req, res) => {
    try {
        const { driverId, notificationId } = req.params;

        console.log(`Driver ${driverId} deleting notification ${notificationId}`);

        // Delete from driver_notifications table (driver_id is UUID, not integer)
        const { data: deletedNotification, error: deleteError } = await supabase
            .from('driver_notifications')
            .delete()
            .eq('id', notificationId)
            .eq('driver_id', driverId)
            .select('id, shop_id')
            .single();

        if (deleteError || !deletedNotification) {
            console.error('Error deleting driver notification:', deleteError);
            return res.status(404).json({
                success: false,
                message: 'Notification not found or access denied'
            });
        }

        // Also delete from shop_notifications if it exists
        const { error: shopNotificationError } = await supabase
            .from('shop_notifications')
            .delete()
            .eq('original_notification_id', notificationId);

        if (shopNotificationError) {
            console.error('Error deleting related shop notification:', shopNotificationError);
            // Don't fail the request, just log the error
        }

        // Broadcast real-time update to all connected drivers
        broadcastNotificationUpdate(driverId, 'driver', 'deleted', notificationId, {
            deleted: true
        });

        // Also broadcast to the shop that created the notification
        if (deletedNotification.shop_id) {
            // Broadcast to all connected shop clients for this shop
            clients.forEach((client, ws) => {
                if (ws.readyState === WebSocket.OPEN &&
                    client.userType === 'shop' &&
                    parseInt(client.shopId) === parseInt(deletedNotification.shop_id)) {
                    ws.send(JSON.stringify({
                        type: 'notification_update',
                        action: 'deleted',
                        notificationId: notificationId,
                        data: {
                            deleted: true
                        }
                    }));
                }
            });
        }

        // Update notification count
        const { count, error: countError } = await supabase
            .from('driver_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('driver_id', driverId)
            .eq('is_read', false);

        if (!countError) {
            broadcastNotificationCount(driverId, 'driver', count || 0);
        }

        console.log(`Successfully deleted notification ${notificationId} for driver ${driverId}`);

        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting driver notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification',
            error: error.message
        });
    }
});

// PUT /api/driver/:driverId/notifications/complete-all - Confirm all pending notifications for a driver
app.put('/api/driver/:driverId/notifications/complete-all', async (req, res) => {
    try {
        const { driverId } = req.params;
        // Update all pending notifications for this driver to 'confirmed'
        const { data, error } = await supabase
            .from('driver_notifications')
            .update({
                status: 'confirmed',
                is_read: true,
                confirmed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('driver_id', driverId)
            .eq('status', 'pending');
        if (error) {
            console.error('Error confirming all notifications:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to confirm all notifications',
                error: error.message
            });
        }
        res.json({
            success: true,
            message: 'All notifications confirmed successfully'
        });
    } catch (error) {
        console.error('Error in complete-all endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get user settings
app.get('/api/user/settings', authenticateUser, async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        // Set user context for RLS policies
        await supabase.rpc('set_request_user_id', { user_id: req.user.id });

        // Use raw SQL query to bypass RLS
        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', req.user.id)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            console.error('Error checking settings:', error);

            // If RLS error, try to create default settings without RLS
            if (error.code === '42501') {
                console.log('RLS error detected, using default settings');
                return res.json({
                    user_id: req.user.id,
                    earnings_per_order: 1.50,
                    language: 'en',
                    notificationSettings: {
                        soundEnabled: true,
                        browserEnabled: false
                    },
                    notification_settings: {
                        soundEnabled: true,
                        browserEnabled: false
                    }
                });
            }

            throw error;
        }

        // If no settings exist, use default settings
        if (!data) {
            const defaultSettings = {
                user_id: req.user.id,
                earnings_per_order: 1.50,
                language: 'en',
                notificationSettings: {
                    soundEnabled: true,
                    browserEnabled: false
                },
                notification_settings: {
                    soundEnabled: true,
                    browserEnabled: false
                }
            };

            return res.json(defaultSettings);
        }

        // When returning data, if data.notificationSettings exists, also add notification_settings = notificationSettings
        if (data && data.notificationSettings) {
            data.notification_settings = data.notificationSettings;
        }

        res.json(data);
    } catch (error) {
        console.error('Error fetching user settings:', error);
        res.status(500).json({ error: 'Failed to fetch user settings' });
    }
});

// Update user settings
app.patch('/api/user/settings', authenticateUser, async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const updates = req.body;

        // Validate the updates
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ error: 'Invalid settings data' });
        }

        // Set user context for RLS policies
        await supabase.rpc('set_request_user_id', { user_id: req.user.id });

        // Get current settings first
        const { data: existingSettings, error: fetchError } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', req.user.id)
            .maybeSingle();

        // If RLS error or no settings, use client-side settings
        if (fetchError && fetchError.code === '42501') {
            console.log('RLS error detected, returning client updates as successful');
            return res.json({
                ...updates,
                user_id: req.user.id,
                updated_at: new Date().toISOString()
            });
        }

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching existing settings:', fetchError);
            throw fetchError;
        }

        // If settings don't exist, create them with the updates
        if (!existingSettings) {
            console.log('📝 Creating new settings for user', req.user.id);

            const newSettings = {
                user_id: req.user.id,
                earnings_per_order: updates.earnings_per_order || 1.50,
                notificationSettings: updates.notificationSettings || {
                    soundEnabled: true,
                    browserEnabled: false
                },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data: createdData, error: createError } = await supabase
                .from('user_settings')
                .insert(newSettings)
                .select()
                .single();

            if (createError) {
                console.error('Error creating settings:', createError);
                // Return the settings anyway for client-side operation
                return res.json(newSettings);
            }

            console.log('✅ Settings created for user', req.user.id);
            return res.json(createdData);
        }

        // If we got RLS error, just return the updates
        if (fetchError) {
            return res.json({
                ...updates,
                user_id: req.user.id,
                updated_at: new Date().toISOString()
            });
        }

        // Prepare updates object - make sure we only update valid columns
        const validUpdates = {};
        if (updates.earnings_per_order !== undefined) {
            validUpdates.earnings_per_order = parseFloat(updates.earnings_per_order);
        }
        if (updates.notificationSettings !== undefined) {
            validUpdates.notificationSettings = updates.notificationSettings;
        }
        if (updates.language !== undefined) {
            // Validate language value
            if (['en', 'gr'].includes(updates.language)) {
                validUpdates.language = updates.language;
            } else {
                return res.status(400).json({ error: 'Invalid language value. Must be "en" or "gr"' });
            }
        }
        validUpdates.updated_at = new Date().toISOString();

        console.log('⚙️ Updating settings for user', req.user.id, ':', validUpdates);

        // Use upsert to handle both insert and update cases
        const settingsData = {
            user_id: req.user.id,
            earnings_per_order: validUpdates.earnings_per_order || existingSettings?.earnings_per_order || 1.50,
            notificationSettings: validUpdates.notificationSettings || (existingSettings?.notificationSettings || {
                soundEnabled: true,
                browserEnabled: false
            }),
            language: validUpdates.language || existingSettings?.language || 'en',
            updated_at: new Date().toISOString()
        };

        // If no existing settings, add created_at
        if (!existingSettings) {
            settingsData.created_at = new Date().toISOString();
        }

        console.log('🔄 Upserting settings for user', req.user.id, ':', validUpdates);

        // Use upsert (insert with on conflict update)
        const { data, error } = await supabase
            .from('user_settings')
            .upsert(settingsData, {
                onConflict: 'user_id',
                ignoreDuplicates: false
            })
            .select()
            .single();

        // If RLS error, just return the updates
        if (error && error.code === '42501') {
            console.log('RLS error on update, returning client updates as successful');
            return res.json({
                ...existingSettings,
                ...updates,
                updated_at: new Date().toISOString()
            });
        }

        if (error) {
            console.error('Error upserting settings:', error);
            throw error;
        }

        console.log('✅ Settings upserted successfully for user', req.user.id);

        // Add notification_settings for backward compatibility
        if (data && data.notificationSettings) {
            data.notification_settings = data.notificationSettings;
        }

        res.json(data);
    } catch (error) {
        console.error('Error updating user settings:', error);
        res.status(500).json({ error: 'Failed to update user settings' });
    }
});

// PUT /api/user/orders/:id - Update an order for a user
app.put('/api/user/orders/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { shop_id, price, notes, address, payment_method } = req.body;

        console.log('Updating order', id, 'for user', req.userId);

        if (!shop_id) {
            return res.status(400).json({
                success: false,
                message: 'Shop ID is required'
            });
        }

        // First check if order exists and belongs to the user
        const { data: existingOrder, error: checkError } = await supabase
            .from('orders')
            .select('id, earnings')
            .eq('id', id)
            .eq('user_id', req.userId)
            .single();

        if (checkError) {
            console.error('Error checking order existence:', checkError);
            return res.status(404).json({
                success: false,
                message: 'Order not found or does not belong to you'
            });
        }

        if (!existingOrder) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or does not belong to you'
            });
        }

        // Verify the shop belongs to the authenticated user
        const { data: shopData, error: shopError } = await supabase
            .from('partner_shops')
            .select('id, name')
            .eq('id', parseInt(shop_id))
            .eq('user_id', req.userId)
            .single();

        if (shopError || !shopData) {
            return res.status(400).json({
                success: false,
                message: 'Shop not found or does not belong to you'
            });
        }

        // Update the order - keep original earnings value, add payment method and address
        const { data, error } = await supabase
            .from('orders')
            .update({
                shop_id: parseInt(shop_id),
                price: parseFloat(price),
                notes: notes || '',
                address: address || '',
                payment_method: payment_method || 'cash',
                // Keep original earnings - cannot be modified
                earnings: existingOrder.earnings
            })
            .eq('id', id)
            .eq('user_id', req.userId)
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        console.log('✅ Order updated successfully for user', req.userId);

        // Combine with shop data
        const order = {
            ...data,
            shop_name: shopData.name
        };

        res.json({
            success: true,
            order: order,
            message: 'Order updated successfully'
        });
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order',
            error: error.message
        });
    }
});

// PUT /api/shop/:shopId/notifications/:notificationId - Update notification message
app.put('/api/shop/:shopId/notifications/:notificationId', async (req, res) => {
    try {
        const { shopId, notificationId } = req.params;
        const { message } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }
        // Update the message in driver_notifications
        const { data, error } = await supabase
            .from('driver_notifications')
            .update({ message, updated_at: new Date().toISOString() })
            .eq('id', notificationId)
            .eq('shop_id', parseInt(shopId))
            .select('id, message, driver_id, status, is_read, created_at, confirmed_at, shop_id')
            .single();
        if (error || !data) {
            console.error('Error updating notification:', error);
            return res.status(404).json({ success: false, message: 'Notification not found or update failed' });
        }
        // Fetch shop info for the notification
        const { data: shopData, error: shopError } = await supabase
            .from('shop_accounts')
            .select('id, shop_name, email')
            .eq('id', parseInt(shopId))
            .single();
        if (!shopError && shopData) {
            // Prepare notification object for driver
            const realtimeNotification = {
                id: data.id,
                message: data.message,
                status: data.status || 'pending',
                is_read: data.is_read || false,
                created_at: data.created_at,
                confirmed_at: data.confirmed_at,
                shop: {
                    id: shopData.id,
                    name: shopData.shop_name,
                    email: shopData.email
                }
            };
            // Broadcast to the driver
            broadcastToUser(data.driver_id, 'driver', realtimeNotification);
        }
        res.json({ success: true, message: 'Notification updated successfully', notification: data });
    } catch (error) {
        console.error('Error updating notification:', error);
        res.status(500).json({ success: false, message: 'Failed to update notification', error: error.message });
    }
});

// --- 2. Broadcast order edit/delete to delivery clients when shop acts, and to shop when delivery acts ---
// Helper: Broadcast order update/delete to all drivers for a shop
function broadcastOrderUpdateToDrivers(shopId, action, order) {
    clients.forEach((client, ws) => {
        if (ws.readyState === WebSocket.OPEN && client.userType === 'driver' && client.shopId === parseInt(shopId)) {
            ws.send(JSON.stringify({
                type: 'order_update',
                action,
                order
            }));
        }
    });
}
// Helper: Broadcast order update/delete to shop
function broadcastOrderUpdateToShop(shopId, action, order) {
    clients.forEach((client, ws) => {
        if (ws.readyState === WebSocket.OPEN && client.userType === 'shop' && client.shopId === parseInt(shopId)) {
            ws.send(JSON.stringify({
                type: 'order_update',
                action,
                order
            }));
        }
    });
}
// --- CATEGORIES API ENDPOINTS ---

// GET /api/categories - Get all categories (for drivers/authenticated users)
app.get('/api/categories', authenticateUser, async (req, res) => {
    try {
        console.log('Loading categories for user', req.userId);

        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            categories: categories || []
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load categories',
            error: error.message
        });
    }
});

// POST /api/categories - Create new category (for drivers/authenticated users)
app.post('/api/categories', authenticateUser, async (req, res) => {
    try {
        const { name, description, color, icon, is_active = true } = req.body;

        console.log('Creating category for user', req.userId);

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        // Check if category name already exists
        const { data: existingCategory, error: checkError } = await supabase
            .from('categories')
            .select('id')
            .eq('name', name.trim())
            .single();

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'A category with this name already exists'
            });
        }

        const categoryData = {
            name: name.trim(),
            description: description?.trim() || null,
            color: color || '#ff6b35',
            icon: icon || 'fas fa-utensils',
            is_active: is_active
        };

        const { data, error } = await supabase
            .from('categories')
            .insert([categoryData])
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        console.log('✅ Category created successfully:', data.name);

        res.json({
            success: true,
            category: data,
            message: 'Category created successfully'
        });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create category',
            error: error.message
        });
    }
});

// PUT /api/categories/:id - Update category (for drivers/authenticated users)
app.put('/api/categories/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, color, icon, is_active } = req.body;

        console.log('Updating category', id, 'for user', req.userId);

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        // Check if category exists
        const { data: existingCategory, error: checkError } = await supabase
            .from('categories')
            .select('id')
            .eq('id', id)
            .single();

        if (checkError || !existingCategory) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Check if new name conflicts with another category
        const { data: nameConflict, error: nameError } = await supabase
            .from('categories')
            .select('id')
            .eq('name', name.trim())
            .neq('id', id)
            .single();

        if (nameConflict) {
            return res.status(400).json({
                success: false,
                message: 'A category with this name already exists'
            });
        }

        const updateData = {
            name: name.trim(),
            description: description?.trim() || null,
            color: color || '#ff6b35',
            icon: icon || 'fas fa-utensils',
            is_active: is_active !== undefined ? is_active : true,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('categories')
            .update(updateData)
            .eq('id', id)
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        console.log('✅ Category updated successfully:', data.name);

        res.json({
            success: true,
            category: data,
            message: 'Category updated successfully'
        });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update category',
            error: error.message
        });
    }
});

// DELETE /api/categories/:id - Delete category (for drivers/authenticated users)
app.delete('/api/categories/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;

        console.log('Deleting category', id, 'for user', req.userId);

        // Check if category exists
        const { data: existingCategory, error: checkError } = await supabase
            .from('categories')
            .select('id, name')
            .eq('id', id)
            .single();

        if (checkError || !existingCategory) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Check if category is being used by partner_shops
        const { data: relatedShops, error: shopsError } = await supabase
            .from('partner_shops')
            .select('id, name')
            .eq('category_id', id)
            .limit(5);

        if (shopsError) {
            console.error('Error checking related shops:', shopsError);
            return res.status(500).json({
                success: false,
                message: 'Failed to check category usage'
            });
        }

        if (relatedShops && relatedShops.length > 0) {
            const shopNames = relatedShops.map(shop => shop.name).join(', ');
            const moreShops = relatedShops.length === 5 ? ' and others' : '';
            return res.status(400).json({
                success: false,
                message: `Cannot delete category "${existingCategory.name}" because it is being used by ${relatedShops.length} shop(s): ${shopNames}${moreShops}. Please reassign these shops to a different category first.`
            });
        }

        // Check if category is being used by shop_accounts
        const { data: relatedShopAccounts, error: shopAccountsError } = await supabase
            .from('shop_accounts')
            .select('id, shop_name')
            .eq('category_id', id)
            .limit(5);

        if (shopAccountsError) {
            console.error('Error checking related shop accounts:', shopAccountsError);
            return res.status(500).json({
                success: false,
                message: 'Failed to check category usage'
            });
        }

        if (relatedShopAccounts && relatedShopAccounts.length > 0) {
            const shopNames = relatedShopAccounts.map(shop => shop.shop_name).join(', ');
            const moreShops = relatedShopAccounts.length === 5 ? ' and others' : '';
            return res.status(400).json({
                success: false,
                message: `Cannot delete category "${existingCategory.name}" because it is being used by ${relatedShopAccounts.length} shop account(s): ${shopNames}${moreShops}. Please reassign these shops to a different category first.`
            });
        }

        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) {
            throw error;
        }

        console.log('✅ Category deleted successfully:', existingCategory.name);

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete category',
            error: error.message
        });
    }
});

// --- ADMIN CATEGORIES API ENDPOINTS (No authentication required) ---

// GET /api/admin/categories - Get all categories for admin dashboard
app.get('/api/admin/categories', async (req, res) => {
    try {
        console.log('Loading categories for admin dashboard');

        // Get all categories
        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (error) {
            console.error('Supabase error loading categories:', error);
            throw error;
        }

        // Get shop counts for each category
        const categoriesWithCounts = [];

        for (const category of categories || []) {
            // Count partner shops for this category
            const { data: partnerShops, error: partnerError } = await supabase
                    .from('partner_shops')
                .select('id')
                    .eq('category_id', category.id);

            // Count shop accounts for this category
            const { data: shopAccounts, error: shopError } = await supabase
                    .from('shop_accounts')
                .select('id')
                    .eq('category_id', category.id);

            const partnerShopsCount = partnerShops?.length || 0;
            const shopAccountsCount = shopAccounts?.length || 0;
            const totalShopCount = partnerShopsCount + shopAccountsCount;

            categoriesWithCounts.push({
                    ...category,
                shop_count: totalShopCount,
                partner_shops_count: partnerShopsCount,
                shop_accounts_count: shopAccountsCount
            });
        }

        console.log(`✅ Loaded ${categoriesWithCounts.length} categories successfully`);

        res.json({
            success: true,
            categories: categoriesWithCounts
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load categories',
            error: error.message
        });
    }
});

// Simple test endpoint for categories
app.get('/api/admin/categories/test', async (req, res) => {
    try {
        console.log('Testing categories table connection...');

        // Test basic connection
        const { data, error } = await supabase
            .from('categories')
            .select('id, name')
            .limit(1);

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            message: 'Categories table connection successful',
            sample_data: data
        });
    } catch (error) {
        console.error('Categories test failed:', error);
        res.status(500).json({
            success: false,
            message: 'Categories test failed',
            error: error.message
        });
    }
});

// POST /api/admin/categories - Create new category from admin dashboard
app.post('/api/admin/categories', async (req, res) => {
    try {
        const { name, description, color, icon, is_active = true } = req.body;

        console.log('Creating category from admin dashboard');

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Category name is required'
            });
        }

        // Check if category name already exists
        const { data: existingCategory, error: checkError } = await supabase
            .from('categories')
            .select('id')
            .eq('name', name.trim())
            .single();

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                error: 'A category with this name already exists'
            });
        }

        const categoryData = {
            name: name.trim(),
            description: description?.trim() || null,
            color: color || '#ff6b35',
            icon: icon || 'fas fa-utensils',
            is_active: is_active
        };

        const { data, error } = await supabase
            .from('categories')
            .insert([categoryData])
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        console.log('✅ Category created successfully from admin:', data.name);

        res.json({
            success: true,
            category: data,
            message: 'Category created successfully'
        });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create category',
            error: error.message
        });
    }
});

// PUT /api/admin/categories/:id - Update category from admin dashboard
app.put('/api/admin/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, color, icon, is_active } = req.body;

        console.log('Updating category', id, 'from admin dashboard');

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Category name is required'
            });
        }

        // Check if category exists
        const { data: existingCategory, error: checkError } = await supabase
            .from('categories')
            .select('id')
            .eq('id', id)
            .single();

        if (checkError || !existingCategory) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        // Check if new name conflicts with another category
        const { data: nameConflict, error: nameError } = await supabase
            .from('categories')
            .select('id')
            .eq('name', name.trim())
            .neq('id', id)
            .single();

        if (nameConflict) {
            return res.status(400).json({
                success: false,
                error: 'A category with this name already exists'
            });
        }

        const updateData = {
            name: name.trim(),
            description: description?.trim() || null,
            color: color || '#ff6b35',
            icon: icon || 'fas fa-utensils',
            is_active: is_active !== undefined ? is_active : true,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('categories')
            .update(updateData)
            .eq('id', id)
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        console.log('✅ Category updated successfully from admin:', data.name);

        res.json({
            success: true,
            category: data,
            message: 'Category updated successfully'
        });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update category',
            error: error.message
        });
    }
});

// GET /api/admin/driver-stats/:driverId - Get driver statistics
app.get('/api/admin/driver-stats/:driverId', async (req, res) => {
    try {
        const { driverId } = req.params;

        console.log('Fetching driver stats for:', driverId);

        // Get total shops created by driver
        const { data: shopsData, error: shopsError } = await supabase
            .from('partner_shops')
            .select('id')
            .eq('user_id', driverId);

        if (shopsError) {
            console.error('Error fetching driver shops:', shopsError);
        }

        // Get total orders and earnings for driver
        const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select('earnings')
            .eq('user_id', driverId);

        if (ordersError) {
            console.error('Error fetching driver orders:', ordersError);
        }

        const totalShops = shopsData ? shopsData.length : 0;
        const totalOrders = ordersData ? ordersData.length : 0;
        const totalEarnings = ordersData ?
            ordersData.reduce((sum, order) => sum + (parseFloat(order.earnings) || 0), 0) : 0;

        console.log('Driver stats:', { totalShops, totalOrders, totalEarnings });

        res.json({
            success: true,
            stats: {
                totalShops,
                totalOrders,
                totalEarnings
            }
        });
    } catch (error) {
        console.error('Error fetching driver stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch driver statistics',
            error: error.message
        });
    }
});

// GET /api/admin/driver-details/:driverId - Get detailed driver information for advanced modal
app.get('/api/admin/driver-details/:driverId', async (req, res) => {
    try {
        const { driverId } = req.params;

        console.log('Fetching driver details for:', driverId);

        // Get recent shops created by driver (last 10)
        const { data: recentShops, error: shopsError } = await supabase
            .from('partner_shops')
            .select('id, name, created_at')
            .eq('user_id', driverId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (shopsError) {
            console.error('Error fetching driver shops:', shopsError);
        }

        // Get recent orders by driver (last 10)
        const { data: recentOrders, error: ordersError } = await supabase
            .from('orders')
            .select('id, earnings, payment_method, created_at')
            .eq('user_id', driverId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (ordersError) {
            console.error('Error fetching driver orders:', ordersError);
        }

        // Get user settings if available
        const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', driverId)
            .single();

        // Don't throw error if settings don't exist, just use empty object
        const userSettings = settingsError ? {} : settings;

        console.log('Driver details fetched:', {
            shops: recentShops?.length || 0,
            orders: recentOrders?.length || 0,
            hasSettings: !!settings
        });

        res.json({
            success: true,
            details: {
                recentShops: recentShops || [],
                recentOrders: recentOrders || [],
                settings: userSettings
            }
        });
    } catch (error) {
        console.error('Error fetching driver details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch driver details',
            error: error.message
        });
    }
});

// DELETE /api/admin/categories/:id - Delete category from admin dashboard
app.delete('/api/admin/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;

        console.log('Deleting category', id, 'from admin dashboard');

        // Check if category exists
        const { data: existingCategory, error: checkError } = await supabase
            .from('categories')
            .select('id, name')
            .eq('id', id)
            .single();

        if (checkError || !existingCategory) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        // Check if category is being used by partner_shops
        const { data: relatedShops, error: shopsError } = await supabase
            .from('partner_shops')
            .select('id, name')
            .eq('category_id', id)
            .limit(5);

        if (shopsError) {
            console.error('Error checking related shops:', shopsError);
            return res.status(500).json({
                success: false,
                error: 'Failed to check category usage'
            });
        }

        if (relatedShops && relatedShops.length > 0) {
            const shopNames = relatedShops.map(shop => shop.name).join(', ');
            const moreShops = relatedShops.length === 5 ? ' and others' : '';
            return res.status(400).json({
                success: false,
                error: `Cannot delete category "${existingCategory.name}" because it is being used by ${relatedShops.length} shop(s): ${shopNames}${moreShops}. Please reassign these shops to a different category first.`
            });
        }

        // Check if category is being used by shop_accounts
        const { data: relatedShopAccounts, error: shopAccountsError } = await supabase
            .from('shop_accounts')
            .select('id, shop_name')
            .eq('category_id', id)
            .limit(5);

        if (shopAccountsError) {
            console.error('Error checking related shop accounts:', shopAccountsError);
            return res.status(500).json({
                success: false,
                error: 'Failed to check category usage'
            });
        }

        if (relatedShopAccounts && relatedShopAccounts.length > 0) {
            const shopNames = relatedShopAccounts.map(shop => shop.shop_name).join(', ');
            const moreShops = relatedShopAccounts.length === 5 ? ' and others' : '';
            return res.status(400).json({
                success: false,
                error: `Cannot delete category "${existingCategory.name}" because it is being used by ${relatedShopAccounts.length} shop account(s): ${shopNames}${moreShops}. Please reassign these shops to a different category first.`
            });
        }

        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) {
            throw error;
        }

        console.log('✅ Category deleted successfully from admin:', existingCategory.name);

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete category',
            error: error.message
        });
    }
});

// ============== PUSH NOTIFICATION ENDPOINTS ==============

// POST /api/push/subscription - Save push subscription
app.post('/api/push/subscription', authenticateUser, async (req, res) => {
    try {
        const { subscription, userId, userType } = req.body;

        if (!subscription || !userId || !userType) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        console.log(`💾 Saving push subscription for ${userType} ${userId}`);

        // Save or update subscription in database
        const { data, error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: userId,
                user_type: userType,
                endpoint: subscription.endpoint,
                p256dh_key: subscription.keys.p256dh,
                auth_key: subscription.keys.auth,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'endpoint'
            })
            .select('*');

        if (error) {
            console.error('❌ Error saving push subscription:', error);
            console.error('❌ Error details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            return res.status(500).json({
                success: false,
                message: 'Failed to save subscription',
                error: error.message
            });
        }

        console.log('✅ Push subscription saved successfully');

        res.json({
            success: true,
            message: 'Push subscription saved successfully'
        });

    } catch (error) {
        console.error('Error in push subscription endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// PUT /api/push/subscription - Update push subscription
app.put('/api/push/subscription', async (req, res) => {
    try {
        const { subscription, oldEndpoint } = req.body;

        if (!subscription) {
            return res.status(400).json({
                success: false,
                message: 'Missing subscription data'
            });
        }

        console.log('🔄 Updating push subscription');

        // Update subscription based on old endpoint
        const { data, error } = await supabase
            .from('push_subscriptions')
            .update({
                endpoint: subscription.endpoint,
                p256dh_key: subscription.keys.p256dh,
                auth_key: subscription.keys.auth,
                updated_at: new Date().toISOString()
            })
            .eq('endpoint', oldEndpoint)
            .select('*');

        if (error) {
            console.error('Error updating push subscription:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update subscription'
            });
        }

        console.log('✅ Push subscription updated successfully');

        res.json({
            success: true,
            message: 'Push subscription updated successfully'
        });

    } catch (error) {
        console.error('Error in push subscription update endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Function to send push notification
async function sendPushNotification(userId, userType, notificationData) {
    try {
        console.log(`📱 Sending push notification to ${userType} ${userId}`);

        // Get user's push subscription
        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('user_type', userType);

        if (error || !subscriptions || subscriptions.length === 0) {
            console.log(`No push subscriptions found for ${userType} ${userId}`);
            return;
        }

        // Send to all subscriptions for this user
        const sendPromises = subscriptions.map(async (sub) => {
            try {
                const pushSubscription = {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh_key,
                        auth: sub.auth_key
                    }
                };

                const payload = JSON.stringify({
                    title: notificationData.title || '🚚 New Delivery Order!',
                    body: notificationData.message || 'You have a new delivery order available',
                    icon: '/icons/icon-192x192.png',
                    badge: '/icons/plogo.png',
                    tag: 'padoo-order-' + (notificationData.id || Date.now()),
                    url: '/mainapp/delivery',
                    notificationId: notificationData.id,
                    order_amount: notificationData.order_amount,
                    shop_name: notificationData.shop_name,
                    order_id: notificationData.order_id,
                    data: {
                        ...notificationData,
                        timestamp: Date.now(),
                        priority: 'high',
                        category: 'order'
                    }
                });

                await webpush.sendNotification(pushSubscription, payload);
                console.log(`✅ Push notification sent successfully to ${userType} ${userId}`);

            } catch (pushError) {
                console.error(`❌ Failed to send push notification to ${userType} ${userId}:`, pushError);

                // If subscription is invalid, remove it
                if (pushError.statusCode === 410 || pushError.statusCode === 404) {
                    console.log(`🗑️ Removing invalid subscription for ${userType} ${userId}`);
                    await supabase
                        .from('push_subscriptions')
                        .delete()
                        .eq('id', sub.id);
                }
            }
        });

        await Promise.all(sendPromises);

    } catch (error) {
        console.error('Error in sendPushNotification:', error);
    }
}

// POST /api/orders/accept - Accept order from notification
app.post('/api/orders/accept', authenticateUser, async (req, res) => {
    try {
        const { orderId, acceptedVia, notificationId } = req.body;
        const driverId = req.userId;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }

        console.log(`📦 Driver ${driverId} accepting order ${orderId} via ${acceptedVia}`);

        // Update order status to assigned
        const { data: orderData, error: orderError } = await supabase
            .from('shop_orders')
            .update({
                driver_id: driverId,
                status: 'assigned',
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId)
            .eq('status', 'pending') // Only accept pending orders
            .select('*')
            .single();

        if (orderError || !orderData) {
            console.error('Error accepting order:', orderError);
            return res.status(400).json({
                success: false,
                message: 'Order not found or already assigned'
            });
        }

        // Mark related notification as read if provided
        if (notificationId) {
            await supabase
                .from('driver_notifications')
                .update({
                    is_read: true,
                    status: 'confirmed',
                    confirmed_at: new Date().toISOString()
                })
                .eq('id', notificationId)
                .eq('driver_id', driverId);
        }

        // Broadcast order update to shop
        const shopNotification = {
            type: 'order_accepted',
            orderId: orderId,
            driverId: driverId,
            acceptedAt: new Date().toISOString(),
            acceptedVia: acceptedVia
        };

        broadcastToUser(orderData.shop_account_id, 'shop', shopNotification);

        res.json({
            success: true,
            message: 'Order accepted successfully',
            order: orderData
        });

    } catch (error) {
        console.error('Error accepting order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to accept order',
            error: error.message
        });
    }
});

// POST /api/notifications/delivered - Track notification delivery
app.post('/api/notifications/delivered', async (req, res) => {
    try {
        const { notificationId, deliveredAt, userAgent } = req.body;

        console.log(`📊 Tracking notification delivery: ${notificationId}`);

        // Log delivery for analytics (you could store this in a separate table)
        console.log(`Notification ${notificationId} delivered at ${deliveredAt} via ${userAgent}`);

        res.json({
            success: true,
            message: 'Delivery tracked'
        });

    } catch (error) {
        console.error('Error tracking notification delivery:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to track delivery'
        });
    }
});

// POST /api/notifications/action - Track notification actions
app.post('/api/notifications/action', async (req, res) => {
    try {
        const { notificationId, action, timestamp, userAgent } = req.body;

        console.log(`📊 Tracking notification action: ${notificationId} - ${action}`);

        // Log action for analytics
        console.log(`Notification ${notificationId} action: ${action} at ${timestamp} via ${userAgent}`);

        res.json({
            success: true,
            message: 'Action tracked'
        });

    } catch (error) {
        console.error('Error tracking notification action:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to track action'
        });
    }
});

// --- PATCH/PUT/DELETE endpoints for orders ---
// After successful order update by shop, call broadcastOrderUpdateToDrivers(shopId, 'edit', order)
// After successful order delete by shop, call broadcastOrderUpdateToDrivers(shopId, 'delete', { id: orderId })
// After successful order confirm/delete by driver, call broadcastOrderUpdateToShop(shopId, 'confirm' or 'delete', order)
// ... existing code ...
// In order update endpoint (shop or driver), after res.json(...):
// Example:
// broadcastOrderUpdateToDrivers(shopId, 'edit', order);
// broadcastOrderUpdateToShop(shopId, 'confirm', order);
// ... existing code ...

// Start server
server.listen(PORT, () => {
console.log('\n🚀 Padoo Delivery Server Started Successfully!');
console.log('═══════════════════════════════════════════════════════════');
console.log(`🌐 Server running on port ${PORT} with WebSocket support`);
console.log('═══════════════════════════════════════════════════════════');
console.log(`🏠 Landing Page (PWA): http://localhost:${PORT}/`);
console.log(`🔐 Login Portal:       http://localhost:${PORT}/login`);
console.log(`📱 Driver App:         http://localhost:${PORT}/app`);
console.log(`🏪 Shop Portal:        http://localhost:${PORT}/shop`);
console.log(`📊 Admin Dashboard:    http://localhost:${PORT}/dashboard`);
console.log(`🔗 API Health Check:   http://localhost:${PORT}/api/health`);
console.log(`🔌 WebSocket Server:   ws://localhost:${PORT}`);
console.log('═══════════════════════════════════════════════════════════');
console.log('💡 Visit the Landing Page to install the PWA!');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('\n📋 System now uses real database authentication!');
console.log('✅ Create accounts through the dashboard or run database migrations');
console.log('🔔 Real-time notifications enabled via WebSocket');
});