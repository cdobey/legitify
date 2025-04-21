import {
  addHolderToIssuer,
  getHolderIssuers,
  getIssuerHolders,
  getPendingAffiliations,
  registerHolder,
  requestHolderAffiliation,
  respondToAffiliation,
} from '@/controllers/holder-affiliation.controller';
import {
  createIssuer,
  getAllIssuers,
  getMyIssuers,
  getMyPendingJoinRequests,
  getPendingJoinRequests,
  requestJoinIssuer,
  respondToJoinRequest,
} from '@/controllers/issuer-management.controller';
import { deleteLogo, upload, uploadLogo } from '@/controllers/issuer-media.controller';
import { authMiddleware } from '@/middleware/auth';
import { Router } from 'express';

const router = Router();

/**
 * @openapi
 * /issuer/create:
 *   post:
 *     summary: Create a new issuer sub-organization
 *     tags:
 *       - Issuer
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
 *               - shorthand
 *             properties:
 *               name:
 *                 type: string
 *                 description: Unique identifier name for the issuer
 *               shorthand:
 *                 type: string
 *                 description: Short abbreviated name for the issuer (e.g., DCU)
 *               description:
 *                 type: string
 *                 description: Optional description of the issuer
 *               logoUrl:
 *                 type: string
 *                 description: Optional URL to the issuer's logo
 *               country:
 *                 type: string
 *                 description: Country where the issuer is located
 *               address:
 *                 type: string
 *                 description: Physical address of the issuer
 *               website:
 *                 type: string
 *                 description: Official website URL of the issuer
 *               foundedYear:
 *                 type: integer
 *                 description: Year the institution was founded
 *     responses:
 *       201:
 *         description: Issuer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Issuer created successfully
 *                 issuer:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     shorthand:
 *                       type: string
 *                     description:
 *                       type: string
 *                     logoUrl:
 *                       type: string
 *                       nullable: true
 *                     country:
 *                       type: string
 *                       nullable: true
 *                     address:
 *                       type: string
 *                       nullable: true
 *                     website:
 *                       type: string
 *                       nullable: true
 *                     foundedYear:
 *                       type: integer
 *                       nullable: true
 *                     ownerId:
 *                       type: string
 *                     issuerType:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - only issuer users can create issuers
 *       500:
 *         description: Internal server error
 */
router.post('/create', authMiddleware, createIssuer);

/**
 * @openapi
 * /issuer/my:
 *   get:
 *     summary: Get all issuers owned by the current user
 *     tags:
 *       - Issuer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of owned issuers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   displayName:
 *                     type: string
 *                   description:
 *                     type: string
 *                   logoUrl:
 *                     type: string
 *                     nullable: true
 *                   ownerId:
 *                     type: string
 *                   issuerType:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *                   affiliations:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         userId:
 *                           type: string
 *                         issuerId:
 *                           type: string
 *                         status:
 *                           type: string
 *                         user:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             username:
 *                               type: string
 *                             email:
 *                               type: string
 *                   memberRole:
 *                     type: string
 *                     description: User's role within this issuer (admin, etc.)
 *       403:
 *         description: Forbidden - only issuer users can access this endpoint
 *       500:
 *         description: Internal server error
 */
router.get('/my', authMiddleware, getMyIssuers);

/**
 * @openapi
 * /issuer/add-holder:
 *   post:
 *     summary: Add a holder to a issuer
 *     tags:
 *       - Issuer
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - issuerId
 *               - holderEmail
 *             properties:
 *               issuerId:
 *                 type: string
 *                 description: ID of the issuer (issuer)
 *               holderEmail:
 *                 type: string
 *                 description: Email of the holder to add
 *     responses:
 *       201:
 *         description: Holder added to issuer successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Holder affiliation request sent successfully
 *                 affiliation:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     issuerId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, active, rejected]
 *                     initiatedBy:
 *                       type: string
 *                       enum: [issuer, holder]
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - only issuer users can add holders
 *       404:
 *         description: Issuer or holder not found
 *       500:
 *         description: Internal server error
 */
router.post('/add-holder', authMiddleware, addHolderToIssuer);

