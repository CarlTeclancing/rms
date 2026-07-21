import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import expensesRoutes from './routes/expenses.routes.js';
import menuRoutes from './routes/menu.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import publicRoutes from './routes/public.routes.js';
import promotionsRoutes from './routes/promotions.routes.js';
import salesRoutes from './routes/sales.routes.js';
import stockRoutes from './routes/stock.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import usersRoutes from './routes/users.routes.js';
import { openApiSpec } from './docs/openapi.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export const app = express();
const allowedOrigins = env.frontendUrl.split(',').map((origin) => origin.trim()).filter(Boolean);
const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  try {
    const hostname = new URL(origin).hostname;
    return hostname === 'app.chopasap.com' || hostname === 'www.app.chopasap.com' || hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
};

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'restaurant-system-api' }));
app.get('/api', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'restaurant-system-api',
    docs: '/api-docs',
    health: '/health',
    publicMenu: '/api/public/menu'
  });
});
app.get('/api-docs.json', (_req, res) => res.json(openApiSpec));
app.get('/api-docs', (_req, res) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:; font-src 'self' https://cdn.jsdelivr.net data:; connect-src 'self'"
  );
  res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Restaurant Management System API Docs</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/api-docs.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        persistAuthorization: true
      });
    </script>
  </body>
</html>`);
});

app.use('/api/auth', authRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', publicRoutes);
app.use('/api', promotionsRoutes);
app.use('/api', menuRoutes);
app.use('/api', stockRoutes);
app.use('/api', salesRoutes);
app.use('/api', expensesRoutes);
app.use('/api', reportsRoutes);
app.use('/api', usersRoutes);
app.use('/api', uploadRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
