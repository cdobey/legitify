import {
  getAllLedgerRecords,
  getMyCredentials,
  getRecentIssuedCredentials,
  getUserCredentials,
} from '@/controllers/credential-lookup.controller';
import {
  acceptCredential,
  denyCredential,
  issueCredential,
} from '@/controllers/credential-management.controller';
import {
  getAccessibleCredentials,
  getAccessRequests,
  grantAccess,
  requestAccess,
  viewCredential,
} from '@/controllers/credential-request.controller';
import { verifyCredentialDocument } from '@/controllers/credential-verifier.controller';
import { authMiddleware } from '@/middleware/auth';
import { Router } from 'express';

const router = Router();

/**
 * @openapi
 * /credential/issue:
 *   post:
 *     summary: Issuer issues a credential
 *     tags:
 *       - Credential
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
 *               - base64File
 *               - issuerOrgId
 *               - title
 *               - description
 *               - type
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email of the credential holder
 *               base64File:
 *                 type: string
 *                 description: Base64 encoded file
 *               title:
 *                 type: string
 *                 description: Title of the credential
 *               description:
 *                 type: string
 *                 description: Description of the credential
 *               expirationDate:
 *                 type: string
 *                 format: date
 *                 description: Optional date when the credential expires
 *               type:
 *                 type: string
 *                 description: Type of credential (credential, certificate, etc.)
 *               attributes:
 *                 type: object
 *                 description: Additional attributes for the credential
 *               issuerOrgId:
 *                 type: string
 *                 description: ID of the issuer organization
 *     responses:
 *       201:
 *         description: Credential issued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 docId:
 *                   type: string
 *                 docHash:
 *                   type: string
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.post('/issue', authMiddleware, issueCredential);

/**
 * @openapi
 * /credential/accept:
 *   post:
 *     summary: Holder accepts a credential
 *     tags:
 *       - Credential
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
 *                 description: ID of the credential document
 *     responses:
 *       200:
 *         description: Credential accepted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 */
router.post('/accept', authMiddleware, acceptCredential);

/**
 * @openapi
 * /credential/deny:
 *   post:
 *     summary: Holder denies a credential
 *     tags:
 *       - Credential
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
 *                 description: ID of the credential document
 *     responses:
 *       200:
 *         description: Credential denied successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 */
router.post('/deny', authMiddleware, denyCredential);

/**
 * @openapi
 * /credential/requestAccess:
 *   post:
 *     summary: Verifier requests access to a credential document
 *     tags:
 *       - Credential
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
 *                 description: ID of the credential document
 *     responses:
 *       201:
 *         description: Access requested successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 requestId:
 *                   type: string
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
 * /credential/grantAccess:
 *   post:
 *     summary: Holder grants or denies an verifier's access request
 *     tags:
 *       - Credential
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
 *                 description: ID of the access request
 *               granted:
 *                 type: boolean
 *                 description: Whether to grant or deny access
 *     responses:
 *       200:
 *         description: Access granted or denied successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 request:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
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
 * /credential/view/{docId}:
 *   get:
 *     summary: Verifier views a credential document if access is granted and verifies its hash
 *     tags:
 *       - Credential
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: docId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the credential document
 *     responses:
 *       200:
 *         description: Credential document retrieved and verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 docId:
 *                   type: string
 *                 verified:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                 type:
 *                   type: string
 *                 issuedAt:
 *                   type: string
 *                 issueDate:
 *                   type: string
 *                 expirationDate:
 *                   type: string
 *                 verificationHash:
 *                   type: string
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 attributes:
 *                   type: object
 *                 issuer:
 *                   type: string
 *                 issuerInfo:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     displayName:
 *                       type: string
 *                     description:
 *                       type: string
 *                     logoUrl:
 *                       type: string
 *                 holder:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                 blockchainInfo:
 *                   type: object
 *                   properties:
 *                     recordCreated:
 *                       type: string
 *                     lastUpdated:
 *                       type: string
 *                 fileData:
 *                   type: string
 *                 accessGrantedOn:
 *                   type: string
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 */
router.get('/view/:docId', authMiddleware, viewCredential);

