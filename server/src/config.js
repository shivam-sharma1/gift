import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT) || 4000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wedding-gifts',
  jwtSecret: process.env.JWT_SECRET,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  production: process.env.NODE_ENV === 'production',
};

if (!config.jwtSecret || config.jwtSecret === 'change-me') {
  throw new Error('Set a strong JWT_SECRET in server/.env (see .env.example).');
}
