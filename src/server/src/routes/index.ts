import {
  acceptDegree,
  denyDegree,
  grantAccess,
  issueDegree,
  requestAccess,
  viewDegree,
} from "../controllers/degree.controller";
import { login, register } from "../controllers/auth.controller";

import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { getProfile } from "../controllers/user.controller";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const router = Router();

// Swagger Configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: { title: "Fabric Degree API (Go chaincode)", version: "1.0.0" },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Auth Routes

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
 *               - username
 *               - password
 *               - role
 *               - orgName
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [university, individual, employer]
 *               orgName:
 *                 type: string
 *                 enum: [orguniversity, orgindividual, orgemployer]
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post("/auth/register", register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: User login
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Returns a JWT token
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/auth/login", login);

// User Profile Route

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
router.get("/me", authMiddleware, getProfile);

// Degree Management Routes

/**
 * @openapi
 * /degree/issue:
 *   post:
 *     summary: University issues a degree
 *     tags:
 *       - Degree
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - individualId
 *               - base64File
 *             properties:
 *               individualId:
 *                 type: string
 *               base64File:
 *                 type: string
 *     responses:
 *       201:
 *         description: Degree issued successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.post("/degree/issue", authMiddleware, issueDegree);

/**
 * @openapi
 * /degree/accept:
 *   post:
 *     summary: Individual accepts a degree
 *     tags:
 *       - Degree
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - docId
 *             properties:
 *               docId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Degree accepted successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 */
router.post("/degree/accept", authMiddleware, acceptDegree);

/**
 * @openapi
 * /degree/deny:
 *   post:
 *     summary: Individual denies a degree
 *     tags:
 *       - Degree
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - docId
 *             properties:
 *               docId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Degree denied successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 */
router.post("/degree/deny", authMiddleware, denyDegree);

/**
 * @openapi
 * /degree/requestAccess:
 *   post:
 *     summary: Employer requests access to a degree document
 *     tags:
 *       - Degree
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - docId
 *             properties:
 *               docId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Access requested successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 */
router.post("/degree/requestAccess", authMiddleware, requestAccess);

/**
 * @openapi
 * /degree/grantAccess:
 *   post:
 *     summary: Individual grants or denies an employer's access request
 *     tags:
 *       - Degree
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requestId
 *               - granted
 *             properties:
 *               requestId:
 *                 type: string
 *               granted:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Access granted or denied successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Request not found
 *       500:
 *         description: Internal server error
 */
router.post("/degree/grantAccess", authMiddleware, grantAccess);

/**
 * @openapi
 * /degree/view/{docId}:
 *   get:
 *     summary: Employer views a degree document if access is granted and verifies its hash
 *     tags:
 *       - Degree
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: docId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the degree document
 *     responses:
 *       200:
 *         description: Degree document retrieved and verified successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 */
router.get("/degree/view/:docId", authMiddleware, viewDegree);

// Swagger Documentation Route
router.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default router;
