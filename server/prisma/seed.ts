import { getPrisma } from "../src/prisma.js";

// The four categories the stakeholder asked for, in display order.
const CATEGORY_NAMES = ["Account and Access", "Hardware", "Software", "Network"];

async function main() {
  const prisma = getPrisma();

  for (const name of CATEGORY_NAMES) {
    // upsert = "insert it, or do nothing if a row with this name already exists".
    // Combined with @unique on name, this makes the seed idempotent: running it
    // ten times still leaves exactly four rows.
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log(`Seeded ${CATEGORY_NAMES.length} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
