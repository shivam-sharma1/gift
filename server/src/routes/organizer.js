import { Router } from 'express';
import crypto from 'node:crypto';
import multer from 'multer';
import { Contribution, Event, Fund, Guest, Item, Upload } from '../models.js';
import { requireOrganizer } from '../auth.js';
import { HttpError } from '../errors.js';
import { createEventSchema, eventSchema, fundSchema, itemSchema } from '../schemas.js';

const router = Router();
router.use(requireOrganizer);

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    IMAGE_TYPES.has(file.mimetype)
      ? cb(null, true)
      : cb(new HttpError(400, 'Only JPG, PNG, WebP or GIF images are allowed.')),
});

router.post('/uploads', upload.single('image'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Choose an image to upload.');
  const image = await Upload.create({
    organizer: req.organizer._id,
    contentType: req.file.mimetype,
    data: req.file.buffer,
  });
  res.status(201).json({ url: `/api/uploads/${image.id}` });
});

// Unambiguous characters only, so codes are easy to read out or type on a phone.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newInviteCode = () => Array.from({ length: 8 }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join('');

router.get('/events', async (req, res) => {
  const events = await Event.find({ organizer: req.organizer._id }).sort({ createdAt: -1 });
  const counts = await Guest.aggregate([
    { $match: { event: { $in: events.map((e) => e._id) } } },
    { $group: { _id: '$event', count: { $sum: 1 } } },
  ]);
  const byEvent = new Map(counts.map((c) => [String(c._id), c.count]));
  res.json({ events: events.map((e) => ({ ...e.toJSON(), guestCount: byEvent.get(e.id) || 0 })) });
});

router.post('/events', async (req, res) => {
  const data = createEventSchema.parse(req.body);
  for (let attempt = 0; ; attempt++) {
    try {
      const event = await Event.create({ ...data, organizer: req.organizer._id, inviteCode: newInviteCode() });
      return res.status(201).json({ event });
    } catch (err) {
      if (err.code !== 11000 || attempt >= 4) throw err;
    }
  }
});

// Every route below is scoped to an event that belongs to the signed-in organiser.
const events = Router({ mergeParams: true });
router.use('/events/:eventId', async (req, _res, next) => {
  const event = await Event.findOne({ _id: req.params.eventId, organizer: req.organizer._id });
  if (!event) throw new HttpError(404, 'Event not found.');
  req.event = event;
  next();
}, events);

events.get('/', async (req, res) => {
  const eventId = req.event._id;
  const [guestCount, items, funds] = await Promise.all([
    Guest.countDocuments({ event: eventId }),
    Item.find({ event: eventId }, 'claimedBy'),
    Fund.find({ event: eventId }, 'target raised'),
  ]);
  res.json({
    event: req.event,
    stats: {
      guests: guestCount,
      items: items.length,
      itemsClaimed: items.filter((i) => i.claimedBy).length,
      funds: funds.length,
      fundsTarget: funds.reduce((sum, f) => sum + f.target, 0),
      fundsRaised: funds.reduce((sum, f) => sum + f.raised, 0),
    },
  });
});

events.put('/', async (req, res) => {
  req.event.set(eventSchema.parse(req.body));
  await req.event.save();
  res.json({ event: req.event });
});

events.delete('/', async (req, res) => {
  const event = req.event._id;
  await Promise.all([
    Contribution.deleteMany({ event }),
    Fund.deleteMany({ event }),
    Item.deleteMany({ event }),
    Guest.deleteMany({ event }),
  ]);
  await req.event.deleteOne();
  res.status(204).end();
});

// Wishlist
events.get('/items', async (req, res) => {
  const items = await Item.find({ event: req.event._id }).sort({ createdAt: 1 }).populate('claimedBy', 'profile');
  res.json({ items });
});

events.post('/items', async (req, res) => {
  const item = await Item.create({ ...itemSchema.parse(req.body), event: req.event._id });
  res.status(201).json({ item });
});

events.put('/items/:itemId', async (req, res) => {
  const item = await Item.findOneAndUpdate(
    { _id: req.params.itemId, event: req.event._id },
    itemSchema.parse(req.body),
    { returnDocument: 'after' },
  ).populate('claimedBy', 'profile');
  if (!item) throw new HttpError(404, 'Gift not found.');
  res.json({ item });
});

events.delete('/items/:itemId', async (req, res) => {
  const item = await Item.findOneAndDelete({ _id: req.params.itemId, event: req.event._id });
  if (!item) throw new HttpError(404, 'Gift not found.');
  res.status(204).end();
});

// Funds
events.get('/funds', async (req, res) => {
  const [funds, contributions] = await Promise.all([
    Fund.find({ event: req.event._id }).sort({ createdAt: 1 }),
    Contribution.find({ event: req.event._id }).sort({ createdAt: 1 }).populate('guest', 'profile'),
  ]);
  res.json({
    funds: funds.map((fund) => ({
      ...fund.toJSON(),
      contributions: contributions.filter((c) => String(c.fund) === fund.id),
    })),
  });
});

events.post('/funds', async (req, res) => {
  const fund = await Fund.create({ ...fundSchema.parse(req.body), event: req.event._id });
  res.status(201).json({ fund: { ...fund.toJSON(), contributions: [] } });
});

events.put('/funds/:fundId', async (req, res) => {
  const data = fundSchema.parse(req.body);
  const scope = { _id: req.params.fundId, event: req.event._id };
  // The goal can't drop below what guests have already pledged.
  const fund = await Fund.findOneAndUpdate({ ...scope, raised: { $lte: data.target } }, data, { returnDocument: 'after' });
  if (!fund) {
    if (await Fund.exists(scope)) throw new HttpError(409, 'The goal cannot be lower than the amount already pledged.');
    throw new HttpError(404, 'Fund not found.');
  }
  res.json({ fund });
});

events.delete('/funds/:fundId', async (req, res) => {
  const fund = await Fund.findOneAndDelete({ _id: req.params.fundId, event: req.event._id });
  if (!fund) throw new HttpError(404, 'Fund not found.');
  await Contribution.deleteMany({ fund: fund._id });
  res.status(204).end();
});

// Guests
events.get('/guests', async (req, res) => {
  const event = req.event._id;
  const [guests, items, contributions] = await Promise.all([
    Guest.find({ event }).sort({ createdAt: 1 }),
    Item.find({ event, claimedBy: { $ne: null } }, 'title claimedBy'),
    Contribution.find({ event }).populate('fund', 'title'),
  ]);
  res.json({
    guests: guests.map((guest) => ({
      ...guest.toJSON(),
      gifts: items.filter((i) => String(i.claimedBy) === guest.id).map((i) => i.title),
      contributions: contributions
        .filter((c) => String(c.guest) === guest.id)
        .map((c) => ({ fundTitle: c.fund?.title, amount: c.amount })),
    })),
  });
});

events.delete('/guests/:guestId', async (req, res) => {
  const guest = await Guest.findOneAndDelete({ _id: req.params.guestId, event: req.event._id });
  if (!guest) throw new HttpError(404, 'Guest not found.');
  await Item.updateMany({ claimedBy: guest._id }, { claimedBy: null, claimedAt: null });
  const contributions = await Contribution.find({ guest: guest._id });
  await Promise.all(contributions.map((c) => Fund.updateOne({ _id: c.fund }, { $inc: { raised: -c.amount } })));
  await Contribution.deleteMany({ guest: guest._id });
  res.status(204).end();
});

export default router;
