import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AttachmentSection } from "../../src/pages/TicketDetail.js";
import * as api from "../../src/api.js";

const active: api.AttachmentMetadata = { id: 7, originalName: "evidence.png", mimeType: "image/png", sizeBytes: 2048, uploadedAt: "2026-08-20T05:00:00.000Z", removedAt: null, removalReason: null, removedByRequesterId: null, available: true };
const removed: api.AttachmentMetadata = { id: 8, originalName: "old.pdf", mimeType: "application/pdf", sizeBytes: 1024, uploadedAt: "2026-08-20T04:00:00.000Z", removedAt: "2026-08-20T06:00:00.000Z", removalReason: "Outdated evidence", removedByRequesterId: 1, available: false };

beforeEach(() => {
  vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:test-preview"), revokeObjectURL: vi.fn() });
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Attachment Section", () => {
  it("validates selection, uploads valid files, and refreshes detail", async () => {
    const upload = vi.spyOn(api, "uploadAttachment").mockResolvedValue({ attachment: active });
    const changed = vi.fn();
    render(<AttachmentSection requesterId={1} ticketId={41} attachments={[]} onChanged={changed} />);
    const invalid = new File(["unsafe"], "unsafe.exe", { type: "application/octet-stream" });
    await userEvent.upload(screen.getByLabelText("Add Attachment"), invalid, { applyAccept: false });
    expect(screen.getByRole("alert")).toHaveTextContent(/use JPG, PNG, WEBP, or PDF/i);
    expect(upload).not.toHaveBeenCalled();

    const valid = new File([new Uint8Array([0x89, 0x50])], "evidence.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("Add Attachment"), valid);
    await waitFor(() => expect(upload).toHaveBeenCalledWith(1, 41, valid));
    expect(await screen.findByRole("status")).toHaveTextContent("Attachment uploaded.");
    expect(changed).toHaveBeenCalled();
  });

  it("requires confirmation and a valid reason before soft removal", async () => {
    const remove = vi.spyOn(api, "removeAttachment").mockResolvedValue({ attachment: { ...active, available: false, removedAt: "2026-08-20T06:00:00.000Z", removalReason: "Outdated screenshot", removedByRequesterId: 1 } });
    const changed = vi.fn();
    render(<AttachmentSection requesterId={1} ticketId={41} attachments={[active, removed]} onChanged={changed} />);
    await userEvent.click(screen.getByRole("button", { name: `Remove ${active.originalName}` }));
    expect(screen.getByRole("dialog", { name: "Remove Attachment" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Confirm Removal" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/3-200 characters/i);
    expect(remove).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText(/removal reason/i), "Outdated screenshot");
    await userEvent.click(screen.getByRole("button", { name: "Confirm Removal" }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith(1, 7, "Outdated screenshot"));
    expect(changed).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: `Remove ${removed.originalName}` })).not.toBeInTheDocument();
  });

  it("previews owned image bytes and reports safe download failures", async () => {
    vi.spyOn(api, "downloadAttachment").mockResolvedValueOnce(new Blob(["image"], { type: "image/png" })).mockRejectedValueOnce(new api.ApiError("This Attachment is no longer available.", 410));
    render(<AttachmentSection requesterId={1} ticketId={41} attachments={[active]} onChanged={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: `Preview ${active.originalName}` }));
    expect(await screen.findByRole("img", { name: `Preview of ${active.originalName}` })).toHaveAttribute("src", "blob:test-preview");
    await userEvent.click(screen.getByRole("button", { name: `Download ${active.originalName}` }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/no longer available/i);
  });

  it("disables adding when five active files already exist", () => {
    const five = Array.from({ length: 5 }, (_, index) => ({ ...active, id: index + 1, originalName: `evidence-${index}.png` }));
    render(<AttachmentSection requesterId={1} ticketId={41} attachments={five} onChanged={vi.fn()} />);
    expect(screen.getByLabelText("Add Attachment")).toBeDisabled();
    expect(screen.getByText("5 of 5 active Attachments")).toBeInTheDocument();
  });
});
