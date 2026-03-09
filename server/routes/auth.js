import express from 'express';
import {
    registerUser,
    loginUser,
    logoutUser,
    getUserProfile,
    protect,
} from '../controllers/auth.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/me', protect, getUserProfile);

export default router;
