import { randomUUID } from "node:crypto";
import { hashPassword } from "../src/auth.js";
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

// These credentials are intentionally local-lab fixtures. They are not
// production secrets and should be changed outside the development database.
const REQUESTERS = [
  { name: "Ananda Kittisak", email: "ananda.k@example.edu", isActive: true, password: "Requester123!" },
  { name: "Chayanee Rattanakul", email: "chayanee.r@example.edu", isActive: true, password: "Requester123!" },
  { name: "Narin Wongchai", email: "narin.w@example.edu", isActive: true, password: "Requester123!" },
  { name: "Pimchanok Srisawat", email: "pimchanok.s@example.edu", isActive: true, password: "Requester123!" },
  { name: "Somchai Archive", email: "somchai.archive@example.edu", isActive: false, password: "Requester123!" },
].map((user) => ({ ...user, role: "REQUESTER" as const }));

const STAFF = [
  { name: "Krit Staff", email: "krit.staff@example.edu", isActive: true, password: "StaffLocal123!" },
  { name: "Mali Staff", email: "mali.staff@example.edu", isActive: true, password: "StaffLocal123!" },
  { name: "Nok Staff", email: "nok.staff@example.edu", isActive: true, password: "StaffLocal123!" },
  { name: "Archive Staff", email: "archive.staff@example.edu", isActive: false, password: "StaffLocal123!" },
].map((user) => ({ ...user, role: "IT_STAFF" as const }));

const ADMINISTRATORS = [
  { name: "TokTickIT Administrator", email: "admin@example.edu", isActive: true, password: "AdminLocal123!", role: "ADMINISTRATOR" as const },
];

