import { expect, Page, Route, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

type UserRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

const artifacts = resolve(import.meta.dirname, "../../artifacts/lab-03/screenshots");
const lab4Artifacts = resolve(import.meta.dirname, "../../artifacts/lab-04/screenshots");
const viewports = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "tablet", width: 820, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
] as const;

const users = {
  first: { id: 101, name: "Ananda Kittisak", email: "first.requester@example.edu", role: "REQUESTER" as const, isActive: true, mustChangePassword: true },
  requester: { id: 102, name: "Chayanee Rattanakul", email: "chayanee.r@example.edu", role: "REQUESTER" as const, isActive: true, mustChangePassword: false },
  staff: { id: 201, name: "Krit Chantarat", email: "krit.staff@example.edu", role: "IT_STAFF" as const, isActive: true, mustChangePassword: false },
  admin: { id: 301, name: "Narin Sutham", email: "admin@example.edu", role: "ADMINISTRATOR" as const, isActive: true, mustChangePassword: false },
};

const owner = { id: users.staff.id, name: users.staff.name, email: users.staff.email, role: "IT_STAFF" as const, isActive: true };
const requester = { id: users.requester.id, name: users.requester.name, email: users.requester.email };
const ticket = {
  id: 1,
  ticketNumber: "TKT-20260915-AB12CD34",
  ticketDate: "2026-09-15T08:00:00.000Z",
  createdAt: "2026-09-15T08:00:00.000Z",
  updatedAt: "2026-09-15T11:30:00.000Z",
  requester,
  category: { id: 1, name: "Hardware" },
  relatedSystem: { id: 1, name: "Corporate Laptop" },
  summary: "Laptop battery drains before a full workday",
  description: "The battery drops from 100% to 20% in under two hours during normal office use.",
  requestedPriority: "HIGH" as const,
  itPriority: "URGENT" as const,
  currentStatus: "IN_PROGRESS" as const,
  owner,
  ticketOwner: owner,
  assignedTo: owner,
  requesterMarkedResolved: true,
  requesterResolutionIndicatedAt: "2026-09-15T10:45:00.000Z",
  attachments: [{
    id: 1,
    originalName: "battery-diagnostic.png",
    mimeType: "image/png" as const,
    sizeBytes: 18432,
    uploadedAt: "2026-09-15T08:05:00.000Z",
    removedAt: null,
    removalReason: null,
    removedByRequesterId: null,
    available: true,
  }],
  comments: [{
    id: 1,
    content: "We are checking the battery health and replacement options.",
    body: "We are checking the battery health and replacement options.",
    author: owner,
    createdAt: "2026-09-15T09:00:00.000Z",
  }],
  publicComments: [{
    id: 1,
    content: "We are checking the battery health and replacement options.",
    body: "We are checking the battery health and replacement options.",
    author: owner,
    createdAt: "2026-09-15T09:00:00.000Z",
  }],
  internalNotes: [{
    id: 1,
    content: "Replacement battery approved by the hardware team.",
    body: "Replacement battery approved by the hardware team.",
    author: owner,
    createdAt: "2026-09-15T09:20:00.000Z",
  }],
  notes: [{
    id: 1,
    content: "Replacement battery approved by the hardware team.",
    body: "Replacement battery approved by the hardware team.",
    author: owner,
    createdAt: "2026-09-15T09:20:00.000Z",
  }],
};

const ticketSummary = {
  id: ticket.id,
  ticketNumber: ticket.ticketNumber,
  ticketDate: ticket.ticketDate,
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
  requester: ticket.requester,
  category: ticket.category,
  relatedSystem: ticket.relatedSystem,
  summary: ticket.summary,
  requestedPriority: ticket.requestedPriority,
  itPriority: ticket.itPriority,
  currentStatus: ticket.currentStatus,
  owner: ticket.owner,
  ticketOwner: ticket.ticketOwner,
  assignedTo: ticket.assignedTo,
};

