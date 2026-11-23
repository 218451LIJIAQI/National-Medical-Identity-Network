import { CONFIG, HOSPITALS } from './config';
import { initializeHospitals } from './database/central-db';
import { disconnectAllDbs } from './database/db-manager';
import { createApp } from './app';

async function bootstrap(): Promise<void> {
  const app = createApp();

  try {
    await initializeHospitals();
  } catch (error) {
    console.warn('Warning: Could not synchronize hospitals registry at startup:', error);
  }

  const server = app.listen(CONFIG.centralHub.port, () => {
    console.log(`MedLink MY Central Hub listening on port ${CONFIG.centralHub.port}`);
    HOSPITALS.forEach((hospital, index) => {
      console.log(`  ${index + 1}. ${hospital.name} (${hospital.city})`);
    });
  });

  const shutdown = async () => {
    server.close();
    await disconnectAllDbs();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((error) => {
  console.error('Fatal startup error:', error);
  process.exit(1);
});
