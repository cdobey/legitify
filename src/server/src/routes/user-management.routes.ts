import {
  deleteProfilePictureHandler,
  upload,
  uploadProfilePictureHandler,
} from '@/controllers/profile.controller';
import {
  disableTwoFactor,
  enableTwoFactor,
  verifyTwoFactor,
} from '@/controllers/two-factor-auth.controller';
import {
  changePassword,
  getProfile,
  searchUsers,
  updateProfile,
} from '@/controllers/user-management.controller';
import { authMiddleware } from '@/middleware/auth';
import { Router } from 'express';

const router = Router();

/**
 * @openapi
 * /me:
 *   get:
 *     summary: Get user profile
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/me', authMiddleware, getProfile);

/**
 * @openapi
 * /user/search:
 *   get:
 *     summary: Search for a user by email
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User found
 *       404:
 *         description: User not found
 */
router.get('/search', authMiddleware, searchUsers);

/**
 * @openapi
 * /user/profile:
 *   put:
 *     summary: Update current user profile information
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: New username (optional)
 *               email:
 *                 type: string
 *                 format: email
 *                 description: New email (optional)
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Bad request (e.g., validation error)
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.put('/profile', authMiddleware, updateProfile);

/**
 * @openapi
 * /user/password:
 *   put:
 *     summary: Change the current user's password
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: The user's current password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: The desired new password (min 6 characters)
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Bad request (e.g., incorrect current password, weak new password)
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.put('/password', authMiddleware, changePassword);

/**
 * @openapi
 * /user/profile-picture:
 *   post:
 *     summary: Upload a profile picture
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Profile picture image file (max 2MB, formats: jpeg, jpg, png, gif, webp)
 *     responses:
 *       200:
 *         description: Profile picture uploaded successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete the current user's profile picture
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile picture deleted successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User does not have a profile picture
 *       500:
 *         description: Internal server error
 */
router.post('/profile-picture', authMiddleware, upload, uploadProfilePictureHandler);
router.delete('/profile-picture', authMiddleware, deleteProfilePictureHandler);

/**
 * @openapi
 * /user/2fa/enable:
 *   post:
 *     summary: Enable two-factor authentication
 *     tags:
 *       - User
 *       - Security
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns secret key and QR code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 secret:
 *                   type: string
 *                   description: TOTP secret key
 *                 qrCode:
 *                   type: string
 *                   description: Base64 encoded QR code image
 *       400:
 *         description: Bad request (e.g., 2FA already enabled)
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/2fa/enable', authMiddleware, enableTwoFactor);

/**
 * @openapi
 * /user/2fa/verify:
 *   post:
 *     summary: Verify and activate two-factor authentication
 *     tags:
 *       - User
 *       - Security
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               secret:
 *                 type: string
 *                 description: TOTP secret key
 *               token:
 *                 type: string
 *                 description: TOTP verification code
 *     responses:
 *       200:
 *         description: Two-factor authentication enabled successfully
 *       400:
 *         description: Bad request (e.g., invalid token)
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/2fa/verify', authMiddleware, verifyTwoFactor);

/**
 * @openapi
 * /user/2fa/disable:
 *   post:
 *     summary: Disable two-factor authentication
 *     tags:
 *       - User
 *       - Security
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: TOTP verification code
 *     responses:
 *       200:
 *         description: Two-factor authentication disabled successfully
 *       400:
 *         description: Bad request (e.g., invalid token, 2FA not enabled)
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/2fa/disable', authMiddleware, disableTwoFactor);

export default router;