/**
 * @openapi
 * /credential/requests:
 *   get:
 *     summary: Get all access requests for a user's credentials
 *     tags:
 *       - Credential
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
 *                   credentialId:
 *                     type: string
 *                   credentialTitle:
 *                     type: string
 *                   credentialType:
 *                     type: string
 *                   credentialStatus:
 *                     type: string
 *                   verifierName:
 *                     type: string
 *                   verifierOrg:
 *                     type: string
 *                   requestDate:
 *                     type: string
 *                     format: date-time
 *                   status:
 *                     type: string
 *                     enum: [pending, granted, denied]
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.get('/requests', authMiddleware, getAccessRequests);

/**
 * @openapi
 * /credential/list:
 *   get:
 *     summary: Get all credentials for the current user
 *     tags:
 *       - Credential
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   docId:
 *                     type: string
 *                   issuer:
 *                     type: string
 *                   status:
 *                     type: string
 *                     enum: [issued, accepted, denied]
 *                   issueDate:
 *                     type: string
 *                     format: date-time
 *                   issuerId:
 *                     type: string
 *                   type:
 *                     type: string
 *                   title:
 *                     type: string
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.get('/list', authMiddleware, getMyCredentials);

/**
 * @openapi
 * /credential/verify:
 *   post:
 *     summary: Verify a credential document
 *     tags:
 *       - Credential
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
 *               - base64File
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email of the credential holder
 *               base64File:
 *                 type: string
 *                 description: Base64 encoded file to verify
 *     responses:
 *       200:
 *         description: Verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 verified:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 credentialId:
 *                   type: string
 *                 fileData:
 *                   type: string
 *                 details:
 *                   type: object
 *                   properties:
 *                     holderName:
 *                       type: string
 *                     issuer:
 *                       type: string
 *                     issuerLogoUrl:
 *                       type: string
 *                     issuerId:
 *                       type: string
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     type:
 *                       type: string
 *                     attributes:
 *                       type: object
 *                     issuanceDate:
 *                       type: string
 *                     issuedAt:
 *                       type: string
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.post('/verify', authMiddleware, verifyCredentialDocument);

/**
 * @openapi
 * /credential/ledger/all:
 *   get:
 *     summary: Get all records from the blockchain ledger for the calling issuer
 *     tags:
 *       - Credential
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all credential records from the ledger for the authenticated issuer
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   docId:
 *                     type: string
 *                   docHash:
 *                     type: string
 *                   type:
 *                     type: string
 *                   holderId:
 *                     type: string
 *                   issuerId:
 *                     type: string
 *                   issuedAt:
 *                     type: string
 *                   accepted:
 *                     type: boolean
 *                   denied:
 *                     type: boolean
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   issuerName:
 *                     type: string
 *                   holderEmail:
 *                     type: string
 *       403:
 *         description: Forbidden - only issuer role can access
 *       500:
 *         description: Internal server error
 */
router.get('/ledger/all', authMiddleware, getAllLedgerRecords);

/**
 * @openapi
 * /credential/user/{userId}:
 *   get:
 *     summary: Get all credentials for a specific user by userId
 *     tags:
 *       - Credential
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user whose credentials to retrieve
 *     responses:
 *       200:
 *         description: List of user's accepted credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   docId:
 *                     type: string
 *                   issuer:
 *                     type: string
 *                   status:
 *                     type: string
 *                   issueDate:
 *                     type: string
 *                     format: date-time
 *                   description:
 *                     type: string
 *                   type:
 *                     type: string
 *                   title:
 *                     type: string
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - only verifiers can access this endpoint
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/user/:userId', authMiddleware, getUserCredentials);

/**
 * @openapi
 * /credential/accessible:
 *   get:
 *     summary: Get all credentials accessible to the logged-in verifier
 *     tags:
 *       - Credential
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of accessible credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   requestId:
 *                     type: string
 *                   credentialId:
 *                     type: string
 *                   title:
 *                     type: string
 *                   type:
 *                     type: string
 *                   issuer:
 *                     type: string
 *                   holder:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                   status:
 *                     type: string
 *                     enum: [pending, granted, denied]
 *                   requestedAt:
 *                     type: string
 *                     format: date-time
 *                   dateGranted:
 *                     type: string
 *                     format: date-time
 *       403:
 *         description: Forbidden - only verifiers can access this endpoint
 *       500:
 *         description: Internal server error
 */
router.get('/accessible', authMiddleware, getAccessibleCredentials);

/**
 * @openapi
 * /credential/recent-issued:
 *   get:
 *     summary: Get recently issued credentials for issuer dashboard
 *     tags:
 *       - Credential
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of recently issued credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   docId:
 *                     type: string
 *                   issuedTo:
 *                     type: string
 *                   recipientName:
 *                     type: string
 *                   status:
 *                     type: string
 *                     enum: [issued, accepted, denied]
 *                   issueDate:
 *                     type: string
 *                     format: date-time
 *                   issuer:
 *                     type: string
 *                   type:
 *                     type: string
 *                   title:
 *                     type: string
 *       403:
 *         description: Forbidden - only issuer can access this endpoint
 *       500:
 *         description: Internal server error
 */
router.get('/recent-issued', authMiddleware, getRecentIssuedCredentials);

export default router;
