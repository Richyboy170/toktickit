import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const requester: api.AuthUser = { id: 9, name: "Narin Requester", email: "narin@example.edu", role: "REQUESTER" };
const ticket: api.RequesterDashboardData["recentlyUpdated"][number] = { id: 41, ticketNumber: "TKT-20261004-A1B2C3D4", summary: "Campus Wi-Fi reconnects", currentStatus: "OPEN", updatedAt: "2026-10-04T03:00:00.000Z" };

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem("toktickit.authUser", JSON.stringify(requester));
  window.history.replaceState({}, "", "/dashboard");
  vi.spyOn(api, "getCurrentUser").mockResolvedValue(requester);
});
afterEach(() => vi.restoreAllMocks());

describe("Requester Dashboard", () => {
  it("shows owned metrics, recent Tickets, and exact drill-down links", async () => {
    vi.spyOn(api, "getRequesterDashboard").mockResolvedValue({ windowStart: "2026-09-27T03:00:00.000Z", metrics: { openTickets: 2, waitingForMe: 1 }, recentlyUpdated: [ticket], recentlyResolved: [] });
    render(<App />);
    await screen.findByRole("heading", { name: "Recently Updated" });
    expect(screen.getByRole("heading", { name: "Requester Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open tickets/i })).toHaveAttribute("href", "/tickets?statusGroup=open");
    expect(screen.getByRole("link", { name: /waiting for me/i })).toHaveAttribute("href", "/tickets?status=WAITING_FOR_REQUESTER");
    expect(screen.getByRole("link", { name: new RegExp(ticket.ticketNumber) })).toHaveAttribute("href", "/tickets/41");
    expect(screen.getByText(/no requests were resolved/i)).toBeInTheDocument();
  });

  it("shows a retry path for safe API failures", async () => {
    const get = vi.spyOn(api, "getRequesterDashboard").mockRejectedValueOnce(new Error("database details")).mockResolvedValue({ windowStart: "", metrics: { openTickets: 0, waitingForMe: 0 }, recentlyUpdated: [], recentlyResolved: [] });
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t load your dashboard/i);
    await userEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByText(/no tickets have been updated/i)).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });
});