/**
 * @openapi
 * /issuer/my-affiliations:
 *   get:
 *     summary: Get all issuers that a holder is affiliated with
 *     tags:
 *       - Issuer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of affiliated issuers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   displayName:
 *                     type: string
 *                   description:
 *                     type: string
 *                     nullable: true
 *                   logoUrl:
 *                     type: string
 *                     nullable: true
 *                   ownerId:
 *                     type: string
 *                   issuerType:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *                   owner:
 *                     type: object
 *                     properties:
 *                       username:
 *                         type: string
 *       403:
 *         description: Forbidden - only holder users can access this endpoint
 *       500:
 *         description: Internal server error
 */
router.get('/my-affiliations', authMiddleware, getHolderIssuers);

/**
 * @openapi
 * /issuer/register-holder:
 *   post:
 *     summary: Register a new holder and affiliate them with a issuer
 *     tags:
 *       - Issuer
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
 *               - issuerId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *               issuerId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Holder registered and affiliated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Holder registered and affiliated successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [holder]
 *                     orgName:
 *                       type: string
 *                       enum: [orgholder]
 *                 affiliation:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     issuerId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [active]
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - only issuer users can register holders
 *       404:
 *         description: Issuer not found
 *       500:
 *         description: Internal server error
 */
router.post('/register-holder', authMiddleware, registerHolder);

/**
 * @openapi
 * /issuer/{issuerId}/holders:
 *   get:
 *     summary: Get all holders affiliated with a issuer
 *     tags:
 *       - Issuer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: issuerId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the issuer/issuer
 *     responses:
 *       200:
 *         description: List of affiliated holders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   username:
 *                     type: string
 *                   email:
 *                     type: string
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - only issuer users can access this endpoint
 *       404:
 *         description: Issuer not found
 *       500:
 *         description: Internal server error
 */
router.get('/:issuerId/holders', authMiddleware, getIssuerHolders);

/**
 * @openapi
 * /issuer/pending-affiliations:
 *   get:
 *     summary: Get all pending issuer affiliation requests for the current user
 *     tags:
 *       - Issuer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending affiliation requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   userId:
 *                     type: string
 *                   issuerId:
 *                     type: string
 *                   status:
 *                     type: string
 *                     enum: [pending]
 *                   initiatedBy:
 *                     type: string
 *                     enum: [issuer, holder]
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *                   issuer:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       displayName:
 *                         type: string
 *                       name:
 *                         type: string
 *                       owner:
 *                         type: object
 *                         properties:
 *                           username:
 *                             type: string
 *                   user:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       username:
 *                         type: string
 *                       email:
 *                         type: string
 *       403:
 *         description: Forbidden - only holder users can access this endpoint
 *       500:
 *         description: Internal server error
 */
router.get('/pending-affiliations', authMiddleware, getPendingAffiliations);

/**
 * @openapi
 * /issuer/respond-affiliation:
 *   post:
 *     summary: Respond to a issuer affiliation request
 *     tags:
 *       - Issuer
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
 *                 description: ID of the affiliation request
 *               accept:
 *                 type: boolean
 *                 description: Whether to accept or reject the request
 *     responses:
 *       200:
 *         description: Successfully responded to affiliation request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Holder affiliation request accepted
 *                 affiliation:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     issuerId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [active, rejected]
 *                     initiatedBy:
 *                       type: string
 *                       enum: [issuer, holder]
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - only authorized users can respond to affiliation requests
 *       404:
 *         description: Affiliation request not found
 *       500:
 *         description: Internal server error
 */
router.post('/respond-affiliation', authMiddleware, respondToAffiliation);

/**
 * @openapi
 * /issuer/request-join:
 *   post:
 *     summary: Request to join an existing issuer
 *     tags:
 *       - Issuer
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - issuerId
 *             properties:
 *               issuerId:
 *                 type: string
 *                 description: ID of the issuer to join
 *     responses:
 *       201:
 *         description: Join request submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Join request submitted successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - only issuer users can request to join
 *       404:
 *         description: Issuer not found
 *       500:
 *         description: Internal server error
 */
router.post('/request-join', authMiddleware, requestJoinIssuer);

/**
 * @openapi
 * /issuer/request-holder-affiliation:
 *   post:
 *     summary: Request affiliation with a issuer as a holder
 *     tags:
 *       - Issuer
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - issuerId
 *             properties:
 *               issuerId:
 *                 type: string
 *                 description: ID of the issuer to affiliate with
 *     responses:
 *       201:
 *         description: Holder affiliation request submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Holder affiliation request submitted successfully
 *                 affiliation:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     issuerId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending]
 *                     initiatedBy:
 *                       type: string
 *                       enum: [holder]
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - only holder users can request holder affiliations
 *       404:
 *         description: Issuer not found
 *       500:
 *         description: Internal server error
 */
