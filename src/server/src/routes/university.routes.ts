import {
  addStudentToUniversity,
  getPendingAffiliations,
  getStudentUniversities,
  getUniversityStudents,
  registerStudent,
  respondToAffiliation,
} from '@/controllers/university-affiliation.controller';
import { deleteLogo, upload, uploadLogo } from '@/controllers/university-logo.controller';
import {
  createUniversity,
  getAllUniversities,
  getMyUniversities,
  requestJoinUniversity,
} from '@/controllers/university.controller';
import { authMiddleware } from '@/middleware/auth';
import { Router } from 'express';

const router = Router();

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
router.post('/create', authMiddleware, createUniversity);

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
router.get('/my', authMiddleware, getMyUniversities);

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
router.post('/add-student', authMiddleware, addStudentToUniversity);

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
router.get('/my-affiliations', authMiddleware, getStudentUniversities);

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
router.post('/register-student', authMiddleware, registerStudent);

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
router.get('/:universityId/students', authMiddleware, getUniversityStudents);

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
router.get('/pending-affiliations', authMiddleware, getPendingAffiliations);

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
router.post('/respond-affiliation', authMiddleware, respondToAffiliation);

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
router.post('/request-join', authMiddleware, requestJoinUniversity);

/**
 * @openapi
 * /university/all:
 *   get:
 *     summary: Get all universities
 *     tags:
 *       - University
 *     responses:
 *       200:
 *         description: List of all universities
 *       500:
 *         description: Internal server error
 */
router.get('/all', getAllUniversities);

/**
 * @openapi
 * /university/{universityId}/logo:
 *   post:
 *     summary: Upload a logo for a university
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
 *                 description: Logo image file (max 2MB, formats: jpeg, jpg, png, gif, webp)
 *     responses:
 *       200:
 *         description: Logo uploaded successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - only university owners can upload logos
 *       404:
 *         description: University not found
 *       500:
 *         description: Internal server error
 */
router.post('/:universityId/logo', authMiddleware, upload, uploadLogo);

/**
 * @openapi
 * /university/{universityId}/logo:
 *   delete:
 *     summary: Delete a university logo
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
 *         description: Logo deleted successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - only university owners can delete logos
 *       404:
 *         description: University not found or no logo exists
 *       500:
 *         description: Internal server error
 */
router.delete('/:universityId/logo', authMiddleware, deleteLogo);

export default router;