const adminUsers = [
  { id: users.admin.id, name: users.admin.name, email: users.admin.email, role: "ADMINISTRATOR" as const, isActive: true },
  { id: users.staff.id, name: users.staff.name, email: users.staff.email, role: "IT_STAFF" as const, isActive: true },
  { id: users.requester.id, name: users.requester.name, email: users.requester.email, role: "REQUESTER" as const, isActive: true },
  { id: 103, name: "Mali Inactive", email: "mali.inactive@example.edu", role: "REQUESTER" as const, isActive: false },
];

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function mockApi(page: Page) {
  let currentUser: (typeof users)[keyof typeof users] | null = null;

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname;

    if (path === "/api/auth/me" || path === "/api/auth/current-user") {
      return currentUser ? json(route, { user: currentUser }) : json(route, { error: { code: "AUTH_REQUIRED", message: "Authentication is required." } }, 401);
    }
    if (path === "/api/auth/login" && method === "POST") {
      const body = JSON.parse(request.postData() ?? "{}");
      const match = Object.values(users).find((item) => item.email === body.email);
      if (!match || body.password === "wrong-password") return json(route, { error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials." } }, 401);
      currentUser = match;
      return json(route, { user: match, mustChangePassword: match.mustChangePassword, requiresPasswordChange: match.mustChangePassword });
    }
    if (path === "/api/auth/logout" && method === "POST") {
      // Keep the browser fixture close to the real network timing. After an
      // authenticated logout, E2E mode must return to Login rather than the
      // legacy Lab 2 selector while the protected route is still mounted.
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
      currentUser = null;
      return route.fulfill({ status: 204, body: "" });
    }
    if (path === "/api/auth/change-password" && method === "POST") {
      if (!currentUser) return json(route, { error: { code: "AUTH_REQUIRED", message: "Authentication is required." } }, 401);
      currentUser = { ...currentUser, mustChangePassword: false };
      return json(route, { user: currentUser });
    }
    if (path === "/api/categories") return json(route, [{ id: 1, name: "Hardware" }, { id: 2, name: "Software" }, { id: 3, name: "Network" }]);
    if (path === "/api/related-systems") return json(route, [{ id: 1, name: "Corporate Laptop" }, { id: 2, name: "Campus Wi-Fi" }, { id: 3, name: "Email" }]);
    if (path === "/api/development-requesters") return json(route, [{ id: 101, name: users.requester.name, email: users.requester.email }]);
    if (path === "/api/requester/dashboard") return json(route, {
      windowStart: "2026-09-08T00:00:00.000Z",
      metrics: { openTickets: 1, waitingForMe: 0 },
      recentlyUpdated: [ticketSummary],
      recentlyResolved: [],
    });
    if (path === "/api/staff/dashboard") return json(route, {
      windowStart: "2026-09-08T00:00:00.000Z",
      metrics: { unassignedOpenTickets: 0, myOpenTickets: 1, highUrgentOpenTickets: 1, myActiveActions: 1 },
      ticketsByStatus: { NEW: 0, OPEN: 0, IN_PROGRESS: 1, WAITING_FOR_REQUESTER: 0, RESOLVED: 0, CLOSED: 0, REOPENED: 0, CANCELLED: 0 },
      urgentTickets: [ticketSummary],
      myActiveActions: [{ id: 401, ticketId: 1, actionAt: "2026-09-15T08:30:00.000Z", description: "Inspect battery health and capture diagnostic readings", status: "IN_PROGRESS", ticket: { ticketNumber: ticket.ticketNumber, summary: ticket.summary } }],
    });
    if (path === "/api/tickets/1/actions" && method === "GET") return json(route, {
      actions: [
        {
          id: 401,
          ticketId: 1,
          actionAt: "2026-09-15T08:30:00.000Z",
          description: "Inspect battery health and capture diagnostic readings",
          result: null,
          performedBy: { id: owner.id, name: owner.name },
          assignee: { id: owner.id, name: owner.name },
          status: "IN_PROGRESS",
          followUpRequired: true,
          followUpNote: "Confirm replacement availability with the hardware team.",
          attachmentNotes: "Battery diagnostic is attached to this Ticket.",
          createdAt: "2026-09-15T08:30:00.000Z",
          updatedAt: "2026-09-15T08:35:00.000Z",
        },
        {
          id: 402,
          ticketId: 1,
          actionAt: "2026-09-15T09:15:00.000Z",
          description: "Review the manufacturer's battery-health report",
          result: "Battery health is below the replacement threshold.",
          performedBy: { id: 202, name: "Suwiwat Support" },
          assignee: { id: 202, name: "Suwiwat Support" },
          status: "COMPLETED",
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
          createdAt: "2026-09-15T09:15:00.000Z",
          updatedAt: "2026-09-15T09:45:00.000Z",
        },
      ],
    });
    if (path === "/api/tickets" && method === "GET") return json(route, { items: [ticketSummary], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }, query: { search: "", sort: "updatedAt", order: "desc" } });
    if (path === "/api/tickets/1" && method === "GET") return json(route, { ticket });
    if (path === "/api/tickets/1/comments" && method === "GET") return json(route, ticket.publicComments);
    if (path === "/api/staff/tickets" && method === "GET") return json(route, { items: [ticketSummary], tickets: [ticketSummary], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }, query: { search: "", sort: "updatedAt", order: "desc" } });
    if (path === "/api/staff/tickets/1" && method === "GET") return json(route, { ticket, ...ticket, publicComments: ticket.publicComments, internalNotes: ticket.internalNotes });
    if (path === "/api/staff/users" && method === "GET") return json(route, [owner, { id: 202, name: "Suwiwat Support", email: "suwiwat.staff@example.edu", role: "IT_STAFF", isActive: true }]);
    if (path === "/api/staff/tickets/1/notes" && method === "GET") return json(route, ticket.internalNotes);
    if (path === "/api/admin/users" && method === "GET") return json(route, adminUsers);
    if (path.startsWith("/api/admin/") || path.startsWith("/api/staff/")) return json(route, { ticket, user: currentUser });
    return route.continue();
  });
}

async function capture(page: Page, screen: string, outputRoot = artifacts) {
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await expect(page.locator("body")).toBeVisible();
    const pageWidth = await page.evaluate(() => {
      const overflow = [...document.querySelectorAll("body *")]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return { tag: element.tagName, id: element.id, className: typeof element.className === "string" ? element.className : "", left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), scrollWidth: element.scrollWidth };
        })
        .filter((element) => element.left < -1 || element.right > window.innerWidth + 1)
        .slice(0, 12);
      return { viewport: window.innerWidth, document: document.documentElement.scrollWidth, overflow };
    });
    expect(pageWidth.document, `Horizontal overflow details: ${JSON.stringify(pageWidth)}`).toBeLessThanOrEqual(pageWidth.viewport);
    const directory = resolve(outputRoot, screen, viewport.name);
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: resolve(directory, "screen.png"), fullPage: true });
  }
}

async function signIn(page: Page, email: string, password = "Requester123!") {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
}

test("captures Lab 3 role screens at desktop, tablet, and mobile widths", async ({ page }) => {
  await mockApi(page);

  // This is the same compatibility path used by the retained Lab 2 browser
  // regression. It must be available only in the explicit E2E mode.
  await page.goto("/tickets");
  await expect(page).toHaveURL(/\/select-requester$/);
  await expect(page.getByText("Development Requester Selection")).toBeVisible();

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in to TokTickIT" })).toBeVisible();
  await capture(page, "authentication/login");

  await page.getByLabel("Email address").fill("first.requester@example.edu");
  await page.getByLabel("Password").fill("Requester123!");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("heading", { name: "Change Password" })).toBeVisible();
  await capture(page, "authentication/change-password-required");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await signIn(page, users.requester.email);
  await expect(page.getByRole("heading", { name: "Requester Dashboard" })).toBeVisible();
  await capture(page, "requester-dashboard/overview", lab4Artifacts);
  await page.getByRole("link", { name: "My Tickets" }).click();
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await capture(page, "requester-regression/my-tickets");

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await signIn(page, users.staff.email, "StaffLocal123!");
  await expect(page.getByRole("heading", { name: "Staff Dashboard" })).toBeVisible();
  await capture(page, "staff-dashboard/overview", lab4Artifacts);
  await page.getByRole("link", { name: "Ticket Queue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
  await capture(page, "staff-queue/ticket-queue");
  await page.getByRole("link", { name: "Open Ticket" }).first().click();
  await expect(page.getByRole("heading", { name: ticket.ticketNumber })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Record an Action" })).toBeVisible();
  await capture(page, "actions-taken/staff-editable", lab4Artifacts);
  await capture(page, "staff-ticket-detail/ticket-detail");

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await signIn(page, users.admin.email, "AdminLocal123!");
  await expect(page.getByRole("heading", { name: "Staff Dashboard" })).toBeVisible();
  await page.getByRole("link", { name: "User Management" }).click();
  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
  await capture(page, "user-management/user-management");

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await signIn(page, users.requester.email);
  await expect(page.getByRole("heading", { name: "Requester Dashboard" })).toBeVisible();
  await page.goto("/tickets/1");
  await expect(page.getByRole("heading", { name: "Actions Taken" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Record an Action" })).not.toBeVisible();
  await capture(page, "actions-taken/requester-read-only", lab4Artifacts);
});
