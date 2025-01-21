import { authMiddleware } from "../middleware/auth";
import express from "express";
import { login } from "../controllers/auth.controller";
import { registerUser } from "../controllers/user.controller";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const router = express.Router();

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Fabric Degree API - TypeScript",
      version: "1.0.0",
    },
  },
  apis: [__filename], // We'll parse this file for @openapi
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * @openapi
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
 * @openapi
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

/**
 * @openapi
 * /secured:
 *   get:
 *     summary: Example secured endpoint
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: success
 */
router.get("/secured", authMiddleware, (req, res) => {
  res.json({ message: "Secured endpoint reached", user: req.user });
});

// swagger
router.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default router;
