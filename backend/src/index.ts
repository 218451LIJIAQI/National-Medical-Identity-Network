import express from 'express';
import cors from 'cors';
import { CONFIG, HOSPITALS } from './config';
import { initializeHospitals } from './database/central';
import authRoutes from './routes/auth';
import centralRoutes from './routes/central';
import hospitalRoutes from './routes/hospital';

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: CONFIG.isProduction 
    ? CONFIG.cors.origins 
    : true, // Allow all origins in development
  credentials: true,
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'MedLink Central Hub',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/central', centralRoutes);
app.use('/api/hospitals', hospitalRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Initialize database
console.log('Initializing hospitals registry...');
initializeHospitals();

// Start server
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
  console.log('║   • POST /api/auth/login         - User authentication       ║');
  console.log('║   • GET  /api/central/hospitals  - List all hospitals        ║');
  console.log('║   • GET  /api/central/query/:ic  - Cross-hospital query      ║');
  console.log('║   • GET  /api/hospitals/:id      - Hospital information      ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Registered hospitals:');
  HOSPITALS.forEach((h, i) => {
    console.log(`  ${i + 1}. ${h.name} (${h.city})`);
  });
  console.log('');
});

export default app;
