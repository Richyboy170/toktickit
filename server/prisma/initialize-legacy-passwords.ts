import { hashPassword, passwordValidationMessage } from "../src/auth.js";
import { getPrisma } from "../src/prisma.js";

const initialPassword = process.env.LAB3_MIGRATION_INITIAL_PASSWORD;
if (!initialPassword) {
  throw new Error("LAB3_MIGRATION_INITIAL_PASSWORD is required to initialize migrated accounts.");
}

const validationError = passwordValidationMessage(initialPassword);
if (validationError) throw new Error(`LAB3_MIGRATION_INITIAL_PASSWORD is invalid: ${validationError}`);

const prisma = getPrisma();
try {
  const result = await prisma.user.updateMany({
    where: { passwordHash: "" },
    data: { passwordHash: await hashPassword(initialPassword), mustChangePassword: true },
  });
  console.log(`Initialized ${result.count} migrated account(s); each must change the local initial password at first login.`);
} finally {
  await prisma.$disconnect();
}
