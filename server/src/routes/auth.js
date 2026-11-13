import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Organizer } from '../models.js';
import { requireOrganizer, signToken } from '../auth.js';
import { HttpError } from '../errors.js';
import { loginSchema, registerSchema } from '../schemas.js';

const router = Router();

const session = (organizer) => ({
  token: signToken({ sub: organizer.id, role: 'organizer' }, '30d'),
  organizer: { id: organizer.id, name: organizer.name, email: organizer.email },
});

// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const dummyHash = bcrypt.hashSync('not-a-real-login-secret', 12);

router.post('/register', async (req, res) => {
  const { name, email, authSecret } = registerSchema.parse(req.body);
  if (await Organizer.exists({ email })) throw new HttpError(409, 'An account with this email already exists.');
  const organizer = await Organizer.create({ name, email, passwordHash: await bcrypt.hash(authSecret, 12) });
  res.status(201).json(session(organizer));
});

router.post('/login', async (req, res) => {
  const { email, authSecret } = loginSchema.parse(req.body);
  const organizer = await Organizer.findOne({ email });
  const ok = await bcrypt.compare(authSecret, organizer ? organizer.passwordHash : dummyHash);
  if (!organizer || !ok) throw new HttpError(401, 'Incorrect email or password.');
  res.json(session(organizer));
});

router.get('/me', requireOrganizer, (req, res) => {
  const { id, name, email } = req.organizer;
  res.json({ organizer: { id, name, email } });
});

export default router;
