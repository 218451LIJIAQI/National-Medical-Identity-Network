import { execSync } from 'child_process';
import { HOSPITALS } from '../src/config';

async function main() {
  console.log('🏥 Pushing hospital schema to all hospital databases...\n');
  let failedCount = 0;

  for (const hospital of HOSPITALS) {
    const dbUrl = process.env[hospital.envVar]?.trim();

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
      failedCount++;
      console.error(`❌ Failed to push schema to ${hospital.id}:`, error);
    }
  }

  if (failedCount > 0) {
    console.error(`❌ Failed to push schema to ${failedCount} hospital database(s).`);
    process.exit(1);
  }

  console.log('🎉 All hospital schemas pushed!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
