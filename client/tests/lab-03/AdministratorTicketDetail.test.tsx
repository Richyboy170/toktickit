import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const admin: api.AuthUser = { id: 1, name: "Admin User", email: "admin@example.edu", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false };
const ticket: api.StaffTicketDetail = {
  id: 41,
  ticketNumber: "TKT-20260915-A1B2C3D4",
  ticketDate: "2026-09-15T04:00:00.000Z",
  summary: "Campus laptop cannot connect",
  category: { id: 1, name: "Hardware" },
  relatedSystem: { id: 2, name: "Corporate Laptop" },
  requestedPriority: "HIGH",
  itPriority: "HIGH",
  currentStatus: "NEW",
  description: "The laptop fails to join Wi-Fi.",
  requester: { id: 2, name: "Ananda Requester", email: "ananda@example.edu" },
  owner: null,
  attachments: [],
  publicComments: [],
  internalNotes: [],
  createdAt: "2026-09-15T04:00:00.000Z",
  updatedAt: "2026-09-15T05:00:00.000Z",
};

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem("toktickit.authUser", JSON.stringify(admin));
  window.history.replaceState({}, "", "/admin/tickets/41");
  vi.spyOn(api, "getCurrentUser").mockResolvedValue(admin);
  vi.spyOn(api, "getAdminTicket").mockResolvedValue(ticket);
  vi.spyOn(api, "getAssignableStaff").mockResolvedValue([]);
  vi.spyOn(api, "getPublicComments").mockResolvedValue([]);
  vi.spyOn(api, "getInternalNotes").mockResolvedValue([]);
  vi.spyOn(api, "updateTicketPriority").mockResolvedValue(ticket);
});

afterEach(() => vi.restoreAllMocks());

describe("Administrator Ticket Detail", () => {
  it("keeps operational fields read-only while allowing IT Priority review", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { name: ticket.ticketNumber })).toBeInTheDocument();
    expect(screen.getByLabelText("IT Priority")).toBeInTheDocument();
    expect(screen.queryByLabelText("Ticket Owner")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Current Status")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim Ticket" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Add Public Comment")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Add Attachment")).not.toBeInTheDocument();
  });

  it("saves an Administrator IT Priority change through the role-aware API client", async () => {
    const update = vi.mocked(api.updateTicketPriority);
    render(<App />);
    await screen.findByRole("heading", { name: ticket.ticketNumber });
    await userEvent.selectOptions(screen.getByLabelText("IT Priority"), "URGENT");
    await userEvent.click(screen.getByRole("button", { name: "Save IT Priority" }));
    expect(update).toHaveBeenCalledWith(41, "URGENT", "ADMINISTRATOR");
  });
});
