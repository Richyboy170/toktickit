import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const requester: api.DevelopmentRequester = { id: 1, name: "Ananda Kittisak", email: "ananda.k@example.edu" };
const item: api.TicketSummary = { id: 41, ticketNumber: "TKT-20260820-A1B2C3D4", ticketDate: "2026-08-20T04:00:00.000Z", summary: "Responsive Ticket summary", category: { id: 1, name: "Hardware" }, relatedSystem: { id: 2, name: "Corporate Laptop" }, requestedPriority: "HIGH", currentStatus: "NEW", updatedAt: "2026-08-20T05:00:00.000Z" };

beforeEach(() => {
  sessionStorage.setItem("toktickit.developmentRequester", JSON.stringify(requester));
  window.history.replaceState({}, "", "/tickets");
  vi.spyOn(api, "getCategories").mockResolvedValue([item.category]);
  vi.spyOn(api, "getRelatedSystems").mockResolvedValue([item.relatedSystem]);
  vi.spyOn(api, "listTickets").mockResolvedValue({ items: [item], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }, query: { search: "", sort: "updatedAt", order: "desc" } });
});

afterEach(() => vi.restoreAllMocks());

describe("Lab 2 responsive and accessible structure", () => {
  it("keeps equivalent essential Ticket information in desktop table and mobile card views", async () => {
    const { container } = render(<App />);
    const table = await screen.findByRole("table");
    const card = container.querySelector<HTMLElement>(".ticket-cards .ticket-card");
    expect(card).not.toBeNull();
    for (const text of [item.ticketNumber, item.summary, item.category.name, item.relatedSystem.name, "High", "New"]) {
      expect(within(table).getAllByText(text).length).toBeGreaterThan(0);
      expect(within(card!).getAllByText(text).length).toBeGreaterThan(0);
    }
    expect(within(table).getByRole("link", { name: "View Ticket" })).toHaveAttribute("href", "/tickets/41");
    expect(within(card!).getByRole("link", { name: "View Ticket" })).toHaveAttribute("href", "/tickets/41");
  });

  it("provides labelled controls, keyboard focus, status text, and non-colour badges", async () => {
    render(<App />);
    await screen.findByRole("table");
    for (const label of ["Search", "Category", "Related System", "Priority", "Status", "Sort by", "Order", "Per page"]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getAllByText("High").some((element) => element.classList.contains("badge"))).toBe(true);
    expect(screen.getAllByText("New").some((element) => element.classList.contains("badge"))).toBe(true);
    await userEvent.tab();
    expect(document.activeElement).not.toBe(document.body);
  });
});
