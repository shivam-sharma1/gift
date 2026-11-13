import { gcm } from '@noble/ciphers/aes.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { hmac } from '@noble/hashes/hmac.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, randomBytes } from '@noble/hashes/utils.js';

// Pure-JS crypto (not WebCrypto) so it also works on plain-HTTP local network addresses.
// Nothing derived here as a key ever leaves the browser; the server only stores ciphertext.

const enc = new TextEncoder();
const dec = new TextDecoder();

export const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
export const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
export const toBase64Url = (bytes) => toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const fromBase64Url = (text) => fromBase64(text.replace(/-/g, '+').replace(/_/g, '/'));

const subkey = (secret, label) => hkdf(sha256, secret, undefined, enc.encode(label), 32);

function seal(key, bytes) {
  const iv = randomBytes(12);
  const sealed = gcm(key, iv).encrypt(bytes);
  const out = new Uint8Array(iv.length + sealed.length);
  out.set(iv);
  out.set(sealed, iv.length);
  return toBase64(out);
}

function open(key, text) {
  const bytes = fromBase64(text);
  return gcm(key, bytes.slice(0, 12)).decrypt(bytes.slice(12));
}

/** From the password, derive a login secret (sent to the server) and a wrapping key (never sent). */
export async function deriveAccountKeys(email, password) {
  const master = await pbkdf2Async(sha256, enc.encode(password), enc.encode(`giftwise:${email.trim().toLowerCase()}`), {
    c: 600_000,
    dkLen: 32,
  });
  return { authSecret: toBase64Url(subkey(master, 'auth')), wrapKey: toBase64(subkey(master, 'wrap')) };
}

export function createEventKey(wrapKey) {
  const eventKey = randomBytes(32);
  return { eventKey: toBase64Url(eventKey), wrappedKey: seal(fromBase64(wrapKey), eventKey) };
}

export const unwrapEventKey = (wrapKey, wrappedKey) => toBase64Url(open(fromBase64(wrapKey), wrappedKey));

export function encryptProfile(eventKey, profile) {
  return seal(subkey(fromBase64Url(eventKey), 'profile'), enc.encode(JSON.stringify(profile)));
}

export function decryptProfile(eventKey, profile) {
  try {
    return JSON.parse(dec.decode(open(subkey(fromBase64Url(eventKey), 'profile'), profile)));
  } catch {
    return { name: 'Unknown guest', relationship: '' };
  }
}

/** Lets the server reject a repeated name without ever learning the name. */
export function nameTag(eventKey, name) {
  const normalised = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  return bytesToHex(hmac(sha256, subkey(fromBase64Url(eventKey), 'name-tag'), enc.encode(normalised)));
}
