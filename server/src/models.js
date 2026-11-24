import mongoose from 'mongoose';

const { Schema } = mongoose;

mongoose.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.passwordHash;
    delete ret.nameTag;
    return ret;
  },
});

const ref = (model, extra = {}) => ({ type: Schema.Types.ObjectId, ref: model, ...extra });
const text = (extra = {}) => ({ type: String, trim: true, default: '', ...extra });

const organizerSchema = new Schema(
  {
    name: text({ required: true }),
    email: text({ required: true, unique: true, lowercase: true }),
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
);

const eventSchema = new Schema(
  {
    organizer: ref('Organizer', { required: true, index: true }),
    title: text({ required: true }),
    coupleNames: text(),
    date: { type: Date, default: null },
    message: text(),
    currency: text({ default: '₹' }),
    inviteCode: { type: String, required: true, unique: true },
    // Event key encrypted with a key derived from the organiser's password; unreadable to the server.
    wrappedKey: { type: String, required: true },
  },
  { timestamps: true },
);

const guestSchema = new Schema(
  {
    event: ref('Event', { required: true, index: true }),
    // Name and relationship, encrypted in the guest's browser. The server cannot read them.
    profile: { type: String, required: true },
    nameTag: { type: String, required: true },
  },
  { timestamps: true },
);
// A name can only join an event once; the tag is a keyed hash, so the name itself stays unknown.
guestSchema.index({ event: 1, nameTag: 1 }, { unique: true });

const itemSchema = new Schema(
  {
    event: ref('Event', { required: true, index: true }),
    title: text({ required: true }),
    description: text(),
    link: text(),
    imageUrl: text(),
    price: { type: Number, default: null },
    claimedBy: ref('Guest', { default: null }),
    claimedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const fundSchema = new Schema(
  {
    event: ref('Event', { required: true, index: true }),
    title: text({ required: true }),
    description: text(),
    imageUrl: text(),
    target: { type: Number, required: true, min: 1 },
    raised: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

const contributionSchema = new Schema(
  {
    event: ref('Event', { required: true, index: true }),
    fund: ref('Fund', { required: true }),
    guest: ref('Guest', { required: true, index: true }),
    amount: { type: Number, required: true, min: 1 },
  },
  { timestamps: true },
);
contributionSchema.index({ fund: 1, guest: 1 }, { unique: true });

// Images live in the database because the hosting disk is wiped on every deploy.
const uploadSchema = new Schema(
  {
    organizer: ref('Organizer', { required: true }),
    contentType: { type: String, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true },
);

export const Organizer = mongoose.model('Organizer', organizerSchema);
export const Event = mongoose.model('Event', eventSchema);
export const Guest = mongoose.model('Guest', guestSchema);
export const Item = mongoose.model('Item', itemSchema);
export const Fund = mongoose.model('Fund', fundSchema);
export const Contribution = mongoose.model('Contribution', contributionSchema);
export const Upload = mongoose.model('Upload', uploadSchema);
