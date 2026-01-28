import { getMediaById } from '@/utils/storage/db-storage';
import { RequestHandler, Response, Request } from 'express';

/**
 * Serve media file by ID
 * GET /api/media/:id
 */
export const serveMedia: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const mediaId = req.params.id;

    if (!mediaId || Array.isArray(mediaId)) {
      res.status(400).json({ error: 'Media ID is required' });
      return;
    }

    const media = await getMediaById(mediaId);

    if (!media) {
      res.status(404).json({ error: 'Media not found' });
      return;
    }

    // Set appropriate headers for caching
    res.set({
      'Content-Type': media.mimeType,
      'Content-Length': media.size.toString(),
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year (images don't change once uploaded)
      'ETag': `"${media.id}"`,
    });

    // Check for conditional request (browser cache validation)
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === `"${media.id}"`) {
      res.status(304).end();
      return;
    }

    // Send the binary data
    res.send(Buffer.from(media.data));
  } catch (error: any) {
    console.error('serveMedia error:', error);
    res.status(500).json({ error: 'Failed to retrieve media' });
  }
};
