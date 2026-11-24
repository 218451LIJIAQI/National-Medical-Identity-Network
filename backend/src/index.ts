import express from 'express';
import cors from 'cors';
import { CONFIG, HOSPITALS } from './config';
import { initializeHospitals } from './database/central-multi';
import authRoutes from './routes/auth';
import centralRoutes from './routes/central';
import hospitalRoutes from './routes/hospital';

type BodyParserError = Error & {
  status?: number;
  statusCode?: number;
  type?: string;
  body?: unknown;
};

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: CONFIG.isProduction ? CONFIG.cors.origins : true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  if (process.env.NODE_ENV !== 'test') {
    app.use((req, _res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
  }

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

  app.use((err: BodyParserError, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err?.status ?? err?.statusCode;
    if (err?.type === 'entity.too.large' || status === 413) {
      res.status(413).json({
        success: false,
        error: 'Request payload exceeds maximum allowed size (1MB)',
      });
      return;
    }

    if (err instanceof SyntaxError && (status === 400 || 'body' in err)) {
      res.status(400).json({
        success: false,
        error: 'Malformed JSON in request body',
      });
      return;
    }

    if (process.env.NODE_ENV !== 'test') {
      console.error('Unhandled error:', err);
    }
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

export const app = createApp();

if (require.main === module) {
  console.log('Initializing hospitals registry...');
  initializeHospitals().catch(err => {
    console.error('Failed to initialize hospitals registry:', err);
  });

  const PORT = process.env.PORT || CONFIG.centralHub.port;

  app.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                                                               ║');
    console.log('║   🏥 MedLink MY - National Medical Identity Network          ║');
    console.log('║                                                               ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║   Central Hub API running on port ${PORT}                       ║`);
    console.log('║                                                               ║');
    console.log('║   Endpoints:                                                  ║');
    console.log('║   • POST /api/auth/login            - User authentication    ║');
    console.log('║   • POST /api/auth/verify-hospital  - Hospital 2FA verify    ║');
    console.log('║   • POST /api/auth/switch-role      - Multi-role switch      ║');
    console.log('║   • GET  /api/central/hospitals     - List all hospitals     ║');
    console.log('║   • GET  /api/central/query/:ic     - Cross-hospital query   ║');
    console.log('║   • GET  /api/hospitals/:id         - Hospital information   ║');
    console.log('║                                                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Registered hospitals:');
    HOSPITALS.forEach((h, i) => {
      console.log(`  ${i + 1}. ${h.name} (${h.city})`);
    });
    console.log('');
  });
}
