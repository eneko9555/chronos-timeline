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

// CONFIGURACIÓN DEFINITIVA DE CORS
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
}));

app.use(express.json());

// Logs para verificar que las peticiones llegan
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'N/A'}`);
    next();
});

// Ruta simple para probar en el navegador
app.get('/', (req, res) => res.send('API de Chronos funcionando correctamente'));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Middleware de autenticación
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const decoded = await authProvider.verifyToken(token);
        req.user = decoded;
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
// IMPORTANTE: Escuchar en '0.0.0.0' para que Railway pueda dirigir el tráfico al contenedor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor listo en puerto ${PORT}`);
});
