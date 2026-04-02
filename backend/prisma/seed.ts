import {
  EventCategory,
  EventStatus,
  ProposalStatus,
  PrismaClient,
  UserRole,
} from "@prisma/client";

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

  const student = await prisma.user.upsert({
    where: { email: "student@epita.fr" },
    update: {
      pseudo: "SigmaStudent",
      role: UserRole.user,
      balance: 2400,
    },
    create: {
      email: "student@epita.fr",
      pseudo: "SigmaStudent",
      role: UserRole.user,
      balance: 2400,
      microsoftId: "seed-student",
    },
  });

  const events = [
    {
      title: "Qui finira top 1 du mini leaderboard cette semaine ?",
      description: "Pari de lancement pour tester le dashboard et le systeme de mise.",
      category: EventCategory.epita,
      status: EventStatus.OPEN,
      options: [
        { label: "Les grinders du matin", initial_odds: 1.72, current_odds: 1.72, total_staked: 0, is_winning: null },
        { label: "Les night owls", initial_odds: 2.18, current_odds: 2.18, total_staked: 0, is_winning: null },
      ],
      closingAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      minBet: 10,
    },
    {
      title: "Finale Champions League 2026",
      description: "Evenement sport demo pour verifier les categories et l'affichage des cotes.",
      category: EventCategory.sports,
      status: EventStatus.OPEN,
      options: [
        { label: "Equipe A", initial_odds: 1.88, current_odds: 1.88, total_staked: 0, is_winning: null },
        { label: "Equipe B", initial_odds: 1.98, current_odds: 1.98, total_staked: 0, is_winning: null },
      ],
      closingAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      minBet: 20,
    },
    {
      title: "Quel projet de promo fera le plus parler cette semaine ?",
      description: "Evenement clos en attente de resolution pour tester le workflow admin.",
      category: EventCategory.culture,
      status: EventStatus.CLOSED,
      options: [
        { label: "Projet IA", initial_odds: 2.35, current_odds: 2.35, total_staked: 0, is_winning: null },
        { label: "Projet Web", initial_odds: 2.75, current_odds: 2.75, total_staked: 0, is_winning: null },
        { label: "Projet Secu", initial_odds: 3.1, current_odds: 3.1, total_staked: 0, is_winning: null },
      ],
      closingAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      minBet: 10,
    },
  ];

  for (const event of events) {
    const poolByOption = event.options.reduce<Record<string, number>>((accumulator, option) => {
      accumulator[option.label] = option.total_staked;
      return accumulator;
    }, {});

    const seededEvent = await prisma.event.upsert({
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

    await prisma.oddsHistory.deleteMany({
      where: { eventId: seededEvent.id },
    });

    await prisma.oddsHistory.createMany({
      data: event.options.map((option) => ({
        eventId: seededEvent.id,
        option: option.label,
        odds: option.current_odds,
        totalStaked: option.total_staked,
      })),
    });
  }

  await prisma.eventProposal.upsert({
    where: { id: "3c2b8a60-f3d2-4e1b-93e2-0d2f4a5d1001" },
    update: {
      title: "Resultat partiel ALGO > 15/20 ?",
      description: "Je pense que la moyenne sera surprenamment haute cette annee.",
      category: EventCategory.epita,
      suggestedDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      status: ProposalStatus.PENDING,
      reviewedById: null,
      reviewedAt: null,
      rejectionReason: null,
      userId: student.id,
    },
    create: {
      id: "3c2b8a60-f3d2-4e1b-93e2-0d2f4a5d1001",
      userId: student.id,
      title: "Resultat partiel ALGO > 15/20 ?",
      description: "Je pense que la moyenne sera surprenamment haute cette annee.",
      category: EventCategory.epita,
      suggestedDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      status: ProposalStatus.PENDING,
    },
  });
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
