import { z } from 'zod';

const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => {
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, 'Enter a valid link starting with http:// or https://');

const optionalLink = z.union([z.literal(''), httpUrl]);

const uploadedImage = z.string().regex(/^\/api\/uploads\/[a-f0-9]{24}$/);
const optionalImage = z.union([z.literal(''), httpUrl, uploadedImage]);

const name = z.string().trim().min(1, 'Required').max(100);
const optionalText = (max) => z.string().trim().max(max);

// The browser derives this from the password; the server never sees the password itself.
const authSecret = z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'Invalid credentials');
const ciphertext = (max) => z.string().max(max).regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Invalid data');

export const registerSchema = z.object({
  name,
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  authSecret,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  authSecret,
});

export const eventSchema = z.object({
  title: name,
  coupleNames: optionalText(150),
  date: z
    .string()
    .refine((v) => v === '' || !Number.isNaN(Date.parse(v)), 'Enter a valid date')
    .transform((v) => (v ? new Date(v) : null)),
  message: optionalText(1000),
  currency: z.string().trim().min(1).max(5),
});

export const createEventSchema = eventSchema.extend({ wrappedKey: ciphertext(200) });

export const itemSchema = z.object({
  title: name,
  description: optionalText(1000),
  link: optionalLink,
  imageUrl: optionalImage,
  price: z.number().min(0).max(1e9).nullable(),
});

export const fundSchema = z.object({
  title: name,
  description: optionalText(1000),
  imageUrl: optionalImage,
  target: z.number().int().min(1).max(1e9),
});

// Guest name and relationship arrive already encrypted; the tag only detects repeated names.
export const joinSchema = z.object({
  profile: ciphertext(2000),
  nameTag: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid data'),
});

export const contributeSchema = z.object({
  amount: z.number().int('Enter a whole number').min(1, 'Enter an amount above 0').max(1e9),
});
