import { expect, Page, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const artifacts = resolve(import.meta.dirname, "../../artifacts/lab-02/screenshots");
const requesters = [
  { id: 1, name: "Ananda Kittisak", email: "ananda.k@example.edu" },
  { id: 2, name: "Chayanee Rattanakul", email: "chayanee.r@example.edu" },
];
const categories = [{ id: 1, name: "Hardware" }, { id: 2, name: "Software" }];
const systems = [{ id: 1, name: "Corporate Laptop" }, { id: 2, name: "Campus Wi-Fi" }];

for (const directory of ["requester-selection/desktop", "create-ticket/desktop", "my-tickets/desktop"]) {
  mkdirSync(resolve(artifacts, directory), { recursive: true });
}

async function screenshot(page: Page, relativePath: string) {
  await page.screenshot({ path: resolve(artifacts, relativePath), fullPage: true });
}

async function mockReferenceData(page: Page) {
  await page.route("**/api/development-requesters", (route) => route.fulfill({ json: requesters }));
  await page.route("**/api/categories", (route) => route.fulfill({ json: categories }));
  await page.route("**/api/related-systems", (route) => route.fulfill({ json: systems }));
}

async function selectRequester(page: Page, requesterId = "1") {
  await page.goto("/select-requester");
  await page.getByLabel("Development Requester").selectOption(requesterId);
  await page.getByRole("button", { name: "Continue to My Tickets" }).click();
}

function ticket(id: number) {
  const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
  return {
    id,
    ticketNumber: `TKT-20260905-${String(id).padStart(8, "0")}`,
    ticketDate: "2026-09-05T03:00:00.000Z",
    summary: `Requester-owned evidence Ticket ${id}`,
    category: categories[id % categories.length],
    relatedSystem: systems[id % systems.length],
    requestedPriority: priorities[id % priorities.length],
    currentStatus: "NEW",
    updatedAt: `2026-09-05T03:${String(id).padStart(2, "0")}:00.000Z`,
  };
}

test.describe.serial("Lab 2 rubric evidence states", () => {
  test("captures Requester loading, failure, empty, and active selection", async ({ page }) => {
    await page.route("**/api/development-requesters", async (route) => {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_000));
      await route.fulfill({ json: requesters });
    });
    await page.goto("/select-requester");
    await expect(page.getByText("Loading active Requesters")).toBeVisible();
    await screenshot(page, "requester-selection/desktop/loading.png");
    await expect(page.getByLabel("Development Requester")).toBeVisible();
    await page.getByLabel("Development Requester").selectOption("1");
    await screenshot(page, "requester-selection/desktop/selected.png");

    await page.unroute("**/api/development-requesters");
    await page.route("**/api/development-requesters", (route) => route.fulfill({ status: 503, json: { error: { message: "Unavailable" } } }));
    await page.reload();
    await expect(page.getByRole("alert")).toContainText("Unable to load Development Requesters");
    await screenshot(page, "requester-selection/desktop/api-failure.png");

    await page.unroute("**/api/development-requesters");
    await page.route("**/api/development-requesters", (route) => route.fulfill({ json: [] }));
    await page.reload();
    await expect(page.getByText("No active Development Requesters are available.")).toBeVisible();
    await screenshot(page, "requester-selection/desktop/empty.png");
  });

  test("captures initial Create Ticket, files, submitting, and preserved failure", async ({ page }) => {
    await mockReferenceData(page);
    await page.route("**/api/tickets?**", (route) => route.fulfill({ json: { items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }, query: { search: "", sort: "updatedAt", order: "desc" } } }));
    await selectRequester(page);
    await page.goto("/tickets/new");
    await expect(page.getByRole("heading", { name: "Create Ticket" })).toBeVisible();
    await screenshot(page, "create-ticket/desktop/initial.png");

    await page.getByLabel("Category").selectOption("1");
    await page.getByLabel("Related System").selectOption("1");
    await page.getByLabel("Requested Priority").selectOption("HIGH");
    await page.getByLabel("Ticket Summary").fill("Preserved failed submission");
    await page.getByLabel("Description").fill("These values must remain after the backend rejects the request.");
    await page.getByLabel("Attachments").setInputFiles([
      { name: "valid-evidence.png", mimeType: "image/png", buffer: Buffer.from("89504e470d0a1a0a", "hex") },
      { name: "invalid-evidence.exe", mimeType: "application/octet-stream", buffer: Buffer.from("invalid") },
    ]);
    await expect(page.getByRole("button", { name: "Remove valid-evidence.png" })).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("invalid-evidence.exe");
    await screenshot(page, "create-ticket/desktop/valid-and-invalid-attachments.png");

    await page.route("**/api/tickets", async (route) => {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_200));
      await route.fulfill({ status: 500, json: { error: { code: "INTERNAL_ERROR", message: "Unable to save the Ticket right now." } } });
    });
    await page.getByRole("button", { name: "Submit Ticket" }).click();
    await expect(page.getByRole("button", { name: /Submitting ticket/ })).toBeDisabled();
    await screenshot(page, "create-ticket/desktop/submitting.png");
    await expect(page.getByText("Unable to save the Ticket right now.", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Ticket Summary")).toHaveValue("Preserved failed submission");
    await screenshot(page, "create-ticket/desktop/api-failure-values-preserved.png");
  });

  test("captures My Tickets search, filters, sorting, pagination, and no results", async ({ page }) => {
    await mockReferenceData(page);
    await page.route("**/api/tickets?**", async (route) => {
      const url = new URL(route.request().url());
      const filtered = Boolean(url.searchParams.get("search"));
      if (filtered) {
        await route.fulfill({ json: { items: [], pagination: { page: 1, pageSize: 5, totalItems: 0, totalPages: 0 }, query: { search: url.searchParams.get("search"), sort: "summary", order: "asc" } } });
        return;
      }
      const pageNumber = Number(url.searchParams.get("page") ?? 1);
      const all = Array.from({ length: 7 }, (_, index) => ticket(index + 1));
      const items = pageNumber === 1 ? all.slice(0, 5) : all.slice(5);
      await route.fulfill({ json: { items, pagination: { page: pageNumber, pageSize: 5, totalItems: 7, totalPages: 2 }, query: { search: "", sort: "updatedAt", order: "desc" } } });
    });
    await selectRequester(page);
    await page.getByLabel("Per page").selectOption("5");
    await page.getByLabel("Category").selectOption("1");
    await page.getByLabel("Related System").selectOption("1");
    await page.getByLabel("Priority").selectOption("HIGH");
    await page.getByLabel("Status").selectOption("NEW");
    await page.getByLabel("Sort by").selectOption("summary");
    await page.getByLabel("Order").selectOption("asc");
    await screenshot(page, "my-tickets/desktop/filters-sort-pagination.png");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Page 2 of 2")).toBeVisible();
    await screenshot(page, "my-tickets/desktop/pagination-page-2.png");

    await page.getByLabel("Search").fill("definitely-no-match");
    await page.getByRole("button", { name: "Apply Filters" }).click();
    await expect(page.getByRole("heading", { name: "No matching Tickets" })).toBeVisible();
    await screenshot(page, "my-tickets/desktop/no-results.png");
  });

  test("captures the initial empty My Tickets state", async ({ page }) => {
    await mockReferenceData(page);
    await page.route("**/api/tickets?**", (route) => route.fulfill({ json: { items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }, query: { search: "", sort: "updatedAt", order: "desc" } } }));
    await selectRequester(page, "2");
    await expect(page.getByRole("heading", { name: "No Tickets yet" })).toBeVisible();
    await screenshot(page, "my-tickets/desktop/empty.png");
  });
});
