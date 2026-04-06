import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true } });

  for (const user of users) {
    const agg = await prisma.jackpotContribution.aggregate({
      where: { userId: user.id },
      _sum: { contributionAmount: true },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { jackpotContributionTotal: agg._sum.contributionAmount ?? 0 },
    });

    console.log(`Backfilled user ${user.id}: ${agg._sum.contributionAmount ?? 0}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
