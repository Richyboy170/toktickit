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