router.post('/request-holder-affiliation', authMiddleware, requestHolderAffiliation);

/**
 * @openapi
 * /issuer/pending-join-requests:
 *   get:
 *     summary: Get all pending issuer join requests for the current issuer
 *     tags:
 *       - Issuer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending join requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   requesterId:
 *                     type: string
 *                   issuerId:
 *                     type: string
 *                   status:
 *                     type: string
 *                     enum: [pending]
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *                   requester:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       username:
 *                         type: string
 *                       email:
 *                         type: string
 *                   issuer:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       displayName:
 *                         type: string
 *       403:
 *         description: Forbidden - only issuer users can access this endpoint
 *       404:
 *         description: Issuer not found
 *       500:
 *         description: Internal server error
 */
router.get('/pending-join-requests', authMiddleware, getPendingJoinRequests);

/**
 * @openapi
 * /issuer/my-pending-join-requests:
 *   get:
 *     summary: Get pending join requests initiated BY the current issuer user
 *     tags:
 *       - Issuer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending join requests made by the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   requesterId:
 *                     type: string
 *                   issuerId:
 *                     type: string
 *                   status:
 *                     type: string
 *                     enum: [pending]
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *                   issuer:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       displayName:
 *                         type: string
 *       403:
 *         description: Forbidden - only issuer users can access this endpoint
 *       500:
 *         description: Internal server error
 */
router.get('/my-pending-join-requests', authMiddleware, getMyPendingJoinRequests);

/**
 * @openapi
 * /issuer/respond-join-request:
 *   post:
 *     summary: Respond to a issuer join request
 *     tags:
 *       - Issuer
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
 *               - accept
 *             properties:
 *               requestId:
 *                 type: string
 *                 description: ID of the join request
 *               accept:
 *                 type: boolean
 *                 description: Whether to accept or reject the request
 *     responses:
 *       200:
 *         description: Successfully responded to join request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Join request approved
 *                 request:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     requesterId:
 *                       type: string
 *                     issuerId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [approved, rejected]
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - only issuer owners can respond to join requests
 *       404:
 *         description: Join request not found
 *       500:
 *         description: Internal server error
 */
router.post('/respond-join-request', authMiddleware, respondToJoinRequest);

/**
 * @openapi
 * /issuer/all:
 *   get:
 *     summary: Get all issuers
 *     tags:
 *       - Issuer
 *     responses:
 *       200:
 *         description: List of all issuers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   displayName:
 *                     type: string
 *                   description:
 *                     type: string
 *                     nullable: true
 *                   logoUrl:
 *                     type: string
 *                     nullable: true
 *                   ownerId:
 *                     type: string
 *                   issuerType:
 *                     type: string
 *                   owner:
 *                     type: object
 *                     properties:
 *                       username:
 *                         type: string
 *       500:
 *         description: Internal server error
 */
router.get('/all', getAllIssuers);

/**
 * @openapi
 * /issuer/{issuerId}/logo:
 *   post:
 *     summary: Upload a logo for a issuer
 *     tags:
 *       - Issuer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: issuerId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the issuer/issuer
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
 *                 description: "Logo image file (max 2MB, formats: jpeg, jpg, png, gif, webp)"
 *     responses:
 *       200:
 *         description: Logo uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logo uploaded successfully
 *                 issuer:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     displayName:
 *                       type: string
 *                     logoUrl:
 *                       type: string
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - only issuer owners can upload logos
 *       404:
 *         description: Issuer not found
 *       500:
 *         description: Internal server error
 */
router.post('/:issuerId/logo', authMiddleware, upload, uploadLogo);

/**
 * @openapi
 * /issuer/{issuerId}/logo:
 *   delete:
 *     summary: Delete a issuer logo
 *     tags:
 *       - Issuer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: issuerId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the issuer/issuer
 *     responses:
 *       200:
 *         description: Logo deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logo deleted successfully
 *                 issuer:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     displayName:
 *                       type: string
 *                     logoUrl:
 *                       type: null
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - only issuer owners can delete logos
 *       404:
 *         description: Issuer not found or no logo exists
 *       500:
 *         description: Internal server error
 */
router.delete('/:issuerId/logo', authMiddleware, deleteLogo);

export default router;
