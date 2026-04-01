import { EventCategory, EventStatus, PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@epita.fr" },
    update: {
      pseudo: "HouseMaster",
      role: UserRole.admin,
      balance: 5000,
    },
    create: {
      email: "admin@epita.fr",
      pseudo: "HouseMaster",
      role: UserRole.admin,
      balance: 5000,
      microsoftId: "seed-admin",
    },
  });

  const events = [
    {
      title: "Qui finira top 1 du mini leaderboard cette semaine ?",
      description: "Pari de lancement pour tester le dashboard et le systeme de mise.",
      category: EventCategory.epita,
      status: EventStatus.OPEN,
      options: ["Les grinders du matin", "Les night owls"],
      closingAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      minBet: 10,
    },
    {
      title: "Finale Champions League 2026",
      description: "Evenement sport demo pour verifier les categories et l'affichage des cotes.",
      category: EventCategory.sports,
      status: EventStatus.OPEN,
      options: ["Equipe A", "Equipe B"],
      closingAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      minBet: 20,
    },
    {
      title: "Quel projet de promo fera le plus parler cette semaine ?",
      description: "Evenement clos en attente de resolution pour tester le workflow admin.",
      category: EventCategory.culture,
      status: EventStatus.CLOSED,
      options: ["Projet IA", "Projet Web", "Projet Secu"],
      closingAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      minBet: 10,
    },
  ];

  for (const event of events) {
    const poolByOption = event.options.reduce<Record<string, number>>((accumulator, option) => {
      accumulator[option] = 0;
      return accumulator;
    }, {});

    await prisma.event.upsert({
      where: { title: event.title },
      update: {
        description: event.description,
        category: event.category,
        status: event.status,
        options: event.options,
        poolByOption,
        totalPool: 0,
        closingAt: event.closingAt,
        minBet: event.minBet,
        maxBet: null,
        createdById: admin.id,
      },
      create: {
        title: event.title,
        description: event.description,
        category: event.category,
        status: event.status,
        options: event.options,
        poolByOption,
        totalPool: 0,
        closingAt: event.closingAt,
        minBet: event.minBet,
        maxBet: null,
        createdById: admin.id,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
