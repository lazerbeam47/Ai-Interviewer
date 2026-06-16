import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const interviews = await prisma.interview.findMany()

  console.log(interviews)
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })