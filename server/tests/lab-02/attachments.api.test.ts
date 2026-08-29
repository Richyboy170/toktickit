import { randomBytes, randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { MAX_ATTACHMENT_BYTES } from "../../src/attachment-validation.js";
import { getPrisma } from "../../src/prisma.js";

let requesterA: number;
let requesterB: number;
let ticketId: number;
let categoryId: number;
let relatedSystemId: number;
const pdf = Buffer.from("%PDF-1.7\nattachment evidence");

function postFile(name = "evidence.pdf", bytes = pdf, type = "application/pdf") {
  return request(app).post(`/api/tickets/${ticketId}/attachments`).set("X-Development-Requester-Id", String(requesterA)).attach("file", bytes, { filename: name, contentType: type });
}

beforeAll(async () => {
  const suffix = randomBytes(5).toString("hex");
  const [a, b, category, system] = await Promise.all([
    getPrisma().developmentRequester.create({ data: { name: "Attachment Test A", email: `attachment-a-${suffix}@example.test` } }),
    getPrisma().developmentRequester.create({ data: { name: "Attachment Test B", email: `attachment-b-${suffix}@example.test` } }),
    getPrisma().category.findFirstOrThrow({ where: { isActive: true } }),
    getPrisma().relatedSystem.findFirstOrThrow({ where: { isActive: true } }),
  ]);
  requesterA = a.id; requesterB = b.id; categoryId = category.id; relatedSystemId = system.id;
});

beforeEach(async () => {
  const ticket = await getPrisma().ticket.create({ data: { ticketNumber: `TKT-20260820-${randomBytes(4).toString("hex").toUpperCase()}`, requesterId: requesterA, categoryId, relatedSystemId, summary: "Attachment lifecycle ticket", description: "This Ticket verifies every Attachment lifecycle operation.", requestedPriority: "HIGH", submissionToken: randomUUID() } });
  ticketId = ticket.id;
});

afterEach(async () => getPrisma().ticket.deleteMany({ where: { requesterId: { in: [requesterA, requesterB] } } }));
afterAll(async () => {
  await getPrisma().developmentRequester.deleteMany({ where: { id: { in: [requesterA, requesterB] } } });
  await getPrisma().$disconnect();
});

describe("Attachment API", () => {
  it("uploads, lists, and downloads an owned valid file without exposing bytes in metadata", async () => {
    const uploaded = await postFile("folder\\evidence.pdf");
    expect(uploaded.status).toBe(201);
    expect(uploaded.body.attachment).toMatchObject({ originalName: "evidence.pdf", mimeType: "application/pdf", sizeBytes: pdf.length, available: true });
    expect(uploaded.body.attachment).not.toHaveProperty("content");

    const listed = await request(app).get(`/api/tickets/${ticketId}/attachments`).set("X-Development-Requester-Id", String(requesterA));
    expect(listed.body).toEqual([uploaded.body.attachment]);

    const downloaded = await request(app).get(`/api/attachments/${uploaded.body.attachment.id}/download`).set("X-Development-Requester-Id", String(requesterA)).buffer(true).parse((response, callback) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      response.on("end", () => callback(null, Buffer.concat(chunks)));
    });
    expect(downloaded.status).toBe(200);
    expect(downloaded.headers["content-type"]).toContain("application/pdf");
    expect(downloaded.headers["x-content-type-options"]).toBe("nosniff");
    expect(downloaded.headers["content-disposition"]).toContain("evidence.pdf");
    expect(downloaded.body).toEqual(pdf);
  });

  it("rejects missing, spoofed, and oversized files without saving rows", async () => {
    const missing = await request(app).post(`/api/tickets/${ticketId}/attachments`).set("X-Development-Requester-Id", String(requesterA));
    const spoofed = await postFile("fake.png", pdf, "image/png");
    const oversized = await postFile("large.pdf", Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(MAX_ATTACHMENT_BYTES)]));
    expect(missing.status).toBe(400);
    expect(spoofed.status).toBe(415);
    expect(oversized.status).toBe(413);
    expect(await getPrisma().attachment.count({ where: { ticketId } })).toBe(0);
  });

  it("uses a transaction lock so six concurrent uploads create only five active files", async () => {
    const results = await Promise.all(Array.from({ length: 6 }, (_, index) => postFile(`evidence-${index}.pdf`)));
    expect(results.filter((result) => result.status === 201)).toHaveLength(5);
    expect(results.filter((result) => result.status === 409 && result.body.error.code === "ATTACHMENT_LIMIT_REACHED")).toHaveLength(1);
    expect(await getPrisma().attachment.count({ where: { ticketId, removedAt: null } })).toBe(5);
  });

  it("soft-removes with a reason, retains metadata, and blocks repeat removal and download", async () => {
    const uploaded = await postFile();
    const id = uploaded.body.attachment.id;
    const invalid = await request(app).delete(`/api/attachments/${id}`).set("X-Development-Requester-Id", String(requesterA)).send({ reason: " " });
    expect(invalid.status).toBe(400);

    const removed = await request(app).delete(`/api/attachments/${id}`).set("X-Development-Requester-Id", String(requesterA)).send({ reason: "Outdated screenshot" });
    expect(removed.status).toBe(200);
    expect(removed.body.attachment).toMatchObject({ id, available: false, removalReason: "Outdated screenshot", removedByRequesterId: requesterA });
    const download = await request(app).get(`/api/attachments/${id}/download`).set("X-Development-Requester-Id", String(requesterA));
    expect(download.status).toBe(410);
    const repeat = await request(app).delete(`/api/attachments/${id}`).set("X-Development-Requester-Id", String(requesterA)).send({ reason: "Again" });
    expect(repeat.status).toBe(409);
  });

  it("returns 404 for every cross-requester Attachment operation and does not mutate data", async () => {
    const uploaded = await postFile();
    const id = uploaded.body.attachment.id;
    const crossList = await request(app).get(`/api/tickets/${ticketId}/attachments`).set("X-Development-Requester-Id", String(requesterB));
    const crossUpload = await request(app).post(`/api/tickets/${ticketId}/attachments`).set("X-Development-Requester-Id", String(requesterB)).attach("file", pdf, { filename: "other.pdf", contentType: "application/pdf" });
    const crossDownload = await request(app).get(`/api/attachments/${id}/download`).set("X-Development-Requester-Id", String(requesterB));
    const crossDelete = await request(app).delete(`/api/attachments/${id}`).set("X-Development-Requester-Id", String(requesterB)).send({ reason: "Not mine" });
    expect([crossList.status, crossUpload.status, crossDownload.status, crossDelete.status]).toEqual([404, 404, 404, 404]);
    expect(await getPrisma().attachment.findUniqueOrThrow({ where: { id }, select: { removedAt: true } })).toEqual({ removedAt: null });
  });
});
