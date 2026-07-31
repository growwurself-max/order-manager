import express from 'express';
import {
  ownerLogin,
  workerLogin,
  getProfile,
  logout,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { ownerLoginValidator, workerPinValidator } from '../validators/authValidator.js';

const router = express.Router();

router.post('/login/owner', ownerLoginValidator, ownerLogin);
router.post('/login/worker', workerPinValidator, workerLogin);
router.get('/profile', authenticate, getProfile);
router.post('/logout', authenticate, logout);

export default router;