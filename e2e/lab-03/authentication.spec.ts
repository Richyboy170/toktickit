import { expect, test } from "@playwright/test";

const requesterEmail = process.env.LAB3_REQUESTER_EMAIL ?? "ananda.k@example.edu";
const requesterPassword = process.env.LAB3_REQUESTER_PASSWORD ?? "Requester123!";

test("Requester can sign in, see the role shell, and lose access after logout", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(requesterEmail);
  await page.getByLabel("Password").fill(requesterPassword);
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await expect(page.getByText("Requester", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/tickets");
  await expect(page.getByRole("heading", { name: "TokTickIT" })).toBeVisible();
});
