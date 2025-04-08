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
} from '@/controllers/degree.controller';
import { authMiddleware } from '@/middleware/auth';
import { Router } from 'express';

const router = Router();

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
router.post('/issue', authMiddleware, issueDegree);

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
router.post('/accept', authMiddleware, acceptDegree);

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
router.post('/deny', authMiddleware, denyDegree);

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
router.post('/requestAccess', authMiddleware, requestAccess);

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
router.post('/grantAccess', authMiddleware, grantAccess);

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
router.get('/view/:docId', authMiddleware, viewDegree);

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
router.get('/requests', authMiddleware, getAccessRequests);

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
router.get('/list', authMiddleware, getMyDegrees);

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
router.post('/verify', authMiddleware, verifyDegreeDocument);

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
router.get('/ledger/all', authMiddleware, getAllLedgerRecords);

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
router.get('/user/:userId', authMiddleware, getUserDegrees);

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
router.get('/accessible', authMiddleware, getAccessibleDegrees);

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
router.get('/recent-issued', authMiddleware, getRecentIssuedDegrees);

export default router;
