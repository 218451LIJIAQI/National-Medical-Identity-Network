import { execSync } from 'child_process';
import { HOSPITALS } from '../src/config';

function main(): void {
  console.log('Pushing hospital Prisma schema to configured hospital databases...');

  for (const hospital of HOSPITALS) {
    const dbUrl = process.env[hospital.envVar];
    if (!dbUrl) {
      console.log(`Skipping ${hospital.id}: ${hospital.envVar} is not set`);
      continue;
    }

    console.log(`Pushing schema to ${hospital.id}...`);
    execSync(
      'npx prisma db push --schema=prisma/schema.hospital.prisma --skip-generate --accept-data-loss',
      {
        env: { ...process.env, DATABASE_URL_HOSPITAL: dbUrl },
        stdio: 'inherit',
      }
    );
  }

  console.log('Hospital schema push complete.');
}

try {
  main();
} catch (error) {
  console.error('Failed to push hospital schemas:', error);
  process.exit(1);
}
