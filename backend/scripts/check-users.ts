import { PrismaClient } from '../node_modules/.prisma/client/central';

const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://postgres:218451@localhost:5432/medlink_central' }
  }
});

async function main() {
  // 查找双身份用户
  const users = await prisma.user.findMany({
    where: { icNumber: '750101-14-5001' }
  });
  
  console.log('Users with IC 750101-14-5001:');
  console.log(JSON.stringify(users, null, 2));
  
  // 查找所有 patient 角色
  const patients = await prisma.user.findMany({
    where: { role: 'patient' }
  });
  
  console.log('\nAll patient users:');
  console.log(JSON.stringify(patients, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
