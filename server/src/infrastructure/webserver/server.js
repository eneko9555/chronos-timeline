const path = require('path');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('../database/mongooseProvider');

// Domains / Infra
const MongoUserRepository = require('../database/MongoUserRepository');
const MongoTimelineRepository = require('../database/MongoTimelineRepository');
const FirebaseAuth = require('../auth/FirebaseAuth');

// Application
const AuthUseCase = require('../../application/AuthUseCase');
const TimelineUseCase = require('../../application/TimelineUseCase');

// Controllers
const AuthController = require('../../controllers/AuthController');
const TimelineController = require('../../controllers/TimelineController');

const app = express();

/* =========================
   1. CORS (ESTABLE PARA VERCEL → RAILWAY)
   ========================= */

const allowedOrigins = [
    'https://chronos-timeline.vercel.app',
    'http://localhost:3000'
];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true); // Postman / server-to-server
        if (allowedOrigins.includes(origin)) {
            return callback(null, origin);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

/* =========================
   2. MIDDLEWARES BÁSICOS
   ========================= */

app.use(express.json());

app.use((req, res, next) => {
    console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'N/A'}`
    );
    next();
});

/* =========================
   3. DEPENDENCIAS
   ========================= */

const authProvider = new FirebaseAuth();
const userRepository = new MongoUserRepository();
const timelineRepository = new MongoTimelineRepository();

const authUseCase = new AuthUseCase(userRepository, authProvider);
const timelineUseCase = new TimelineUseCase(timelineRepository);

const authController = new AuthController(authUseCase);
const timelineController = new TimelineController(timelineUseCase);

/* =========================
   4. RUTAS DE SALUD
   ========================= */

app.get('/', (req, res) => {
    res.status(200).send('API de Chronos viva y coleando');
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        serverTime: new Date().toISOString()
    });
});

/* =========================
   5. AUTH MIDDLEWARE
   ========================= */

const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');

    try {
        const decoded = await authProvider.verifyToken(token);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Auth Error:', err.message);
        return res.status(401).json({ error: 'Invalid token' });
    }
};

/* =========================
   6. RUTAS DE LA APP
   ========================= */

app.post('/api/auth/login', (req, res) =>
    authController.login(req, res)
);

app.get('/api/timelines', authenticate, (req, res) =>
    timelineController.listTimelines(req, res)
);

app.post('/api/timelines', authenticate, (req, res) =>
    timelineController.createTimeline(req, res)
);

app.get('/api/timelines/:id', authenticate, (req, res) =>
    timelineController.getTimeline(req, res)
);

app.put('/api/timelines/:id', authenticate, (req, res) =>
    timelineController.saveTimeline(req, res)
);

app.patch('/api/timelines/:id', authenticate, (req, res) =>
    timelineController.updateTimeline(req, res)
);

app.delete('/api/timelines/:id', authenticate, (req, res) =>
    timelineController.deleteTimeline(req, res)
);

/* =========================
   7. ARRANQUE (IMPORTANTE)
   ========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
    connectDB(); // DB DESPUÉS de escuchar (evita fallos de preflight)
});
