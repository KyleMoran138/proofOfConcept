import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// A `main` function so that you can use async/await
async function main() {
  // ... you will write your Prisma Client queries here

  const newUser = await prisma.user.create({
    data: {
      email: 'test@test.com',
      name: 'Test',
      
    },
  });


  const allusers = await prisma.user.findMany({
    include: { },
  });
  console.log(JSON.stringify(allusers));
}

main()
  .catch(e => {
    throw e
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
