import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const staff: api.AuthUser = { id: 7, name: "Narin Staff", email: "narin@example.edu", role: "IT_STAFF" };
const data: api.StaffDashboardData = {
  windowStart: "2026-09-27T03:00:00.000Z",
  metrics: { unassignedOpenTickets: 3, myOpenTickets: 2, highUrgentOpenTickets: 1, myActiveActions: 1 },
  ticketsByStatus: { NEW: 1, OPEN: 2, IN_PROGRESS: 0, WAITING_FOR_REQUESTER: 0, RESOLVED: 0, CLOSED: 0, REOPENED: 0, CANCELLED: 0 },
  urgentTickets: [{ id: 41, ticketNumber: "TKT-20261004-A1B2C3D4", summary: "Campus Wi-Fi reconnects", currentStatus: "OPEN", itPriority: "URGENT", updatedAt: "2026-10-04T03:00:00.000Z" }],
  myActiveActions: [{ id: 71, ticketId: 41, ticket: { ticketNumber: "TKT-20261004-A1B2C3D4", summary: "Campus Wi-Fi reconnects" }, actionAt: "2026-10-04T02:00:00.000Z", description: "Check the access point logs", status: "IN_PROGRESS" }],
};
const emptyData: api.StaffDashboardData = {
  ...data,
  metrics: { unassignedOpenTickets: 0, myOpenTickets: 0, highUrgentOpenTickets: 0, myActiveActions: 0 },
  ticketsByStatus: { NEW: 0, OPEN: 0, IN_PROGRESS: 0, WAITING_FOR_REQUESTER: 0, RESOLVED: 0, CLOSED: 0, REOPENED: 0, CANCELLED: 0 },
  urgentTickets: [],
  myActiveActions: [],
};

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem("toktickit.authUser", JSON.stringify(staff));
  window.history.replaceState({}, "", "/dashboard");
  vi.spyOn(api, "getCurrentUser").mockResolvedValue(staff);
  vi.spyOn(api, "getStaffDashboard").mockResolvedValue(data);
});
afterEach(() => vi.restoreAllMocks());

describe("Staff Dashboard", () => {
  it("shows metrics, all statuses, urgent Tickets, and assigned Action links", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Tickets by Status" });
    expect(screen.getByRole("heading", { name: "Staff Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /unassigned open tickets/i })).toHaveAttribute("href", "/staff/tickets?assignment=unassigned&statusGroup=open");
    expect(screen.getByRole("link", { name: /my open tickets/i })).toHaveAttribute("href", "/staff/tickets?ownerId=7&statusGroup=open");
    expect(screen.getByRole("link", { name: /high\/urgent open tickets/i })).toHaveAttribute("href", "/staff/tickets?priorityGroup=high-or-urgent&statusGroup=open");
    expect(screen.getByRole("link", { name: /my active actions/i })).toHaveAttribute("href", "/dashboard#my-active-actions");
    expect(screen.getByRole("link", { name: /new: 1 ticket/i })).toHaveAttribute("href", "/staff/tickets?status=NEW");
    expect(screen.getByRole("link", { name: /cancelled: 0 tickets/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /tkt-20261004-a1b2c3d4.*check the access point logs/i })).toHaveAttribute("href", "/staff/tickets/41#actions-taken");
  });

  it("shows zero counts and clear empty states when no urgent work or Actions match", async () => {
    vi.spyOn(api, "getStaffDashboard").mockResolvedValue(emptyData);
    render(<App />);
    await screen.findByRole("heading", { name: "Tickets by Status" });
    expect(screen.getByRole("link", { name: /new: 0 tickets/i })).toBeInTheDocument();
    expect(screen.getByText("No open high or urgent Tickets.")).toBeInTheDocument();
    expect(screen.getByText("No active Actions are assigned to you.")).toBeInTheDocument();
  });

  it("shows a safe failure and retries without exposing backend details", async () => {
    const get = vi.spyOn(api, "getStaffDashboard")
      .mockRejectedValueOnce(new api.ApiError("database password details", 500))
      .mockResolvedValue(data);
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn’t load operations data.");
    expect(screen.queryByText(/database password details/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByRole("heading", { name: "Tickets by Status" });
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("shows a forbidden state without a retry action", async () => {
    vi.spyOn(api, "getStaffDashboard").mockRejectedValue(new api.ApiError("Forbidden", 403));
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent("This dashboard is only available to IT Staff and Administrators.");
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("announces loading while dashboard data is pending", async () => {
    vi.spyOn(api, "getStaffDashboard").mockReturnValue(new Promise(() => {}));
    render(<App />);
    expect(await screen.findByRole("status")).toHaveTextContent("Loading operations data…");
  });
});
