import { Router } from 'express';
import { Contribution, Event, Fund, Guest, Item } from '../models.js';
import { requireGuest, signToken, verifyToken } from '../auth.js';
import { config } from '../config.js';
import { HttpError } from '../errors.js';
import { contributeSchema, joinSchema } from '../schemas.js';

// Guests never receive other guests' identities, gifts or amounts. Only these fields leave the server.
const publicEvent = (e) => ({
  title: e.title,
  coupleNames: e.coupleNames,
  date: e.date,
  message: e.message,
  currency: e.currency,
});
const publicItem = (i) => ({
  id: i.id,
  title: i.title,
  description: i.description,
  link: i.link,
  imageUrl: i.imageUrl,
  price: i.price,
});
const publicFund = (f) => ({
  id: f.id,
  title: f.title,
  description: f.description,
  imageUrl: f.imageUrl,
  target: f.target,
  raised: f.raised,
});

// Unauthenticated: look up an event by invite code and join it.
export const publicRouter = Router();

async function findByCode(code) {
  const event = await Event.findOne({ inviteCode: String(code).trim().toUpperCase() });
  if (!event) throw new HttpError(404, 'We could not find an event with that code.');
  return event;
}

const GUEST_TOKEN_DAYS = 120;
const cookieName = (event) => `gw_${event.inviteCode}`;

const sessionFor = (guest, event) => ({
  token: signToken({ sub: guest.id, role: 'guest' }, `${GUEST_TOKEN_DAYS}d`),
  guest: { profile: guest.profile },
  event: publicEvent(event),
});

// The guest this browser already joined as, if the guest still exists.
async function deviceGuest(req, event) {
  const token = req.cookies?.[cookieName(event)];
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    return payload.role === 'guest' ? await Guest.findOne({ _id: payload.sub, event: event._id }) : null;
  } catch {
    return null;
  }
}

publicRouter.get('/events/:code', async (req, res) => {
  const event = await findByCode(req.params.code);
  const guest = await deviceGuest(req, event);
  res.json({ event: publicEvent(event), ...(guest && { session: sessionFor(guest, event) }) });
});

publicRouter.post('/events/:code/join', async (req, res) => {
  const event = await findByCode(req.params.code);
  const data = joinSchema.parse(req.body);
  // This browser already joined: hand back that guest instead of creating a second one under another name.
  const returning = await deviceGuest(req, event);
  if (returning) return res.json(sessionFor(returning, event));

  let guest;
  try {
    guest = await Guest.create({ ...data, event: event._id });
  } catch (err) {
    if (err.code !== 11000) throw err;
    throw new HttpError(
      409,
      'A guest with this name has already joined. If you are someone else with the same name, add your surname or an initial. If this is you on a new device, ask the couple to remove the earlier entry.',
    );
  }
  const session = sessionFor(guest, event);
  // HttpOnly cookie: survives the app's own storage being cleared and can't be read or edited by page scripts.
  res.cookie(cookieName(event), session.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.production,
    path: '/api',
    maxAge: GUEST_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  });
  res.status(201).json(session);
});

const router = Router();
router.use(requireGuest);

router.get('/me', (req, res) => {
  res.json({ guest: { profile: req.guest.profile }, event: publicEvent(req.event) });
});

router.get('/items', async (req, res) => {
  const event = req.event._id;
  const [available, mine, giftedByOthers] = await Promise.all([
    Item.find({ event, claimedBy: null }).sort({ createdAt: 1 }),
    Item.find({ event, claimedBy: req.guest._id }).sort({ claimedAt: 1 }),
    Item.countDocuments({ event, claimedBy: { $nin: [null, req.guest._id] } }),
  ]);
  res.json({ available: available.map(publicItem), mine: mine.map(publicItem), giftedByOthers });
});

router.post('/items/:itemId/claim', async (req, res) => {
  const scope = { _id: req.params.itemId, event: req.event._id };
  const item = await Item.findOneAndUpdate(
    { ...scope, $or: [{ claimedBy: null }, { claimedBy: req.guest._id }] },
    { claimedBy: req.guest._id, claimedAt: new Date() },
    { returnDocument: 'after' },
  );
  if (!item) {
    if (await Item.exists(scope)) throw new HttpError(409, 'Sorry, someone else just picked this gift.');
    throw new HttpError(404, 'Gift not found.');
  }
  res.json({ item: publicItem(item) });
});

router.delete('/items/:itemId/claim', async (req, res) => {
  const item = await Item.findOneAndUpdate(
    { _id: req.params.itemId, event: req.event._id, claimedBy: req.guest._id },
    { claimedBy: null, claimedAt: null },
  );
  if (!item) throw new HttpError(404, 'Gift not found.');
  res.status(204).end();
});

router.get('/funds', async (req, res) => {
  const event = req.event._id;
  const [funds, contributions] = await Promise.all([
    Fund.find({ event }).sort({ createdAt: 1 }),
    Contribution.find({ event, guest: req.guest._id }).sort({ createdAt: 1 }),
  ]);
  const byFund = new Map(contributions.map((c) => [String(c.fund), c]));
  res.json({
    // Funds that are full, or that this guest already pledged to, are not offered again.
    open: funds.filter((f) => f.raised < f.target && !byFund.has(f.id)).map(publicFund),
    mine: funds
      .filter((f) => byFund.has(f.id))
      .map((f) => ({ ...publicFund(f), contributionId: byFund.get(f.id).id, amount: byFund.get(f.id).amount })),
  });
});

router.post('/funds/:fundId/contributions', async (req, res) => {
  const { amount } = contributeSchema.parse(req.body);
  const scope = { _id: req.params.fundId, event: req.event._id };
  if (await Contribution.exists({ fund: req.params.fundId, guest: req.guest._id })) {
    throw new HttpError(409, 'You have already pledged to this fund. Cancel it first to change the amount.');
  }
  // Atomic: the increment only applies while the total stays within the goal.
  const fund = await Fund.findOneAndUpdate(
    { ...scope, $expr: { $lte: [{ $add: ['$raised', amount] }, '$target'] } },
    { $inc: { raised: amount } },
    { returnDocument: 'after' },
  );
  if (!fund) {
    const current = await Fund.findOne(scope);
    if (!current) throw new HttpError(404, 'Fund not found.');
    const remaining = current.target - current.raised;
    throw new HttpError(
      409,
      remaining > 0 ? `Only ${remaining} is still needed for this fund.` : 'This fund has just been filled.',
    );
  }
  try {
    const contribution = await Contribution.create({
      event: req.event._id,
      fund: fund._id,
      guest: req.guest._id,
      amount,
    });
    res.status(201).json({ contributionId: contribution.id });
  } catch (err) {
    await Fund.updateOne({ _id: fund._id }, { $inc: { raised: -amount } });
    throw err;
  }
});

router.delete('/contributions/:contributionId', async (req, res) => {
  const contribution = await Contribution.findOneAndDelete({
    _id: req.params.contributionId,
    guest: req.guest._id,
  });
  if (!contribution) throw new HttpError(404, 'Contribution not found.');
  await Fund.updateOne({ _id: contribution.fund }, { $inc: { raised: -contribution.amount } });
  res.status(204).end();
});

export default router;
