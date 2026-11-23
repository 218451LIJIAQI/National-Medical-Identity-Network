import { execSync } from 'child_process';
import { HOSPITALS } from '../src/config';

async function main() {
  console.log('🏥 Pushing hospital schema to all hospital databases...\n');

  for (const hospital of HOSPITALS) {
    const dbUrl = process.env[hospital.envVar];

    if (!dbUrl) {
      console.log(`⚠️  Skipping ${hospital.id}: ${hospital.envVar} not set`);
      continue;
    }

    console.log(`📦 Pushing schema to ${hospital.id}...`);

    try {
      execSync(
        'npx prisma db push --schema=prisma/schema.hospital.prisma --skip-generate --accept-data-loss',
        {
          env: {
            ...process.env,
            DATABASE_URL_HOSPITAL: dbUrl,
          },
          stdio: 'inherit',
        }
      );
      console.log(`✅ ${hospital.id} schema pushed successfully!\n`);
    } catch (error) {
      console.error(`❌ Failed to push schema to ${hospital.id}:`, error);
    }
  }

  console.log('🎉 All hospital schemas pushed!');
}

main().catch(console.error);
