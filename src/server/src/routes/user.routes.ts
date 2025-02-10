import { Router } from "express";
import { register } from "../controllers/auth.controller";
import { getProfile } from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth";

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
router.get("/profile", authMiddleware, getProfile);

/**
 * @swagger
 * /user/register:
 *   post:
 *     summary: Register a new user
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
 *               - orgName
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               username:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [university, individual, employer]
 *               orgName:
 *                 type: string
 *                 enum: [orguniversity, orgindividual, orgemployer]
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad request
 */
router.post("/register", register);

export default router;
