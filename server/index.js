import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { env, warnForMissingConfiguration } from './config/env.js';
import { connectDatabase, isDatabaseConnected } from './config/database.js';
import { apiRouter } from './routes/api.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

warnForMissingConfiguration();
const app = express();
const allowedOrigins = env.clientOrigin.split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  }
}));
app.use(express.json({ limit: '7mb' }));
app.use('/api/capture', rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many captures. Please wait a minute and try again.' } }));
app.use('/api', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

connectDatabase().catch((error) => console.error(`[db] connection failed: ${error.message}`));
app.listen(env.port, () => console.log(`[server] SpeciesDex API listening on :${env.port}; db=${isDatabaseConnected() ? 'connected' : 'waiting'}`));

