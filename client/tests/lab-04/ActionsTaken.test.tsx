import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionsTaken } from "../../src/components/ActionsTaken.js";
import * as api from "../../src/api.js";

const staff: api.StaffUser = { id: 7, name: "Narin Staff", email: "narin@example.edu", role: "IT_STAFF", isActive: true };
const action: api.ActionTaken = { id: 71, ticketId: 41, actionAt: "2026-10-04T02:00:00.000Z", description: "Review Wi-Fi access logs", result: null, performedBy: staff, assignee: staff, status: "PLANNED", followUpRequired: false, followUpNote: null, attachmentNotes: null, createdAt: "2026-10-04T02:00:00.000Z", updatedAt: "2026-10-04T02:00:00.000Z" };

afterEach(() => vi.restoreAllMocks());

describe("Actions Taken UI", () => {
  it("keeps Requester history read-only, including terminal records", async () => {
    vi.spyOn(api, "getTicketActions").mockResolvedValue({ actions: [{ ...action, status: "COMPLETED", result: "Logs reviewed." }] });
    render(<ActionsTaken ticketId={41} canManage={false} />);
    expect(await screen.findByText("Review Wi-Fi access logs")).toBeInTheDocument();
    expect(screen.getAllByText("Narin Staff")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /edit action|complete action|cancel action/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Record an Action" })).not.toBeInTheDocument();
  });

  it("creates Actions with the current Staff as default assignee and retains fields on recoverable errors", async () => {
    vi.spyOn(api, "getTicketActions").mockResolvedValue({ actions: [] });
    vi.spyOn(api, "getAssignableStaff").mockResolvedValue([staff]);
    const create = vi.spyOn(api, "createTicketAction").mockRejectedValue(new api.ApiError("Service unavailable.", 500));
    render(<ActionsTaken ticketId={41} canManage currentUserId={staff.id} />);
    await screen.findByRole("heading", { name: "Record an Action" });
    await userEvent.type(screen.getByLabelText("Description"), "Checked the network cable");
    expect(screen.getByLabelText("Assigned To")).toHaveValue("7");
    await userEvent.click(screen.getByRole("button", { name: "Record Action" }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(screen.getByLabelText("Description")).toHaveValue("Checked the network cable");
    expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable.");
  });
});
