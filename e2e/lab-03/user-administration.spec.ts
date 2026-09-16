import { expect, test } from "@playwright/test";

const adminEmail = process.env.LAB3_ADMIN_EMAIL ?? "admin@example.edu";
const adminPassword = process.env.LAB3_ADMIN_PASSWORD ?? "AdminLocal123!";
const staffEmail = process.env.LAB3_STAFF_EMAIL ?? "krit.staff@example.edu";
const staffPassword = process.env.LAB3_STAFF_PASSWORD ?? "StaffLocal123!";

test("Administrator can search users and open the minimalist create form", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(adminEmail);
  await page.getByLabel("Password").fill(adminPassword);
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
  await page.getByLabel("Search users").fill("Staff");
  await page.getByRole("button", { name: "Apply Filters" }).click();
  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
  await page.getByRole("button", { name: "Create User" }).click();
  await expect(page.getByRole("heading", { name: "Create User" })).toBeVisible();
  await expect(page.getByLabel("Initial password", { exact: true })).toBeVisible();
});

test("Administrator can inspect Staff Ticket Detail without Staff mutations", async ({ page }) => {
  // The E2E preparation keeps the migrated IDs intact, so the first Ticket
  // is not guaranteed to be ID 1. Read a real queue link before switching to
  // the Administrator session used by this regression.
  await page.goto("/login");
  await page.getByLabel("Email address").fill(staffEmail);
  await page.getByLabel("Password").fill(staffPassword);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
  const ticketPath = await page.getByRole("link", { name: "Open Ticket" }).first().getAttribute("href");
  const ticketId = ticketPath?.match(/\/(\d+)$/)?.[1];
  expect(ticketId).toBeTruthy();
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/login");
  await page.getByLabel("Email address").fill(adminEmail);
  await page.getByLabel("Password").fill(adminPassword);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();

  // Forward the HTTP-only session cookie explicitly. This keeps the
  // assertion stable if the browser and API use different loopback hostnames
  // in CI.
  const sessionCookie = (await page.context().cookies()).find((cookie) => cookie.name === "toktickit_session");
  expect(sessionCookie).toBeDefined();
  const staffDetail = await page.request.get(`http://127.0.0.1:3000/api/staff/tickets/${ticketId}`, {
    headers: { Cookie: `${sessionCookie!.name}=${sessionCookie!.value}` },
  });
  expect(staffDetail.status()).toBe(200);
  const payload = await staffDetail.json();
  expect(payload.ticket).toEqual(expect.objectContaining({ id: Number(ticketId) }));

  await page.goto(`/admin/tickets/${ticketId}`);
  await expect(page.getByRole("heading", { name: /TKT-/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Public Comments" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Internal Notes" })).toBeVisible();
  await expect(page.getByLabel("IT Priority")).toBeVisible();
  await expect(page.getByRole("button", { name: "Claim Ticket" })).not.toBeVisible();
  await expect(page.getByLabel("Current Status")).not.toBeVisible();
});
