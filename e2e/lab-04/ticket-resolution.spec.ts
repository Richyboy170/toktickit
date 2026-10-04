import { expect, test } from "@playwright/test";

const staffEmail = process.env.LAB3_STAFF_EMAIL ?? "krit.staff@example.edu";
const staffPassword = process.env.LAB3_STAFF_PASSWORD ?? "StaffLocal123!";
const ticketNumber = "TKT-20261004-E2E00001"; // This seeded workflow Ticket intentionally has no Actions.

test("resolution waits for completed work and permits cancelled history", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(staffEmail);
  await page.getByLabel("Password").fill(staffPassword);
  await page.getByRole("button", { name: "Sign In" }).click();
  page.on("dialog", async (dialog) => {
    if (dialog.type === "prompt") await dialog.accept("No longer required after triage.");
    else await dialog.accept();
  });
  await page.getByRole("link", { name: "Ticket Queue" }).click();
  await page.goto(`/staff/tickets?status=NEW`);
  await page.getByRole("link", { name: ticketNumber }).click();

  await page.getByRole("button", { name: "Claim Ticket" }).click();
  const status = page.getByLabel("Current Status");
  await status.selectOption("OPEN");
  await page.getByRole("button", { name: "Save Status" }).click();
  await expect(page.getByText("Ticket status updated.")).toBeVisible();
  await status.selectOption("IN_PROGRESS");
  await page.getByRole("button", { name: "Save Status" }).click();
  await expect(page.getByText("Ticket status updated.")).toBeVisible();

  await status.selectOption("RESOLVED");
  await page.getByRole("button", { name: "Save Status" }).click();
  await expect(page.getByRole("alert")).toContainText("Complete at least one Action");

  await page.getByLabel("Description").fill("Lab 4 E2E: repair requester laptop");
  await page.getByLabel("Assigned To").selectOption({ label: "Krit Staff" });
  await page.getByRole("button", { name: "Record Action" }).click();
  const repair = page.locator(".action-timeline > li").filter({ hasText: "Lab 4 E2E: repair requester laptop" });
  await expect(repair).toBeVisible();
  await repair.getByRole("button", { name: "Start" }).click();
  await repair.getByRole("button", { name: "Complete Action" }).click();
  await repair.getByLabel("Result or Cancellation Reason").fill("Requester confirmed the laptop is working.");
  await repair.getByRole("button", { name: "Save Result and Complete" }).click();
  await expect(repair.getByText("Completed")).toBeVisible();

  await page.getByLabel("Description").fill("Lab 4 E2E: duplicate diagnostic check");
  await page.getByRole("button", { name: "Record Action" }).click();
  const duplicate = page.locator(".action-timeline > li").filter({ hasText: "Lab 4 E2E: duplicate diagnostic check" });
  await duplicate.getByRole("button", { name: "Cancel Action" }).click();
  await expect(duplicate.getByText("Cancelled")).toBeVisible();

  await status.selectOption("RESOLVED");
  await page.getByRole("button", { name: "Save Status" }).click();
  await expect(page.getByText("Ticket status updated.")).toBeVisible();
  await expect(page.getByText("Resolved", { exact: true })).toBeVisible();
});
