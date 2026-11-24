import { Router } from 'express';
import { Upload } from '../models.js';
import { HttpError } from '../errors.js';

const router = Router();

// Public on purpose: guests' browsers load these as plain <img> tags. Ids are unguessable ObjectIds.
router.get('/:id', async (req, res) => {
  const image = await Upload.findById(req.params.id, 'contentType data');
  if (!image) throw new HttpError(404, 'Not found.');
  res.set({
    'Content-Type': image.contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
    // The web app is on another origin, so helmet's same-origin default would block the image.
    'Cross-Origin-Resource-Policy': 'cross-origin',
  });
  res.send(image.data);
});

export default router;
