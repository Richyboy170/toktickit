import { expect, test } from "@playwright/test";

const staffEmail = process.env.LAB3_STAFF_EMAIL ?? "krit.staff@example.edu";
const staffPassword = process.env.LAB3_STAFF_PASSWORD ?? "StaffLocal123!";
const ticketNumber = "TKT-20261004-E2E00002";

test("IT Staff can record, start, and complete an Action on a Ticket", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(staffEmail);
  await page.getByLabel("Password").fill(staffPassword);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("heading", { name: "Staff Dashboard" })).toBeVisible();
  await page.getByRole("link", { name: "Ticket Queue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
  await page.getByLabel("Search").fill(ticketNumber);
  await page.getByRole("button", { name: "Apply Filters" }).click();
  await page.getByRole("link", { name: new RegExp(ticketNumber) }).click();
  await expect(page.getByRole("heading", { name: "Actions Taken" })).toBeVisible();

  await page.getByLabel("Description").fill("Lab 4 E2E: verify the network cable");
  await page.getByLabel("Assigned To").selectOption({ label: "Krit Staff" });
  await page.getByRole("button", { name: "Record Action" }).click();
  await expect(page.getByText("Action recorded.")).toBeVisible();
  const action = page.locator(".action-timeline > li").filter({ hasText: "Lab 4 E2E: verify the network cable" });
  await expect(action).toBeVisible();

  await action.getByRole("button", { name: "Start" }).click();
  await expect(action.getByText("In Progress")).toBeVisible();
  await action.getByRole("button", { name: "Complete Action" }).click();
  await action.getByLabel("Result or Cancellation Reason").fill("Cable link is stable after the replacement.");
  await action.getByRole("button", { name: "Save Result and Complete" }).click();
  await expect(action.getByText("Completed")).toBeVisible();
  await expect(action.getByText("Cable link is stable after the replacement.")).toBeVisible();
});