async function upsertAccount(account: { name: string; email: string; isActive: boolean; password: string; role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR" }) {
  const passwordHash = await hashPassword(account.password);
  return getPrisma().user.upsert({
    where: { email: account.email },
    update: {
      name: account.name,
      role: account.role,
      isActive: account.isActive,
      passwordHash,
      mustChangePassword: false,
    },
    create: {
      name: account.name,
      email: account.email,
      role: account.role,
      isActive: account.isActive,
      passwordHash,
      mustChangePassword: false,
    },
  });
}

async function main() {
  const prisma = getPrisma();
  for (const name of CATEGORY_NAMES) {
    await prisma.category.upsert({ where: { name }, update: { isActive: true }, create: { name, isActive: true } });
  }
  for (const name of RELATED_SYSTEM_NAMES) {
    await prisma.relatedSystem.upsert({ where: { name }, update: { isActive: true }, create: { name, isActive: true } });
  }

  const accounts = await Promise.all([...REQUESTERS, ...STAFF, ...ADMINISTRATORS].map(upsertAccount));
  const requesterByEmail = new Map(accounts.filter((user) => user.role === "REQUESTER").map((user) => [user.email, user]));
  const staffByEmail = new Map(accounts.filter((user) => user.role === "IT_STAFF").map((user) => [user.email, user]));
  const administrator = accounts.find((user) => user.role === "ADMINISTRATOR")!;
  const category = await prisma.category.findUniqueOrThrow({ where: { name: "Hardware" } });
  const system = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "Corporate Laptop" } });
  const requester = requesterByEmail.get("ananda.k@example.edu")!;
  const requesterB = requesterByEmail.get("chayanee.r@example.edu")!;
  const requesterC = requesterByEmail.get("narin.w@example.edu")!;
  const requesterD = requesterByEmail.get("pimchanok.s@example.edu")!;
  const staff = staffByEmail.get("krit.staff@example.edu")!;
  const staffB = staffByEmail.get("mali.staff@example.edu")!;
  const staffC = staffByEmail.get("nok.staff@example.edu")!;

  const seededTickets = [
    { number: "TKT-20260915-A1B2C3D4", requesterId: requester.id, categoryId: category.id, relatedSystemId: system.id, summary: "Laptop battery drains quickly", description: "The development laptop loses power in under an hour.", requestedPriority: "HIGH" as const, itPriority: "URGENT" as const, currentStatus: "IN_PROGRESS" as const, ownerId: staff.id },
    { number: "TKT-20260915-E5F6A7B8", requesterId: requester.id, categoryId: category.id, relatedSystemId: system.id, summary: "Docking station display issue", description: "The external display is not detected after reconnecting the dock.", requestedPriority: "MEDIUM" as const, itPriority: "MEDIUM" as const, currentStatus: "NEW" as const, ownerId: null },
    { number: "TKT-20260915-C3D4E5F6", requesterId: requesterB.id, categoryId: category.id, relatedSystemId: system.id, summary: "VPN access needs review", description: "The VPN connection drops when the laptop changes networks.", requestedPriority: "URGENT" as const, itPriority: "HIGH" as const, currentStatus: "OPEN" as const, ownerId: staffB.id },
    { number: "TKT-20260915-F6A7B8C9", requesterId: requesterB.id, categoryId: category.id, relatedSystemId: system.id, summary: "Shared printer waits in queue", description: "Print jobs remain queued after the printer reports ready.", requestedPriority: "LOW" as const, itPriority: "LOW" as const, currentStatus: "WAITING_FOR_REQUESTER" as const, ownerId: staffC.id },
    { number: "TKT-20260915-D4E5F6A7", requesterId: requesterC.id, categoryId: category.id, relatedSystemId: system.id, summary: "Email attachment cannot open", description: "A valid course attachment produces an error when opened.", requestedPriority: "HIGH" as const, itPriority: "URGENT" as const, currentStatus: "RESOLVED" as const, ownerId: staff.id },
    { number: "TKT-20260915-A7B8C9D0", requesterId: requesterC.id, categoryId: category.id, relatedSystemId: system.id, summary: "Account access restored", description: "The account is working after the identity verification check.", requestedPriority: "MEDIUM" as const, itPriority: "MEDIUM" as const, currentStatus: "CLOSED" as const, ownerId: administrator.id },
    { number: "TKT-20260915-B8C9D0E1", requesterId: requesterD.id, categoryId: category.id, relatedSystemId: system.id, summary: "Grade application reopened", description: "The grade submission application still shows an old validation message.", requestedPriority: "URGENT" as const, itPriority: "URGENT" as const, currentStatus: "REOPENED" as const, ownerId: staffB.id },
    { number: "TKT-20260915-C9D0E1F2", requesterId: requesterD.id, categoryId: category.id, relatedSystemId: system.id, summary: "Duplicate software request", description: "This duplicate request was cancelled after the original was confirmed.", requestedPriority: "LOW" as const, itPriority: "LOW" as const, currentStatus: "CANCELLED" as const, ownerId: null },
  ];
  for (const item of seededTickets) {
    const ticket = await prisma.ticket.upsert({
      where: { ticketNumber: item.number },
      update: { requesterId: item.requesterId, categoryId: item.categoryId, relatedSystemId: item.relatedSystemId, summary: item.summary, description: item.description, requestedPriority: item.requestedPriority, itPriority: item.itPriority, currentStatus: item.currentStatus, ownerId: item.ownerId },
      create: { ticketNumber: item.number, requesterId: item.requesterId, categoryId: item.categoryId, relatedSystemId: item.relatedSystemId, summary: item.summary, description: item.description, requestedPriority: item.requestedPriority, itPriority: item.itPriority, currentStatus: item.currentStatus, ownerId: item.ownerId, submissionToken: randomUUID() },
    });
    if (await prisma.publicComment.count({ where: { ticketId: ticket.id } }) === 0) {
      await prisma.publicComment.create({ data: { ticketId: ticket.id, authorId: item.requesterId, content: "Thanks for looking into this issue." } });
    }
    if (await prisma.internalNote.count({ where: { ticketId: ticket.id } }) === 0) {
      await prisma.internalNote.create({ data: { ticketId: ticket.id, authorId: staff.id, content: "Initial triage completed for local development data." } });
    }
  }

  console.log(`Seeded ${CATEGORY_NAMES.length} categories, ${RELATED_SYSTEM_NAMES.length} related systems, ${REQUESTERS.length} Requesters, ${STAFF.length} IT Staff accounts, and ${ADMINISTRATORS.length} Administrator account.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
