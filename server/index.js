import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
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
import pushRoutes from './routes/push.js';
import ignoredPatternsRoutes from './routes/ignoredPatterns.js';

import { startResetScheduler } from './services/budgetReset.js';
import { startCronScheduler } from './services/cron.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Trust reverse proxy (Nginx/Caddy) so rate-limiting uses the real client IP
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://www.googletagmanager.com", "https://www.google-analytics.com"],
      connectSrc: ["'self'", "https://www.google-analytics.com", "https://analytics.google.com", "https://www.googletagmanager.com", "https://region1.google-analytics.com"],
    }
  } : false,
  crossOriginEmbedderPolicy: false,
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,
  xssFilter: true,
}));

// Protect against HTTP Parameter Pollution attacks
app.use(hpp());

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.APP_URL, 'https://budget.vidalpablo.com'].filter(Boolean)
    : true,
  credentials: true
}));

app.use(express.json({ limit: '10kb' })); // Prevent huge payloads

// Rate limiters
// 1. Global Limiter: basic defense against volumetric scraping
const globalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 500, // Limit each IP to 500 requests per 10 mins
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

// 2. Auth Limiters: prevent brute force & account enumeration
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts max for anything hitting /api/auth in general
  message: { error: 'Too many auth attempts. Please try again later.' },
  validate: { xForwardedForHeader: false }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Max 10 login attempts per 15 min
  message: { error: 'Too many login attempts. Please try again later.' },
  validate: { xForwardedForHeader: false }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Max 5 account registrations per hour per IP
  message: { error: 'Too many accounts created from this IP. Please try again later.' },
  validate: { xForwardedForHeader: false }
});

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 password reset requests per hour per IP
  message: { error: 'Too many password reset requests. Please try again later.' },
  validate: { xForwardedForHeader: false }
});

const codeRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Max 3 code requests per 15 min per IP
  message: { error: 'Too many code requests. Please try again later.' },
  validate: { xForwardedForHeader: false }
});

const codeVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 code verification attempts per 15 min per IP
  message: { error: 'Too many verification attempts. Please try again later.' },
  validate: { xForwardedForHeader: false }
});

// 3. Webhook Limiter
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { error: 'Too many webhook requests.' },
  validate: { xForwardedForHeader: false }
});

// Apply global limiter to all routes
app.use(globalLimiter);

// API Routes
// Apply specific strict limiters to sensitive auth paths BEFORE general auth router
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/forgot-password', resetLimiter);
app.use('/api/auth/reset-password', resetLimiter);
app.use('/api/auth/request-code', codeRequestLimiter);
app.use('/api/auth/verify-code', codeVerifyLimiter);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/webhook', webhookLimiter, webhookRoutes);
app.use('/api/admin/webhooks', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/partner', partnerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/ignored-patterns', ignoredPatternsRoutes);

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
  startResetScheduler();
  startCronScheduler();
});
