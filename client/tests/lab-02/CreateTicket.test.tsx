import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const requester: api.DevelopmentRequester = { id: 1, name: "Ananda Kittisak", email: "ananda.k@example.edu" };
const categories = [{ id: 1, name: "Hardware" }];
const systems = [{ id: 2, name: "Corporate Laptop" }];
const ticket: api.Ticket = {
  id: 41,
  ticketNumber: "TKT-20260820-A1B2C3D4",
  ticketDate: "2026-08-20T04:00:00.000Z",
  requester,
  category: categories[0],
  relatedSystem: systems[0],
  summary: "Laptop battery drains quickly",
  requestedPriority: "MEDIUM",
  description: "The battery falls from full to empty in under one hour.",
  currentStatus: "NEW",
  createdAt: "2026-08-20T04:00:00.000Z",
  updatedAt: "2026-08-20T04:00:00.000Z",
};

beforeEach(() => {
  sessionStorage.setItem("toktickit.developmentRequester", JSON.stringify(requester));
  window.history.replaceState({}, "", "/tickets/new");
  vi.spyOn(api, "getCategories").mockResolvedValue(categories);
  vi.spyOn(api, "getRelatedSystems").mockResolvedValue(systems);
});

afterEach(() => vi.restoreAllMocks());

async function fillValidForm() {
  await userEvent.selectOptions(await screen.findByLabelText(/category/i), "1");
  await userEvent.selectOptions(screen.getByLabelText(/related system/i), "2");
  await userEvent.selectOptions(screen.getByLabelText(/requested priority/i), "MEDIUM");
  await userEvent.type(screen.getByLabelText(/ticket summary/i), ticket.summary);
  await userEvent.type(screen.getByLabelText(/description/i), ticket.description);
}

describe("Create Ticket", () => {
  it("loads database references and displays generated fields as read-only", async () => {
    render(<App />);
    expect(screen.getByRole("status")).toHaveTextContent(/loading categories/i);
    expect(await screen.findByRole("option", { name: "Hardware" })).toBeInTheDocument();
    expect(screen.getByText("Generated after submission")).toHaveAttribute("aria-readonly", "true");
    expect(screen.getAllByText("Ananda Kittisak")).toHaveLength(2);
  });

  it("shows field-level validation and does not call the API", async () => {
    const create = vi.spyOn(api, "createTicket");
    render(<App />);
    await screen.findByRole("option", { name: "Hardware" });
    await userEvent.click(screen.getByRole("button", { name: /submit ticket/i }));
    expect(screen.getByText("Select a Category.")).toBeInTheDocument();
    expect(screen.getByText("Summary must be 5-120 characters.")).toBeInTheDocument();
    expect(screen.getByText("Description must be 10-5000 characters.")).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it("disables submission while busy and displays the backend Ticket Number", async () => {
    let resolve!: (value: { ticket: api.Ticket; replayed: boolean }) => void;
    vi.spyOn(api, "createTicket").mockReturnValue(new Promise((done) => { resolve = done; }));
    vi.spyOn(api, "uploadAttachment").mockResolvedValue({ attachment: {
      id: 1, originalName: "evidence.jpg", mimeType: "image/jpeg", sizeBytes: 3,
      uploadedAt: ticket.createdAt, removedAt: null, removalReason: null,
      removedByRequesterId: null, available: true,
    } });
    render(<App />);
    await fillValidForm();
    await userEvent.click(screen.getByRole("button", { name: /submit ticket/i }));
    expect(screen.getByRole("button", { name: /submitting ticket/i })).toBeDisabled();
    resolve({ ticket, replayed: false });
    expect(await screen.findByRole("heading", { name: ticket.ticketNumber })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view ticket/i })).toHaveAttribute("href", "/tickets/41");
  });

  it("preserves entered values after a safe API failure", async () => {
    vi.spyOn(api, "createTicket").mockRejectedValue(new api.ApiError("Unable to create the Ticket. Please try again.", 500));
    render(<App />);
    await fillValidForm();
    await userEvent.click(screen.getByRole("button", { name: /submit ticket/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to create/i);
    expect(screen.getByLabelText(/ticket summary/i)).toHaveValue(ticket.summary);
    expect(screen.getByLabelText(/description/i)).toHaveValue(ticket.description);
  });

  it("keeps valid files, rejects invalid files, and reports partial upload failure", async () => {
    vi.spyOn(api, "createTicket").mockResolvedValue({ ticket, replayed: false });
    vi.spyOn(api, "uploadAttachment").mockRejectedValue(new Error("upload unavailable"));
    render(<App />);
    await fillValidForm();
    const valid = new File([new Uint8Array([0xff, 0xd8, 0xff])], "evidence.jpg", { type: "image/jpeg" });
    const invalid = new File(["script"], "unsafe.exe", { type: "application/octet-stream" });
    await userEvent.upload(screen.getByLabelText(/attachments/i), [valid, invalid], { applyAccept: false });
    expect(screen.getByText(/unsafe.exe: use JPG/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove evidence.jpg" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /submit ticket/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/evidence.jpg/);
    expect(screen.getByRole("heading", { name: ticket.ticketNumber })).toBeInTheDocument();
  });
});
