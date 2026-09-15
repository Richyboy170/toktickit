import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const staff: api.AuthUser = { id: 7, name: "Narin Staff", email: "narin@example.edu", role: "IT_STAFF", isActive: true, mustChangePassword: false };
const ticket: api.StaffTicketDetail = { id: 41, ticketNumber: "TKT-20260915-A1B2C3D4", ticketDate: "2026-09-15T04:00:00.000Z", summary: "Campus laptop cannot connect", category: { id: 1, name: "Hardware" }, relatedSystem: { id: 2, name: "Corporate Laptop" }, requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "NEW", description: "The laptop fails to join Wi-Fi.", requester: { id: 2, name: "Ananda Requester", email: "ananda@example.edu" }, owner: null, attachments: [], createdAt: "2026-09-15T04:00:00.000Z", updatedAt: "2026-09-15T05:00:00.000Z", publicComments: [], internalNotes: [] };

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem("toktickit.authUser", JSON.stringify(staff));
  window.history.replaceState({}, "", "/staff/tickets/41");
  vi.spyOn(api, "getCurrentUser").mockResolvedValue(staff);
  vi.spyOn(api, "getStaffTicket").mockResolvedValue(ticket);
  vi.spyOn(api, "getAssignableStaff").mockResolvedValue([staff]);
  vi.spyOn(api, "getPublicComments").mockResolvedValue([]);
  vi.spyOn(api, "getInternalNotes").mockResolvedValue([]);
});

afterEach(() => vi.restoreAllMocks());

describe("IT Staff Ticket Detail", () => {
  it("offers claim, IT Priority, status, Public Comments, Internal Notes, and Attachments", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { name: ticket.ticketNumber })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Claim Ticket" })).toBeInTheDocument();
    expect(screen.getByLabelText("IT Priority")).toBeInTheDocument();
    expect(screen.getByLabelText("Current Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Add Public Comment")).toBeInTheDocument();
    expect(screen.getByLabelText("Add Internal Note")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Attachments" })).toBeInTheDocument();
  });

  it("validates blank communication entries", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: ticket.ticketNumber });
    await userEvent.click(screen.getByRole("button", { name: "Post Public Comment" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/public comment cannot be empty/i);
  });

  it("offers only valid next statuses and confirms consequential transitions", async () => {
    const update = vi.spyOn(api, "updateTicketStatus").mockResolvedValue({ ...ticket, currentStatus: "CANCELLED" });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<App />);

    const select = await screen.findByLabelText("Current Status");
    expect(within(select).getByRole("option", { name: "New" })).toBeInTheDocument();
    expect(within(select).getByRole("option", { name: "Open" })).toBeInTheDocument();
    expect(within(select).getByRole("option", { name: "Cancelled" })).toBeInTheDocument();
    expect(within(select).queryByRole("option", { name: "Resolved" })).not.toBeInTheDocument();

    await userEvent.selectOptions(select, "CANCELLED");
    await userEvent.click(screen.getByRole("button", { name: "Save Status" }));
    expect(confirm).toHaveBeenCalledWith("Change Ticket status to Cancelled?");
    expect(update).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await userEvent.selectOptions(select, "CANCELLED");
    await userEvent.click(screen.getByRole("button", { name: "Save Status" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(41, "CANCELLED", true));
  });
});
