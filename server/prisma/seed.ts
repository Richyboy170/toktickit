import { getPrisma } from "../src/prisma.js";

const CATEGORY_NAMES = ["Account and Access", "Hardware", "Software", "Network"];
const RELATED_SYSTEM_NAMES = [
  "Campus Wi-Fi",
  "Corporate Laptop",
  "Email",
  "Grade Submission App",
  "LEB2 App",
  "Printer",
  "VPN",
];

const REQUESTERS = [
  { name: "Ananda Kittisak", email: "ananda.k@example.edu", isActive: true },
  { name: "Chayanee Rattanakul", email: "chayanee.r@example.edu", isActive: true },
  { name: "Narin Wongchai", email: "narin.w@example.edu", isActive: true },
  { name: "Pimchanok Srisawat", email: "pimchanok.s@example.edu", isActive: true },
  { name: "Somchai Archive", email: "somchai.archive@example.edu", isActive: false },
];

async function main() {
  const prisma = getPrisma();

  for (const name of CATEGORY_NAMES) {
    await prisma.category.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }

  for (const name of RELATED_SYSTEM_NAMES) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }

  for (const requester of REQUESTERS) {
    await prisma.developmentRequester.upsert({
      where: { email: requester.email },
      update: { name: requester.name, isActive: requester.isActive },
      create: requester,
    });
  }

  console.log(
    `Seeded ${CATEGORY_NAMES.length} categories, ${RELATED_SYSTEM_NAMES.length} related systems, and ${REQUESTERS.length} Development Requesters.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
