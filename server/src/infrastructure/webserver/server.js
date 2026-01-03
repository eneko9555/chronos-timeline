const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const express = require('express');
const connectDB = require('../database/mongooseProvider');

// Domains/Infra
const MongoUserRepository = require('../database/MongoUserRepository');
const MongoTimelineRepository = require('../database/MongoTimelineRepository');
const FirebaseAuth = require('../auth/FirebaseAuth');

// Application
const AuthUseCase = require('../../application/AuthUseCase');
const TimelineUseCase = require('../../application/TimelineUseCase');

// Controllers
const AuthController = require('../../controllers/AuthController');
const TimelineController = require('../../controllers/TimelineController');

// Initialize Dependencies
const authProvider = new FirebaseAuth();
const userRepository = new MongoUserRepository();
const timelineRepository = new MongoTimelineRepository();

const authUseCase = new AuthUseCase(userRepository, authProvider);
const timelineUseCase = new TimelineUseCase(timelineRepository);

const authController = new AuthController(authUseCase);
const timelineController = new TimelineController(timelineUseCase);

// Connect to DB
connectDB();

const app = express();
app.set('trust proxy', 1); // Confiar en el proxy de Railway

// Verbose Logging & CORS Manual Headers
app.use((req, res, next) => {
    const origin = req.headers.origin || '*';

    // Loguear ABSOLUTAMENTE TODO para ver qué llega a Railway
    console.log(`[Request Received] Method: ${req.method} | URL: ${req.url} | Origin: ${req.headers.origin || 'no-origin'} | IP: ${req.ip}`);

    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        console.log(`[Preflight Response] Sending 200 OK for ${req.url}`);
        return res.status(200).end();
    }
    next();
});

app.use(express.json());

// Ruta de prueba pública
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is reachable', time: new Date().toISOString() });
});

// Middleware to extract user from token (Clean Arch: this is infrastructure specific middleware)
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const decoded = await authProvider.verifyToken(token);
        req.user = decoded; // Attach user info to request
        next();
    } catch (err) {
        console.error("Auth Error details:", err);
        return res.status(401).json({ error: `Invalid token: ${err.message}` });
    }
};

// Routes
app.post('/api/auth/login', (req, res) => authController.login(req, res));

app.get('/api/timelines', authenticate, (req, res) => timelineController.listTimelines(req, res));
app.post('/api/timelines', authenticate, (req, res) => timelineController.createTimeline(req, res));
app.get('/api/timelines/:id', authenticate, (req, res) => timelineController.getTimeline(req, res));
app.put('/api/timelines/:id', authenticate, (req, res) => timelineController.saveTimeline(req, res));
app.patch('/api/timelines/:id', authenticate, (req, res) => timelineController.updateTimeline(req, res));
app.delete('/api/timelines/:id', authenticate, (req, res) => timelineController.deleteTimeline(req, res));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
