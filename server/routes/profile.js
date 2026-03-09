import express from 'express';
import { getProfile, updateProfile } from '../controllers/profile.js';
import { protect } from '../controllers/auth.js';

const router = express.Router();

router.get('/', protect, getProfile);
router.put('/', protect, updateProfile);

export default router;
