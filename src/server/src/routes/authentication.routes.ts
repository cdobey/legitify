import { Router } from 'express';
import { login, register } from '../controllers/authentication.controller';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - username
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *               username:
 *                 type: string
 *                 example: "johndoe"
 *               role:
 *                 type: string
 *                 enum: [holder, issuer, verifier]
 *                 example: "holder"
 *               issuerName:
 *                 type: string
 *                 description: Required when role is 'issuer'
 *                 example: "mit"
 *               issuerDisplayName:
 *                 type: string
 *                 description: Required when role is 'issuer'
 *                 example: "Massachusetts Institute of Technology"
 *               issuerDescription:
 *                 type: string
 *                 description: Optional description for issuer
 *                 example: "A private research issuer"
 *               joinIssuerId:
 *                 type: string
 *                 description: ID of issuer to join (for issuer role)
 *                 example: "12345678-1234-1234-1234-123456789012"
 *               issuerIds:
 *                 type: array
 *                 description: Array of issuer IDs to affiliate with (for holder role)
 *                 items:
 *                   type: string
 *                 example: ["12345678-1234-1234-1234-123456789012"]
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User created successfully"
 *                 uid:
 *                   type: string
 *                   example: "12345678-1234-1234-1234-123456789012"
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     username:
 *                       type: string
 *                     role:
 *                       type: string
 *                     orgName:
 *                       type: string
 *                 issuer:
 *                   type: object
 *                   description: Only included when creating an issuer
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: string
 */
router.post('/register', register);

/**
 * @openapi
 * components:
 *   schemas:
 *     LoginResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: JWT access token
 *         expiresIn:
 *           type: number
 *           description: Token expiration timestamp
 *         refreshToken:
 *           type: string
 *           description: JWT refresh token
 *         uid:
 *           type: string
 *           description: User ID
 *     TwoFactorResponse:
 *       type: object
 *       properties:
 *         requiresTwoFactor:
 *           type: boolean
 *           example: true
 *         userId:
 *           type: string
 *           description: User ID
 *         tempToken:
 *           type: string
 *           description: Temporary token for 2FA verification
 */

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Authenticate a user and get a JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *               twoFactorCode:
 *                 type: string
 *                 description: Required if 2FA is enabled for the user
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/LoginResponse'
 *                 - $ref: '#/components/schemas/TwoFactorResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: string
 */
router.post('/login', login);

export default router;
