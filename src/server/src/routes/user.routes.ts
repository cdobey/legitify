import { Router } from 'express';
import { getProfile } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /user/profile:
 *   get:
 *     summary: Get user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile information
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', authMiddleware, getProfile);

export default router;
