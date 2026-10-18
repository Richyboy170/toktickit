import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const staff: api.AuthUser = { id: 7, name: "Narin Staff", email: "narin@example.edu", role: "IT_STAFF", isActive: true, mustChangePassword: false };
const requester: api.AuthUser = { id: 2, name: "Ananda Requester", email: "ananda@example.edu", role: "REQUESTER", isActive: true, mustChangePassword: false };
const admin: api.AuthUser = { id: 1, name: "Admin User", email: "admin@example.edu", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false };
const baseTicket: api.StaffTicketDetail = {
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
  requester: { id: requester.id, name: requester.name, email: requester.email },
  owner: { id: staff.id, name: staff.name, email: staff.email, role: "IT_STAFF", isActive: true },
  attachments: [],
  publicComments: [],
  internalNotes: [],
  createdAt: "2026-09-15T04:00:00.000Z",
  updatedAt: "2026-09-15T05:00:00.000Z",
};
const requesterTicket: api.TicketDetail = {
  id: baseTicket.id,
  ticketNumber: baseTicket.ticketNumber,
  ticketDate: baseTicket.ticketDate,
  requester: { id: requester.id, name: requester.name, email: requester.email },
  category: baseTicket.category,
  relatedSystem: baseTicket.relatedSystem,
  summary: baseTicket.summary,
  requestedPriority: baseTicket.requestedPriority,
  description: baseTicket.description,
  currentStatus: baseTicket.currentStatus,
  createdAt: baseTicket.createdAt,
  updatedAt: baseTicket.updatedAt,
  attachments: [],
  publicComments: [],
};

const nextStatuses: Record<api.TicketStatus, api.TicketStatus[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  CANCELLED: [],
};

function setUser(user: api.AuthUser, path: string) {
  sessionStorage.clear();
  sessionStorage.setItem("toktickit.authUser", JSON.stringify(user));
  window.history.replaceState({}, "", path);
  vi.spyOn(api, "getCurrentUser").mockResolvedValue(user);
}

function mockStaffDetail(ticket: api.StaffTicketDetail) {
  vi.spyOn(api, "getStaffTicket").mockResolvedValue(ticket);
  vi.spyOn(api, "getAssignableStaff").mockResolvedValue([staff]);
  vi.spyOn(api, "getPublicComments").mockResolvedValue([]);
  vi.spyOn(api, "getInternalNotes").mockResolvedValue([]);
  vi.spyOn(api, "getTicketActions").mockResolvedValue({ actions: [] });
}

beforeEach(() => {
  setUser(staff, "/staff/tickets/41");
  mockStaffDetail(baseTicket);
});
afterEach(() => vi.restoreAllMocks());

describe("Ticket workflow UI", () => {
  it.each(Object.entries(nextStatuses) as [api.TicketStatus, api.TicketStatus[]][])(
    "shows only permitted next statuses from %s",
    async (current, allowed) => {
      mockStaffDetail({ ...baseTicket, currentStatus: current });
      render(<App />);
      const status = await screen.findByLabelText("Current Status");
      expect(within(status).getAllByRole("option").map((option) => (option as HTMLOptionElement).value)).toEqual([current, ...allowed]);
    },
  );

  it("requires confirmation and a cancellation reason before saving a cancellation", async () => {
    const update = vi.spyOn(api, "updateTicketStatus").mockResolvedValue({ ...baseTicket, currentStatus: "CANCELLED", updatedAt: "2026-09-15T06:00:00.000Z" });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "prompt").mockReturnValue("Duplicate request");
    render(<App />);

    const status = await screen.findByLabelText("Current Status");
    await userEvent.selectOptions(status, "CANCELLED");
    await userEvent.click(screen.getByRole("button", { name: "Save Status" }));

    expect(window.confirm).toHaveBeenCalledWith("Change Ticket status to Cancelled?");
    expect(window.prompt).toHaveBeenCalledWith("Reason for cancelling this Ticket (required):");
    expect(update).toHaveBeenCalledWith(baseTicket.id, "CANCELLED", baseTicket.updatedAt, true, "Duplicate request");
    expect(await screen.findByText("Ticket status updated.")).toBeInTheDocument();
    expect(screen.getByLabelText("Current Status")).toHaveValue("CANCELLED");
  });

  it("shows safe feedback when a status update fails", async () => {
    vi.spyOn(api, "updateTicketStatus").mockRejectedValue(new Error("database password detail"));
    render(<App />);

    await userEvent.selectOptions(await screen.findByLabelText("Current Status"), "OPEN");
    await userEvent.click(screen.getByRole("button", { name: "Save Status" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to save Ticket changes.");
    expect(screen.queryByText(/database password detail/i)).not.toBeInTheDocument();
  });

  it("keeps Administrator formal workflow fields read-only", async () => {
    setUser(admin, "/admin/tickets/41");
    vi.spyOn(api, "getAdminTicket").mockResolvedValue(baseTicket);
    vi.spyOn(api, "getAssignableStaff").mockResolvedValue([]);
    vi.spyOn(api, "getPublicComments").mockResolvedValue([]);
    vi.spyOn(api, "getInternalNotes").mockResolvedValue([]);
    vi.spyOn(api, "getTicketActions").mockResolvedValue({ actions: [] });
    render(<App />);

    expect(await screen.findByRole("heading", { name: baseTicket.ticketNumber })).toBeInTheDocument();
    expect(screen.queryByLabelText("Current Status")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Status" })).not.toBeInTheDocument();
  });

  it("lets a Requester send advisory resolution feedback without formal status controls", async () => {
    setUser(requester, "/tickets/41");
    const mark = vi.spyOn(api, "markProblemResolved").mockResolvedValue({ ...requesterTicket, requesterMarkedResolved: true });
    vi.spyOn(api, "getTicket").mockImplementation(async () => mark.mock.calls.length ? { ...requesterTicket, requesterMarkedResolved: true } : requesterTicket);
    vi.spyOn(api, "getTicketActions").mockResolvedValue({ actions: [] });
    vi.spyOn(api, "getPublicComments").mockResolvedValue([]);
    const update = vi.spyOn(api, "updateTicketStatus");
    render(<App />);

    const indicationButton = await screen.findByRole("button", { name: "Problem Appears Resolved" });
    expect(screen.queryByLabelText("Current Status")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Status" })).not.toBeInTheDocument();
    await userEvent.click(indicationButton);
    expect(await screen.findByText(/IT Staff will formally resolve or close the Ticket/i)).toBeInTheDocument();
    expect(api.markProblemResolved).toHaveBeenCalledWith(baseTicket.id);
    expect(update).not.toHaveBeenCalled();
  });
});
