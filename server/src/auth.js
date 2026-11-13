import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { Event, Guest, Organizer } from './models.js';
import { HttpError } from './errors.js';

export const signToken = (payload, expiresIn) =>
  jwt.sign(payload, config.jwtSecret, { algorithm: 'HS256', expiresIn });

export const verifyToken = (token) => jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });

function readToken(req, role) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) throw new HttpError(401, 'Please sign in to continue.');
  try {
    const payload = verifyToken(header.slice(7));
    if (payload.role !== role) throw new Error('wrong role');
    return payload;
  } catch {
    throw new HttpError(401, 'Your session has expired. Please sign in again.');
  }
}

export async function requireOrganizer(req, _res, next) {
  const payload = readToken(req, 'organizer');
  const organizer = await Organizer.findById(payload.sub);
  if (!organizer) throw new HttpError(401, 'Please sign in to continue.');
  req.organizer = organizer;
  next();
}

export async function requireGuest(req, _res, next) {
  const payload = readToken(req, 'guest');
  const guest = await Guest.findById(payload.sub);
  const event = guest && (await Event.findById(guest.event));
  if (!event) throw new HttpError(401, 'Please join the event again.');
  req.guest = guest;
  req.event = event;
  next();
}
