import { getUser, registerUser } from "../controllers/user.controller";

import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { login } from "../controllers/auth.controller";

const router = Router();

/**
 * @swagger
 * /user:
 *   get:
 *     summary: Get user information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information
 *       401:
 *         description: Unauthorized
 */
router.get("/user", authMiddleware, getUser);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Returns a JWT token
 */
router.post("/auth/login", login);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 *               role: { type: string }
 *               orgName: { type: string }
 *     responses:
 *       201:
 *         description: Created user
 */
router.post("/users", registerUser);

export default router;
