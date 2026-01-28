import { Router } from 'express';
import { serveMedia } from '@/controllers/media.controller';

const router = Router();

/**
 * @openapi
 * /api/media/{id}:
 *   get:
 *     summary: Serve media file by ID
 *     description: Retrieves and serves a media file (image) stored in the database. Supports browser caching via ETag.
 *     tags:
 *       - Media
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique identifier of the media file
 *     responses:
 *       200:
 *         description: Media file returned successfully
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       304:
 *         description: Not Modified (browser cache is valid)
 *       404:
 *         description: Media not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', serveMedia);

export default router;
