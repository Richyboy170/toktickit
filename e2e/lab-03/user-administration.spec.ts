import { expect, test } from "@playwright/test";

const adminEmail = process.env.LAB3_ADMIN_EMAIL ?? "admin@example.edu";
const adminPassword = process.env.LAB3_ADMIN_PASSWORD ?? "AdminLocal123!";

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
  await page.goto("/login");
  await page.getByLabel("Email address").fill(adminEmail);
  await page.getByLabel("Password").fill(adminPassword);
  await page.getByRole("button", { name: "Sign In" }).click();

  const staffDetail = await page.request.get("http://127.0.0.1:3000/api/staff/tickets/1");
  expect(staffDetail.status()).toBe(200);
  const payload = await staffDetail.json();
  expect(payload.ticket).toEqual(expect.objectContaining({ id: 1 }));

  await page.goto("/admin/tickets/1");
  await expect(page.getByRole("heading", { name: /TKT-/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Public Comments" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Internal Notes" })).toBeVisible();
  await expect(page.getByLabel("IT Priority")).toBeVisible();
  await expect(page.getByRole("button", { name: "Claim Ticket" })).not.toBeVisible();
  await expect(page.getByLabel("Current Status")).not.toBeVisible();
});
