import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import agrinexusRoutes from './routes/index.js';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDatabase } from './config/db.js';

// Load env vars
dotenv.config();

// Connect to database
connectDatabase();

const app = express();

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);

// Agrinexus Intelligence Routes
app.use('/api/v1', agrinexusRoutes);
app.use('/api', agrinexusRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
    const statusCode = err.status || err.statusCode || 500;
    console.error(`[Error] ${err.message}`);
    res.status(statusCode).json({
        success: false,
        error: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
