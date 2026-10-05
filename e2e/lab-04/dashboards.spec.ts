import { expect, test } from "@playwright/test";

const requesterEmail = process.env.LAB4_REQUESTER_EMAIL ?? "narin.w@example.edu";
const requesterPassword = process.env.LAB4_REQUESTER_PASSWORD ?? "Requester123!";
const staffEmail = process.env.LAB3_STAFF_EMAIL ?? "krit.staff@example.edu";
const staffPassword = process.env.LAB3_STAFF_PASSWORD ?? "StaffLocal123!";
const adminEmail = process.env.LAB3_ADMIN_EMAIL ?? "admin@example.edu";
const adminPassword = process.env.LAB3_ADMIN_PASSWORD ?? "AdminLocal123!";

test("Requester Dashboard drills into owned Tickets and read-only Action history", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(requesterEmail);
  await page.getByLabel("Password").fill(requesterPassword);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("heading", { name: "Requester Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: /open tickets/i })).toHaveAttribute("href", "/tickets?statusGroup=open");
  await page.getByRole("link", { name: /open tickets/i }).click();
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await expect(page.getByLabel("Status")).toHaveValue("OPEN_GROUP");

  await page.goto("/dashboard");
  const recentTicket = page.locator(".dashboard-list a[href^='/tickets/']").first();
  await expect(recentTicket).toBeVisible();
  await recentTicket.click();
  await expect(page.getByRole("heading", { name: "Actions Taken" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Record an Action" })).not.toBeVisible();
  await expect(page.getByRole("button", { name: /edit action|cancel action|start|complete action/i })).toHaveCount(0);
});

test("IT Staff and Administrators can use their operational dashboard and Ticket Queue", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(staffEmail);
  await page.getByLabel("Password").fill(staffPassword);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("heading", { name: "Staff Dashboard" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tickets by Status" })).toBeVisible();
  await page.getByRole("link", { name: "Ticket Queue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email address").fill(adminEmail);
  await page.getByLabel("Password").fill(adminPassword);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("heading", { name: "Staff Dashboard" })).toBeVisible();
  await page.getByRole("link", { name: "Ticket Queue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
});
