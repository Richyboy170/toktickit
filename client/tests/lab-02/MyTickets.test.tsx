import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const requester: api.DevelopmentRequester = { id: 1, name: "Ananda Kittisak", email: "ananda.k@example.edu" };
const item: api.TicketSummary = {
  id: 41, ticketNumber: "TKT-20260820-A1B2C3D4", ticketDate: "2026-08-20T04:00:00.000Z",
  summary: "Laptop battery drains quickly", category: { id: 1, name: "Hardware" },
  relatedSystem: { id: 2, name: "Corporate Laptop" }, requestedPriority: "HIGH", currentStatus: "NEW",
  updatedAt: "2026-08-20T05:00:00.000Z",
};

function response(items: api.TicketSummary[], page = 1, totalPages = items.length ? 1 : 0): api.TicketListResponse {
  return { items, pagination: { page, pageSize: 10, totalItems: items.length, totalPages }, query: { search: "", sort: "updatedAt", order: "desc" } };
}

beforeEach(() => {
  sessionStorage.setItem("toktickit.developmentRequester", JSON.stringify(requester));
  window.history.replaceState({}, "", "/tickets");
  vi.spyOn(api, "getCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
  vi.spyOn(api, "getRelatedSystems").mockResolvedValue([{ id: 2, name: "Corporate Laptop" }]);
});

afterEach(() => vi.restoreAllMocks());

describe("My Tickets", () => {
  it("shows only the returned requester-owned Tickets and detail links", async () => {
    vi.spyOn(api, "listTickets").mockResolvedValue(response([item]));
    render(<App />);
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent(/loading your tickets/i);
    const links = await screen.findAllByRole("link", { name: item.ticketNumber });
    expect(links[0]).toHaveAttribute("href", "/tickets/41");
    expect(screen.getAllByText(item.summary).length).toBeGreaterThan(0);
    expect(api.listTickets).toHaveBeenCalledWith(1, expect.objectContaining({ page: 1, pageSize: 10, sort: "updatedAt", order: "desc" }));
  });

  it("applies search and reference filters through the list API", async () => {
    const list = vi.spyOn(api, "listTickets").mockResolvedValue(response([item]));
    render(<App />);
    await screen.findAllByRole("link", { name: item.ticketNumber });
    await userEvent.type(screen.getByLabelText("Search"), "battery");
    await userEvent.selectOptions(screen.getByLabelText("Category"), "1");
    await userEvent.selectOptions(screen.getByLabelText("Priority"), "HIGH");
    await userEvent.click(screen.getByRole("button", { name: "Apply Filters" }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(1, expect.objectContaining({ search: "battery", categoryId: 1, requestedPriority: "HIGH", page: 1 })));
  });

  it("distinguishes a new requester from filtered no-results", async () => {
    vi.spyOn(api, "listTickets").mockResolvedValue(response([]));
    render(<App />);
    expect(await screen.findByRole("heading", { name: "No Tickets yet" })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Search"), "missing");
    await userEvent.click(screen.getByRole("button", { name: "Apply Filters" }));
    expect(await screen.findByRole("heading", { name: "No matching Tickets" })).toBeInTheDocument();
  });

  it("offers retry after a safe load failure", async () => {
    const list = vi.spyOn(api, "listTickets").mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(response([item]));
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to load/i);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect((await screen.findAllByRole("link", { name: item.ticketNumber })).length).toBeGreaterThan(0);
    expect(list).toHaveBeenCalledTimes(2);
  });
});
