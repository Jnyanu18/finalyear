import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { env } from '../config/env.js';

export const SESSION_COOKIE_NAME = 'agrivision_session';
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const createSessionToken = (payload) => {
    return jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' });
};

export const getSessionCookieOptions = () => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS * 1000, // Express cookies need ms
});

// Middleware to protect routes
export const protect = async (req, res, next) => {
    try {
        const token = req.cookies[SESSION_COOKIE_NAME];
        if (!token) {
            return res.status(401).json({ success: false, error: 'Not authorized, no token' });
        }

        const decoded = jwt.verify(token, env.jwtSecret);
        req.user = await User.findById(decoded.userId).select('-password');
        next();
    } catch (error) {
        res.status(401).json({ success: false, error: 'Not authorized, token failed' });
    }
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, error: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = await User.create({ email, passwordHash });

        if (user) {
            const token = createSessionToken({ userId: user._id.toString(), email: user.email });
            res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
            res.status(201).json({ success: true, user: { id: user._id, email: user.email } });
        } else {
            res.status(400).json({ success: false, error: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        let isMatch = false;
        if (user && user.passwordHash) {
            isMatch = await bcrypt.compare(password, user.passwordHash);
        }

        if (user && isMatch) {
            const token = createSessionToken({ userId: user._id.toString(), email: user.email });
            res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
            res.json({ success: true, user: { id: user._id, email: user.email } });
        } else {
            res.status(401).json({ success: false, error: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
export const logoutUser = (req, res) => {
    res.cookie(SESSION_COOKIE_NAME, '', {
        httpOnly: true,
        expires: new Date(0),
    });
    res.json({ success: true, message: 'Logged out successfully' });
};

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
export const getUserProfile = async (req, res) => {
    if (req.user) {
        res.json({ success: true, user: { id: req.user._id, email: req.user.email } });
    } else {
        res.status(404).json({ success: false, error: 'User not found' });
    }
};
