import { register } from "../controllers/auth.controller";
import {
  acceptDegree,
  denyDegree,
  getAccessRequests,
  getAllLedgerRecords, // Add this import
  getMyDegrees,
  grantAccess,
  issueDegree,
  requestAccess,
  verifyDegreeDocument,
  viewDegree,
} from "../controllers/degree.controller";
import { searchUsers } from "../controllers/user.controller";

import { Router } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import supabase from "../config/supabase";
import { getProfile } from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Swagger Configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: { title: "Legitify API", version: "1.0.0" },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "Supabase JWT Token",
        },
      },
      schemas: {
        LoginResponse: {
          type: "object",
          properties: {
            token: {
              type: "string",
              description: "Supabase access token",
            },
          },
        },
        AuthTestResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Success message",
            },
            user: {
              type: "object",
              properties: {
                uid: { type: "string" },
                role: { type: "string" },
                orgName: { type: "string" },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
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
 *         description: User registered successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post("/auth/register", register);

/**
 * @openapi
 * /auth/test-login:
 *   post:
 *     summary: Test endpoint to get a Supabase token
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
 *                 example: "test@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 */
router.post("/auth/test-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Login attempt for email:", email);

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Sign in error:", error);
      throw error;
    }

    if (!data.session) {
      throw new Error("No session returned from Supabase");
    }

    console.log("Token generated for user:", data.user?.id);

    res.json({
      token: data.session.access_token,
      expiresIn: data.session.expires_at,
      refreshToken: data.session.refresh_token,
      uid: data.user?.id,
    });
  } catch (error: any) {
    console.error("Login error:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(401).json({
      error: "Authentication failed",
      details: error.message,
    });
  }
});

/**
 * @openapi
 * /auth/test-authenticated:
 *   get:
 *     summary: Test endpoint for authenticated requests
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTestResponse'
 *       401:
 *         description: Unauthorized
 */
router.get("/auth/test-authenticated", authMiddleware, (req, res) => {
  res.json({
    message: "Authentication successful",
    user: req.user,
  });
});

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
router.get("/user/search", authMiddleware, searchUsers);

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

/**
 * @openapi
 * /degree/requests:
 *   get:
 *     summary: Get all access requests for a user's degrees
 *     tags:
 *       - Degree
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of access requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   requestId:
 *                     type: string
 *                   docId:
 *                     type: string
 *                   employerName:
 *                     type: string
 *                   requestDate:
 *                     type: string
 *                     format: date-time
 *                   status:
 *                     type: string
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.get("/degree/requests", authMiddleware, getAccessRequests);

/**
 * @openapi
 * /degree/list:
 *   get:
 *     summary: Get all degrees for the current user
 *     tags:
 *       - Degree
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of degrees
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.get("/degree/list", authMiddleware, getMyDegrees);

/**
 * @openapi
 * /degree/verify:
 *   post:
 *     summary: Verify a degree document
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
 *     responses:
 *       200:
 *         description: Verification result
 *       403:
 *         description: Forbidden
 */
router.post("/degree/verify", authMiddleware, verifyDegreeDocument);

/**
 * @openapi
 * /degree/ledger/all:
 *   get:
 *     summary: Get all records from the blockchain ledger
 *     tags:
 *       - Degree
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all degree records from the ledger
 *       403:
 *         description: Forbidden - only university role can access
 *       500:
 *         description: Internal server error
 */
router.get("/degree/ledger/all", authMiddleware, getAllLedgerRecords);

// Swagger Documentation Route
router.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default router;
