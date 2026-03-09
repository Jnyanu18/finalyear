import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.SERVER_PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
  mongodbDb: process.env.MONGODB_DB || 'agrivision',
  jwtSecret: process.env.AUTH_JWT_SECRET || 'dev-only-change-me',
  cookieName: 'agrivision_session',
  isProduction: process.env.NODE_ENV === 'production',
};
