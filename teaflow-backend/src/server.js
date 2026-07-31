import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import logger from './middleware/logger.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import menuRoutes from './routes/menu.routes.js';
import orderRoutes from './routes/order.routes.js';
import workerRoutes from './routes/worker.routes.js';
import shopRoutes from './routes/shop.routes.js';
import eventRoutes, { setupOrderRealtimeSubscription } from './routes/event.routes.js';
import superAdminRoutes from './routes/superAdmin.routes.js';

const app = express();

app.use(helmet());

// Parse allowed origins from CORS_ORIGIN (comma-separated) into an array
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : [];

// Dynamic CORS origin function to support multiple origins correctly
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., mobile apps, curl, same-origin)
    if (!origin) return callback(null, true);
    // Allow all origins if wildcard is configured
    if (allowedOrigins.includes('*')) return callback(null, true);
    // Reflect the specific origin if it is in the allowed list
    if (allowedOrigins.includes(origin)) return callback(null, origin);
    // Reject disallowed origins
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(logger);

// Rate limiting: only restrict auth login and general API separately
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many login attempts, please try again later.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/login/worker', authLimiter);
app.use('/api/super-admin/auth/login', authLimiter);

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { message: 'Too many requests, please try again later.' },
});
app.use('/api/', generalLimiter);

app.get('/', (req, res) => {
  res.json({ message: 'Order Manager Backend API Running' });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'running',
    database: 'connected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/super-admin', superAdminRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Initialize Supabase Realtime subscription for order status changes
  setupOrderRealtimeSubscription();
});

app.use(notFound);
app.use(errorHandler);
