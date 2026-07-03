import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import expensesRoutes from './routes/expenses.routes.js';
import menuRoutes from './routes/menu.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import publicRoutes from './routes/public.routes.js';
import salesRoutes from './routes/sales.routes.js';
import stockRoutes from './routes/stock.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import usersRoutes from './routes/users.routes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'restaurant-system-api' }));

app.use('/api/auth', authRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', publicRoutes);
app.use('/api', menuRoutes);
app.use('/api', stockRoutes);
app.use('/api', salesRoutes);
app.use('/api', expensesRoutes);
app.use('/api', reportsRoutes);
app.use('/api', usersRoutes);
app.use('/api', uploadRoutes);

app.use(notFound);
app.use(errorHandler);
