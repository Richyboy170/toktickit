import { expect, Page, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const artifacts = resolve(import.meta.dirname, "../../artifacts/lab-02/screenshots");
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XGqZ1wAAAABJRU5ErkJggg==", "base64");
for (const directory of ["requester-selection/desktop", "create-ticket/desktop", "my-tickets/desktop", "my-tickets/tablet", "my-tickets/mobile", "ticket-detail/desktop", "ticket-detail/mobile"]) {
  mkdirSync(resolve(artifacts, directory), { recursive: true });
}

async function noHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function chooseRequester(page: Page, name: string) {
  const optionValue = await page.getByRole("option", { name: new RegExp(name) }).getAttribute("value");
  await page.getByLabel("Development Requester").selectOption(optionValue!);
  await page.getByRole("button", { name: "Continue to My Tickets" }).click();
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
}

test.describe.serial("Lab 2 requester Ticket workflow", () => {
  test("creates, finds, opens, downloads, previews, removes, and ownership-protects a Ticket", async ({ page }) => {
    await page.goto("/tickets");
    await expect(page.getByText("Development Requester Selection")).toBeVisible();
    await page.screenshot({ path: resolve(artifacts, "requester-selection/desktop/populated.png"), fullPage: true });
    await chooseRequester(page, "Ananda Kittisak");

    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Create Ticket" }).click();
    await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page.getByText("Select a Category.")).toBeVisible();
    await page.screenshot({ path: resolve(artifacts, "create-ticket/desktop/validation-errors.png"), fullPage: true });

    await page.getByLabel("Category").selectOption({ label: "Hardware" });
    await page.getByLabel("Related System").selectOption({ label: "Corporate Laptop" });
    await page.getByLabel("Requested Priority").selectOption("HIGH");
    await page.getByLabel("Ticket Summary").fill("E2E laptop battery drains quickly");
    await page.getByLabel("Description").fill("The E2E laptop battery falls from full to empty in under one hour.");
    await page.getByLabel("Attachments").setInputFiles({ name: "e2e-evidence.png", mimeType: "image/png", buffer: png });
    await page.getByRole("button", { name: "Submit Ticket" }).click();

    const heading = page.getByRole("heading", { name: /^TKT-\d{8}-[A-F0-9]{8}$/ });
    const ticketNumber = await heading.textContent();
    expect(ticketNumber).toBeTruthy();
    await page.screenshot({ path: resolve(artifacts, "create-ticket/desktop/success.png"), fullPage: true });
    await page.getByRole("link", { name: "View Ticket" }).click();
    await expect(page.getByRole("heading", { name: ticketNumber! })).toBeVisible();
    await expect(page.getByText("e2e-evidence.png", { exact: true })).toBeVisible();
    const ticketUrl = page.url();
    await noHorizontalOverflow(page);
    await page.screenshot({ path: resolve(artifacts, "ticket-detail/desktop/active-attachment.png"), fullPage: true });

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download e2e-evidence.png" }).click();
    expect((await downloadPromise).suggestedFilename()).toBe("e2e-evidence.png");
    await page.getByRole("button", { name: "Preview e2e-evidence.png" }).click();
    await expect(page.getByRole("img", { name: "Preview of e2e-evidence.png" })).toBeVisible();

    await page.getByRole("button", { name: "Remove e2e-evidence.png" }).click();
    await expect(page.getByRole("dialog", { name: "Remove Attachment" })).toBeVisible();
    await page.screenshot({ path: resolve(artifacts, "ticket-detail/desktop/removal-dialog.png"), fullPage: true });
    await page.getByLabel("Removal reason").fill("Evidence superseded during E2E verification");
    await page.getByRole("button", { name: "Confirm Removal" }).click();
    await expect(page.getByText(/was removed/)).toBeVisible();
    await expect(page.getByText("Evidence superseded during E2E verification")).toBeVisible();
    await expect(page.getByRole("button", { name: "Download e2e-evidence.png" })).toHaveCount(0);
    await page.screenshot({ path: resolve(artifacts, "ticket-detail/desktop/removed-attachment.png"), fullPage: true });

    await page.getByRole("link", { name: /Back to My Tickets/ }).click();
    await expect(page.getByText("E2E laptop battery drains quickly").first()).toBeVisible();
    await page.getByRole("button", { name: "Change Requester" }).click();
    await chooseRequester(page, "Chayanee Rattanakul");
    await expect(page.getByText("E2E laptop battery drains quickly")).toHaveCount(0);
    await page.goto(ticketUrl);
    await expect(page.getByRole("heading", { name: "Ticket not found" })).toBeVisible();
    await page.screenshot({ path: resolve(artifacts, "ticket-detail/desktop/cross-requester-not-found.png"), fullPage: true });
  });

  test("captures loading, failure, tablet, and mobile layouts without page overflow", async ({ page }) => {
    await page.goto("/select-requester");
    await chooseRequester(page, "Ananda Kittisak");

    await page.route("**/api/tickets?**", async (route) => {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_000));
      await route.continue();
    });
    await page.reload();
    await expect(page.getByRole("status", { name: "" })).toContainText("Loading your Tickets");
    await page.screenshot({ path: resolve(artifacts, "my-tickets/desktop/loading.png"), fullPage: true });
    await expect(page.getByText("E2E laptop battery drains quickly").first()).toBeVisible();
    await page.unroute("**/api/tickets?**");

    await page.route("**/api/tickets?**", (route) => route.abort());
    await page.reload();
    await expect(page.getByRole("alert")).toContainText("Unable to load your Tickets");
    await page.screenshot({ path: resolve(artifacts, "my-tickets/desktop/api-failure.png"), fullPage: true });
    await page.unroute("**/api/tickets?**");
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByText("E2E laptop battery drains quickly").first()).toBeVisible();

    await page.setViewportSize({ width: 820, height: 1000 });
    await noHorizontalOverflow(page);
    await page.screenshot({ path: resolve(artifacts, "my-tickets/tablet/populated.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await noHorizontalOverflow(page);
    await expect(page.getByRole("link", { name: "View Ticket" }).last()).toBeVisible();
    await page.screenshot({ path: resolve(artifacts, "my-tickets/mobile/populated.png"), fullPage: true });

    await page.getByRole("link", { name: /^TKT-/ }).last().click();
    await noHorizontalOverflow(page);
    await page.screenshot({ path: resolve(artifacts, "ticket-detail/mobile/removed-attachment.png"), fullPage: true });
  });
});
