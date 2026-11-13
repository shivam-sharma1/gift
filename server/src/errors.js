import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const field = issue.path.join('.');
    return res.status(400).json({ error: field ? `${field}: ${issue.message}` : issue.message });
  }
  if (err.name === 'CastError') return res.status(404).json({ error: 'Not found.' });
  if (err.code === 11000) return res.status(409).json({ error: 'That already exists.' });
  if (err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be smaller than 5 MB.' : 'Upload failed.';
    return res.status(400).json({ error: message });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
}
