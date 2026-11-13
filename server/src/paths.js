import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const uploadsDir = path.join(serverRoot, 'uploads');
export const clientDist = path.resolve(serverRoot, '..', 'client', 'dist');
