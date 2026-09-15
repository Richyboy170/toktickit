import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const staff: api.AuthUser = { id: 7, name: "Narin Staff", email: "narin@example.edu", role: "IT_STAFF", isActive: true, mustChangePassword: false };
const ticket: api.TicketSummary = { id: 41, ticketNumber: "TKT-20260915-A1B2C3D4", ticketDate: "2026-09-15T04:00:00.000Z", summary: "Campus laptop cannot connect", category: { id: 1, name: "Hardware" }, relatedSystem: { id: 2, name: "Corporate Laptop" }, requestedPriority: "HIGH", itPriority: "URGENT", currentStatus: "OPEN", updatedAt: "2026-09-15T05:00:00.000Z", requester: { id: 1, name: "Ananda Requester", email: "ananda@example.edu" } };

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem("toktickit.authUser", JSON.stringify(staff));
  window.history.replaceState({}, "", "/staff/tickets");
  vi.spyOn(api, "getCurrentUser").mockResolvedValue(staff);
  vi.spyOn(api, "getCategories").mockResolvedValue([ticket.category]);
  vi.spyOn(api, "getRelatedSystems").mockResolvedValue([ticket.relatedSystem]);
});

afterEach(() => vi.restoreAllMocks());

describe("IT Staff Ticket Queue", () => {
  it("shows ownership, both priorities, status, and a detail action", async () => {
    vi.spyOn(api, "listStaffTickets").mockResolvedValue({ items: [ticket], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } });
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Ticket Queue" })).toBeInTheDocument();
    expect((await screen.findAllByText(ticket.ticketNumber)).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Urgent").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Open").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Open Ticket" })[0]).toHaveAttribute("href", "/staff/tickets/41");
    expect(screen.getAllByText("Unassigned").length).toBeGreaterThan(0);
  });

  it("applies search and queue filters through the API", async () => {
    const list = vi.spyOn(api, "listStaffTickets").mockResolvedValue({ items: [ticket], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } });
    render(<App />);
    await screen.findByRole("heading", { name: "Ticket Queue" });
    await userEvent.type(screen.getByLabelText("Search"), "campus");
    await userEvent.selectOptions(screen.getByLabelText("IT Priority"), "URGENT");
    await userEvent.click(screen.getByRole("button", { name: "Apply Filters" }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ search: "campus", itPriority: "URGENT", page: 1 })));
  });
});
