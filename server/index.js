import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load env from root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Fallback defaults
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'dev-secret-change-in-production';
if (!process.env.PORT) process.env.PORT = '3000';

import authRoutes from './routes/auth.js';
import budgetRoutes from './routes/budgets.js';
import transactionRoutes from './routes/transactions.js';
import webhookRoutes from './routes/webhook.js';
import adminRoutes from './routes/admin.js';
import dashboardRoutes from './routes/dashboard.js';
import notificationRoutes from './routes/notifications.js';
import partnerRoutes from './routes/partner.js';
import settingsRoutes from './routes/settings.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled so Vite dev proxy works; enable in prod if needed
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.APP_URL, 'https://budget.vidalpablo.com'].filter(Boolean)
    : true,
  credentials: true
}));

app.use(express.json({ limit: '10kb' })); // Prevent huge payloads

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { error: 'Too many webhook requests.' }
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/webhook', webhookLimiter, webhookRoutes);
app.use('/api/admin/webhooks', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/partner', partnerRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static client build in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 VU Budget server running on http://localhost:${PORT}`);
});
