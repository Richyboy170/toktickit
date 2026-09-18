import { expect, test } from "@playwright/test";

const staffEmail = process.env.LAB3_STAFF_EMAIL ?? "krit.staff@example.edu";
const staffPassword = process.env.LAB3_STAFF_PASSWORD ?? "StaffLocal123!";

test("IT Staff can open the queue and Ticket Detail workflow", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(staffEmail);
  await page.getByLabel("Password").fill(staffPassword);
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
  const openTicket = page.getByRole("link", { name: "Open Ticket" }).first();
  await expect(openTicket).toBeVisible();
  await openTicket.click();
  await expect(page.getByRole("heading", { name: /TKT-/ })).toBeVisible();
  await expect(page.getByLabel("IT Priority")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Public Comments" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Internal Notes" })).toBeVisible();
});
