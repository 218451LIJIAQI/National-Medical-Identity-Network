import express from 'express';
import cors from 'cors';
import { CONFIG } from './config';
import authRoutes from './routes/auth';
import centralRoutes from './routes/central';
import hospitalRoutes from './routes/hospital';

export function createApp(): express.Express {
  const app = express();

  app.use(
    cors({
      origin: CONFIG.isProduction ? CONFIG.cors.origins : true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.use((req, _res, next) => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    }
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'MedLink Central Hub',
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/central', centralRoutes);
  app.use('/api/hospitals', hospitalRoutes);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  });

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
    });
  });

  return app;
}
