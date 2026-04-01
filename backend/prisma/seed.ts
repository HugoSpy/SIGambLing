import { PrismaClient, EventCategory, EventStatus, UserRole } from "@prisma/client";

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
      description: "Pari de lancement pour tester le dashboard et le système de mise.",
      category: EventCategory.epita,
      status: EventStatus.active,
      options: [
        { id: "option_1", label: "Les grinders du matin", total_bets: 0, odds: 1.85 },
        { id: "option_2", label: "Les night owls", total_bets: 0, odds: 2.1 },
      ],
      resolutionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Finale Champions League 2026",
      description: "Événement sport démo pour vérifier les catégories et l’affichage des cotes.",
      category: EventCategory.sports,
      status: EventStatus.active,
      options: [
        { id: "option_1", label: "Équipe A", total_bets: 0, odds: 1.92 },
        { id: "option_2", label: "Équipe B", total_bets: 0, odds: 1.98 },
      ],
      resolutionDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Quel projet de promo fera le plus parler cette semaine ?",
      description: "Événement en attente pour tester le workflow admin.",
      category: EventCategory.culture,
      status: EventStatus.pending,
      options: [
        { id: "option_1", label: "Projet IA", total_bets: 0, odds: 2.4 },
        { id: "option_2", label: "Projet Web", total_bets: 0, odds: 1.65 },
        { id: "option_3", label: "Projet Sécu", total_bets: 0, odds: 2.9 },
      ],
      resolutionDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const event of events) {
    await prisma.event.upsert({
      where: { title: event.title },
      update: {
        description: event.description,
        category: event.category,
        status: event.status,
        options: event.options,
        creatorId: admin.id,
        validatorId: event.status === EventStatus.active ? admin.id : null,
        validatedAt: event.status === EventStatus.active ? new Date() : null,
        resolutionDate: event.resolutionDate,
      },
      create: {
        title: event.title,
        description: event.description,
        category: event.category,
        status: event.status,
        options: event.options,
        creatorId: admin.id,
        validatorId: event.status === EventStatus.active ? admin.id : null,
        validatedAt: event.status === EventStatus.active ? new Date() : null,
        resolutionDate: event.resolutionDate,
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
