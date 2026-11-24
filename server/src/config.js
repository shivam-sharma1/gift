import 'dotenv/config';

// Database settings come from server/.env locally and from GitHub secrets in the cluster.
for (const name of ['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'JWT_SECRET']) {
  if (!process.env[name]) throw new Error(`${name} is not set.`);
}

const { DB_HOST, DB_USERNAME, DB_PASSWORD } = process.env;

export const config = {
  port: Number(process.env.PORT) || 4000,
  mongoUri: `mongodb+srv://${encodeURIComponent(DB_USERNAME)}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}/`,
  mongoDb: 'gift',
  jwtSecret: process.env.JWT_SECRET,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  production: process.env.NODE_ENV === 'production',
};
