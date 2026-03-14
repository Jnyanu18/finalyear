import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import agrinexusRoutes from './routes/index.js';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './services/agrosense/logger.js';
import { attachSensorStreamServer } from './websocket/agrosenseSensorStream.js';

// Load env vars
dotenv.config();

// Connect to database
connectDatabase().catch((error) => {
    logger.warn('mongodb_connection_failed', { error: error.message });
});

const app = express();
const server = http.createServer(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors({
    origin: env.clientUrl,
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use('/generated-reports', express.static(path.join(__dirname, 'generated-reports')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);

// Agrinexus Intelligence Routes
app.use('/api/v1', agrinexusRoutes);
app.use('/api', agrinexusRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
    const statusCode = err.status || err.statusCode || 500;
    logger.error('request_failed', {
        method: req.method,
        path: req.path,
        statusCode,
        error: err.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
    res.status(statusCode).json({
        success: false,
        error: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
});

const PORT = process.env.PORT || 5000;

attachSensorStreamServer(server);

server.listen(PORT, () => logger.info('server_started', { port: Number(PORT) }));
