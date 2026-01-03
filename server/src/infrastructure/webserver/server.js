const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const express = require('express');
const cors = require('cors');
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
const allowedOrigins = [
    'https://chronos-timeline.vercel.app',
    'http://localhost:5173'
];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.error(`CORS Error: Origin ${origin} not allowed`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));
app.use(express.json());

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
