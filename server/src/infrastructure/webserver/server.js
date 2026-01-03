const path = require('path');
require('dotenv').config();
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

// 1. CORS - Lo más permisivo posible y AL PRINCIPIO
const corsOptions = {
    origin: function (origin, callback) {
        // En producción permitimos todo temporalmente para ver si llega
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
};

app.use(cors(corsOptions));
// Manejo explícito de OPTIONS para evitar el 502 en preflight
app.options(/.*/, cors(corsOptions));

app.use(express.json());

// 2. LOGGING VERBOSO - Para confirmar que las peticiones entran
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'N/A'}`);
    next();
});

// 3. RUTAS DE PRUEBA
app.get('/', (req, res) => {
    res.status(200).send('API de Chronos viva y coleando');
});

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', serverTime: new Date().toISOString() });
});

// 4. RUTAS DE LA APP
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const decoded = await authProvider.verifyToken(token);
        req.user = decoded;
        next();
    } catch (err) {
        console.error("Auth Error:", err.message);
        return res.status(401).json({ error: `Invalid token: ${err.message}` });
    }
};

app.post('/api/auth/login', (req, res) => authController.login(req, res));
app.get('/api/timelines', authenticate, (req, res) => timelineController.listTimelines(req, res));
app.post('/api/timelines', authenticate, (req, res) => timelineController.createTimeline(req, res));
app.get('/api/timelines/:id', authenticate, (req, res) => timelineController.getTimeline(req, res));
app.put('/api/timelines/:id', authenticate, (req, res) => timelineController.saveTimeline(req, res));
app.patch('/api/timelines/:id', authenticate, (req, res) => timelineController.updateTimeline(req, res));
app.delete('/api/timelines/:id', authenticate, (req, res) => timelineController.deleteTimeline(req, res));

// 5. BINDING DEL PUERTO
const PORT = process.env.PORT || 3000;
// Dejamos que Express maneje la interface por defecto, o usamos 0.0.0.0 si falla
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor escuchando en puerto ${PORT}`);
});
