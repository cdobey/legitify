import { login, register } from '../controllers/auth.controller';
import {
  acceptDegree,
  denyDegree,
  getAccessibleDegrees,
  getAccessRequests,
  getAllLedgerRecords,
  getMyDegrees,
  getRecentIssuedDegrees,
  getUserDegrees,
  grantAccess,
  issueDegree,
  requestAccess,
  verifyDegreeDocument,
  viewDegree,
} from '../controllers/degree.controller';
import { searchUsers } from '../controllers/user.controller';

import { Router } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { getProfile } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth';

// Add these imports
import {
  addStudentToUniversity,
  createUniversity,
  getAllUniversities,
  getMyUniversities,
  getPendingAffiliations,
  getStudentUniversities,
  getUniversityStudents,
  registerStudent,
  requestJoinUniversity,
  respondToAffiliation,
} from '../controllers/university.controller';

const router = Router();

// Swagger Configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'Legitify API', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'Supabase JWT Token',
        },
      },
      schemas: {
        LoginResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'Supabase access token',
            },
          },
        },
        AuthTestResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Success message',
            },
            user: {
              type: 'object',
              properties: {
                uid: { type: 'string' },
                role: { type: 'string' },
                orgName: { type: 'string' },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
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
router.post('/auth/register', register);

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
 *       401:
 *         description: Authentication failed
 */
router.post('/auth/login', login);

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
router.get('/user/search', authMiddleware, searchUsers);

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
router.post('/degree/issue', authMiddleware, issueDegree);

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
router.post('/degree/accept', authMiddleware, acceptDegree);

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
router.post('/degree/deny', authMiddleware, denyDegree);

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
router.post('/degree/requestAccess', authMiddleware, requestAccess);

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
router.post('/degree/grantAccess', authMiddleware, grantAccess);

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
router.get('/degree/view/:docId', authMiddleware, viewDegree);

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
router.get('/degree/requests', authMiddleware, getAccessRequests);

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
router.get('/degree/list', authMiddleware, getMyDegrees);

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
router.post('/degree/verify', authMiddleware, verifyDegreeDocument);

/**
 * @openapi
 * /degree/ledger/all:
 *   get:
 *     summary: Get all records from the blockchain ledger for the calling university
 *     tags:
 *       - Degree
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all degree records from the ledger for the authenticated university
 *       403:
 *         description: Forbidden - only university role can access
 *       500:
 *         description: Internal server error
 */
router.get('/degree/ledger/all', authMiddleware, getAllLedgerRecords);

/**
 * @openapi
 * /degree/user/{userId}:
 *   get:
 *     summary: Get all degrees for a specific user by userId
 *     tags:
 *       - Degree
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user whose degrees to retrieve
 *     responses:
 *       200:
 *         description: List of user's accepted degrees
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - only employers can access this endpoint
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/degree/user/:userId', authMiddleware, getUserDegrees);

/**
 * @openapi
 * /degree/accessible:
 *   get:
 *     summary: Get all degrees accessible to the logged-in employer
 *     tags:
 *       - Degree
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of accessible degrees
 *       403:
 *         description: Forbidden - only employers can access this endpoint
 *       500:
 *         description: Internal server error
 */
router.get('/degree/accessible', authMiddleware, getAccessibleDegrees);

/**
 * @openapi
 * /degree/recent-issued:
 *   get:
 *     summary: Get recently issued degrees for university dashboard
 *     tags:
 *       - Degree
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of recently issued degrees
 *       403:
 *         description: Forbidden - only university can access this endpoint
 *       500:
 *         description: Internal server error
 */
router.get('/degree/recent-issued', authMiddleware, getRecentIssuedDegrees);

// University management routes
/**
 * @openapi
 * /university/create:
 *   post:
 *     summary: Create a new university sub-organization
 *     tags:
 *       - University
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - displayName
 *             properties:
 *               name:
 *                 type: string
 *               displayName:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: University created successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - only university users can create universities
 *       500:
 *         description: Internal server error
 */
router.post('/university/create', authMiddleware, createUniversity);

/**
 * @openapi
 * /university/my:
 *   get:
 *     summary: Get all universities owned by the current user
 *     tags:
 *       - University
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of owned universities
 *       403:
 *         description: Forbidden - only university users can access this endpoint
 *       500:
 *         description: Internal server error
 */
router.get('/university/my', authMiddleware, getMyUniversities);

/**
 * @openapi
 * /university/add-student:
 *   post:
 *     summary: Add a student to a university
 *     tags:
 *       - University
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - universityId
 *               - studentEmail
 *             properties:
 *               universityId:
 *                 type: string
 *               studentEmail:
 *                 type: string
 *     responses:
 *       201:
 *         description: Student added to university successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - only university users can add students
 *       404:
 *         description: University or student not found
 *       500:
 *         description: Internal server error
 */
router.post('/university/add-student', authMiddleware, addStudentToUniversity);

/**
 * @openapi
 * /university/my-affiliations:
 *   get:
 *     summary: Get all universities that a student is affiliated with
 *     tags:
 *       - University
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of affiliated universities
 *       403:
 *         description: Forbidden - only individual users can access this endpoint
 *       500:
 *         description: Internal server error
 */
router.get('/university/my-affiliations', authMiddleware, getStudentUniversities);

/**
 * @openapi
 * /university/register-student:
 *   post:
 *     summary: Register a new student and affiliate them with a university
 *     tags:
 *       - University
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - username
 *               - password
 *               - universityId
 *             properties:
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               universityId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Student registered and affiliated successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - only university users can register students
 *       404:
 *         description: University not found
 *       500:
 *         description: Internal server error
 */
router.post('/university/register-student', authMiddleware, registerStudent);

/**
 * @openapi
 * /university/{universityId}/students:
 *   get:
 *     summary: Get all students affiliated with a university
 *     tags:
 *       - University
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: universityId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the university
 *     responses:
 *       200:
 *         description: List of affiliated students
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - only university users can access this endpoint
 *       404:
 *         description: University not found
 *       500:
 *         description: Internal server error
 */
router.get('/university/:universityId/students', authMiddleware, getUniversityStudents);

// Add this new endpoint for getting all universities (publicly accessible)
/**
 * @openapi
 * /universities:
 *   get:
 *     summary: Get all available universities
 *     tags:
 *       - University
 *     responses:
 *       200:
 *         description: List of universities
 *       500:
 *         description: Internal server error
 */
router.get('/universities', getAllUniversities);

// Add these new routes for pending affiliations
/**
 * @openapi
 * /university/pending-affiliations:
 *   get:
 *     summary: Get all pending university affiliation requests for the current user
 *     tags:
 *       - University
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending affiliation requests
 *       403:
 *         description: Forbidden - only individual users can access this endpoint
 *       500:
 *         description: Internal server error
 */
router.get('/university/pending-affiliations', authMiddleware, getPendingAffiliations);

/**
 * @openapi
 * /university/respond-affiliation:
 *   post:
 *     summary: Respond to a university affiliation request
 *     tags:
 *       - University
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - affiliationId
 *               - accept
 *             properties:
 *               affiliationId:
 *                 type: string
 *               accept:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Successfully responded to affiliation request
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - only individual users can respond to affiliation requests
 *       404:
 *         description: Affiliation request not found
 *       500:
 *         description: Internal server error
 */
router.post('/university/respond-affiliation', authMiddleware, respondToAffiliation);

/**
 * @openapi
 * /university/request-join:
 *   post:
 *     summary: Request to join an existing university
 *     tags:
 *       - University
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - universityId
 *             properties:
 *               universityId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Join request submitted successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - only university users can request to join
 *       404:
 *         description: University not found
 *       500:
 *         description: Internal server error
 */
router.post('/university/request-join', authMiddleware, requestJoinUniversity);

// Swagger Documentation Route
router.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default router;
