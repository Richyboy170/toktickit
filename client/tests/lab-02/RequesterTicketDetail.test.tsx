import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const requester: api.DevelopmentRequester = { id: 1, name: "Ananda Kittisak", email: "ananda.k@example.edu" };
const active: api.AttachmentMetadata = { id: 7, originalName: "evidence.png", mimeType: "image/png", sizeBytes: 2048, uploadedAt: "2026-08-20T05:00:00.000Z", removedAt: null, removalReason: null, removedByRequesterId: null, available: true };
const removed: api.AttachmentMetadata = { id: 8, originalName: "old.pdf", mimeType: "application/pdf", sizeBytes: 1024, uploadedAt: "2026-08-20T04:00:00.000Z", removedAt: "2026-08-20T06:00:00.000Z", removalReason: "Outdated evidence", removedByRequesterId: 1, available: false };
const ticket: api.TicketDetail = { id: 41, ticketNumber: "TKT-20260820-A1B2C3D4", ticketDate: "2026-08-20T04:00:00.000Z", requester, category: { id: 1, name: "Hardware" }, relatedSystem: { id: 2, name: "Corporate Laptop" }, summary: "Laptop battery drains quickly", requestedPriority: "HIGH", description: "The battery falls from full to empty in under one hour.", currentStatus: "NEW", createdAt: "2026-08-20T04:00:00.000Z", updatedAt: "2026-08-20T05:00:00.000Z", attachments: [active, removed] };

beforeEach(() => {
  sessionStorage.setItem("toktickit.developmentRequester", JSON.stringify(requester));
  window.history.replaceState({}, "", "/tickets/41");
});

afterEach(() => vi.restoreAllMocks());

describe("Requester Ticket Detail", () => {
  it("loads an owned Ticket as read-only fields with active and removed Attachment states", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(ticket);
    render(<App />);
    expect(screen.getByRole("status")).toHaveTextContent(/loading ticket details/i);
    expect(await screen.findByRole("heading", { name: ticket.ticketNumber })).toBeInTheDocument();
    expect(screen.getAllByText(ticket.summary)[0]).toHaveAttribute("aria-readonly", "true");
    expect(screen.getByRole("button", { name: `Download ${active.originalName}` })).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.tagName === "SPAN" && element.textContent?.includes("Outdated evidence") === true)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `Download ${removed.originalName}` })).not.toBeInTheDocument();
  });

  it("uses a neutral not-found state for an unowned or missing Ticket", async () => {
    vi.spyOn(api, "getTicket").mockRejectedValue(new api.ApiError("Ticket not found.", 404, "RESOURCE_NOT_FOUND"));
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Ticket not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to My Tickets" })).toHaveAttribute("href", "/tickets");
  });

  it("retries a safe temporary detail failure", async () => {
    const get = vi.spyOn(api, "getTicket").mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(ticket);
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to load/i);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: ticket.ticketNumber })).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });
});
