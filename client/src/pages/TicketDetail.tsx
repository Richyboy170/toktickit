import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  addPublicComment,
  ApiError,
  AttachmentMetadata,
  getPublicComments,
  TicketDetail,
  downloadAttachment,
  getTicket,
  markProblemResolved,
  removeAttachment,
  uploadAttachment,
} from "../api.js";
import { useAuth } from "../auth-context.js";
import { validateSelectedFiles } from "../attachment-validation.js";
import { useRequester } from "../requester-context.js";

function displayDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function displaySize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function priorityLabel(value: string): string { return value.charAt(0) + value.slice(1).toLowerCase(); }

export function TicketDetailPage() {
  const { user } = useAuth();
  const { requester: legacyRequester } = useRequester();
  const requester = user?.role === "REQUESTER" ? user : legacyRequester;
  const { ticketId: rawTicketId } = useParams();
  const ticketId = Number(rawTicketId);
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error" | "not-found">("loading");

  async function load(background = false) {
    if (!requester || !Number.isSafeInteger(ticketId) || ticketId <= 0) { setState("not-found"); return; }
    if (!background) setState("loading");
    try {
      setTicket(await getTicket(user ? undefined : requester.id, ticketId));
      setState("ready");
    } catch (error) {
      setState(error instanceof ApiError && error.status === 404 ? "not-found" : "error");
    }
  }

  useEffect(() => { void load(); }, [requester?.id, user, ticketId]);

  if (state === "loading") return <section className="page-card"><p className="state-message" role="status">Loading Ticket details&hellip;</p></section>;
  if (state === "not-found") return <section className="page-card empty-state"><h1>Ticket not found</h1><p>The Ticket is unavailable or does not belong to the selected Requester.</p><Link className="button button--secondary button-link" to="/tickets">Back to My Tickets</Link></section>;
  if (state === "error") return <section className="page-card"><div className="state-message state-message--error" role="alert"><p>Unable to load the Ticket.</p><button className="button button--secondary" type="button" onClick={() => load()}>Retry</button></div></section>;
  if (!ticket || !requester) return null;

  return (
    <section className="page-card" aria-labelledby="ticket-detail-title">
      <Link className="back-link" to="/tickets">&larr; Back to My Tickets</Link>
      <div className="detail-heading"><div><p className="eyebrow">Requester Ticket Detail</p><h1 id="ticket-detail-title">{ticket.ticketNumber}</h1></div><span className="badge badge--status">{statusLabel(ticket.currentStatus)}</span></div>
      <dl className="detail-grid section-gap">
        <DetailField label="Ticket Date" value={displayDate(ticket.ticketDate)} />
        <DetailField label="Requester" value={`${ticket.requester.name} (${ticket.requester.email})`} />
        <DetailField label="Category" value={ticket.category.name} />
        <DetailField label="Related System" value={ticket.relatedSystem.name} />
        <DetailField label="Requested Priority" value={priorityLabel(ticket.requestedPriority)} />
        <DetailField label="Current Status" value={statusLabel(ticket.currentStatus)} />
        <DetailField label="Ticket Summary" value={ticket.summary} wide />
        <DetailField label="Description" value={ticket.description} wide multiline />
      </dl>
      {user?.role === "REQUESTER" && <RequesterResolution ticket={ticket} onChanged={() => load(true)} />}
      {user?.role === "REQUESTER" && <PublicComments ticketId={ticket.id} initialComments={ticket.publicComments ?? ticket.comments ?? []} />}
      <AttachmentSection requesterId={user ? undefined : requester.id} ticketId={ticket.id} attachments={ticket.attachments} onChanged={() => load(true)} />
    </section>
  );
}

function statusLabel(value: string): string {
  return value.split("_").map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(" ");
}

function commentText(comment: { body?: string; content?: string }): string {
  return comment.content ?? comment.body ?? "";
}

function authorName(author: { name?: string } | undefined): string {
  return author?.name ?? "TokTickIT user";
}

function RequesterResolution({ ticket, onChanged }: { ticket: TicketDetail; onChanged: () => Promise<void> | void }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const indicated = Boolean(ticket.problemAppearsResolved ?? ticket.requesterResolved ?? ticket.requesterMarkedResolved ?? ticket.requesterResolutionIndicatedAt);
  async function indicate() {
    setSaving(true); setMessage("");
    try {
      await markProblemResolved(ticket.id);
      setMessage("Your resolution indication was sent to IT Staff.");
      await onChanged();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to save the resolution indication.");
    } finally { setSaving(false); }
  }
  return <section className="ticket-resolution section-gap" aria-labelledby="resolution-title"><h2 id="resolution-title">Resolution</h2>{indicated ? <p className="notice notice--success" role="status">You indicated that this problem appears resolved. IT Staff will formally resolve or close the Ticket.</p> : <><p className="muted">If the reported problem is no longer present, let IT Staff know.</p><button className="button button--secondary" type="button" disabled={saving} onClick={() => void indicate()}>{saving ? "Saving…" : "Problem Appears Resolved"}</button></>}{message && !indicated && <p className="state-message state-message--error" role="alert">{message}</p>}</section>;
}

export function PublicComments({ ticketId, initialComments = [] }: { ticketId: number; initialComments?: import("../api.js").PublicComment[] }) {
  const { user } = useAuth();
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    void getPublicComments(ticketId).then(setComments).catch(() => {
      // The ticket payload can already contain comments; keep that data when
      // the optional collection request is unavailable.
    });
  }, [ticketId, user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = content.trim();
    if (!value) { setError("Comment cannot be empty."); return; }
    if (value.length > 2000) { setError("Comment must be 2000 characters or fewer."); return; }
    setSaving(true); setError("");
    try {
      const comment = await addPublicComment(ticketId, value);
      setComments((current) => [...current, comment]);
      setContent("");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Unable to post the Public Comment.");
    } finally { setSaving(false); }
  }

  return <section className="comments-section section-gap" aria-labelledby="public-comments-title"><h2 id="public-comments-title">Public Comments</h2><p className="muted">Visible to the Requester and IT Staff.</p>{comments.length === 0 ? <p className="empty-state">No Public Comments yet.</p> : <ol className="comment-list">{comments.map((comment) => <li key={comment.id}><div className="comment-meta"><strong>{authorName(comment.author)}</strong><time dateTime={comment.createdAt}>{displayDate(comment.createdAt)}</time></div><p>{commentText(comment)}</p></li>)}</ol>}{user?.role === "REQUESTER" && <form className="comment-form" onSubmit={submit}><label htmlFor="public-comment">Add Public Comment</label><textarea id="public-comment" value={content} maxLength={2000} onChange={(event) => { setContent(event.target.value); setError(""); }} aria-describedby={error ? "public-comment-error" : "public-comment-help"} /><small id="public-comment-help" className="muted">Up to 2000 characters</small>{error && <p className="field-error" id="public-comment-error" role="alert">{error}</p>}<button className="button button--primary section-gap" type="submit" disabled={saving}>{saving ? "Posting…" : "Post Public Comment"}</button></form>}</section>;
}

function DetailField({ label, value, wide = false, multiline = false }: { label: string; value: string; wide?: boolean; multiline?: boolean }) {
  return <div className={`detail-field${wide ? " detail-field--wide" : ""}`}><dt>{label}</dt><dd className={multiline ? "detail-field--multiline" : undefined} aria-readonly="true">{value}</dd></div>;
}

export function AttachmentSection({ requesterId, ticketId, attachments, onChanged, readOnly = false }: { requesterId?: number; ticketId: number; attachments: AttachmentMetadata[]; onChanged: () => Promise<void> | void; readOnly?: boolean }) {
  const activeCount = attachments.filter((item) => item.available).length;
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [preview, setPreview] = useState<{ id: number; url: string; name: string } | null>(null);
  const [removing, setRemoving] = useState<AttachmentMetadata | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [removeBusy, setRemoveBusy] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);
  useEffect(() => { if (removing) reasonRef.current?.focus(); }, [removing]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    const checked = validateSelectedFiles(files, activeCount);
    if (checked.errors.length) setMessage({ kind: "error", text: checked.errors.join(" ") });
    if (!checked.valid.length) return;
    setUploading(true);
    const failures: string[] = [];
    for (const file of checked.valid) {
      try { await uploadAttachment(requesterId, ticketId, file); }
      catch (error) { failures.push(error instanceof ApiError ? `${file.name}: ${error.message}` : `${file.name}: upload failed.`); }
    }
    setUploading(false);
    if (failures.length) setMessage({ kind: "error", text: failures.join(" ") });
    else setMessage({ kind: "success", text: checked.valid.length === 1 ? "Attachment uploaded." : `${checked.valid.length} Attachments uploaded.` });
    await onChanged();
  }

  async function fetchBlob(attachment: AttachmentMetadata): Promise<{ blob: Blob; url: string }> {
    const blob = await downloadAttachment(requesterId, attachment.id);
    return { blob, url: URL.createObjectURL(blob) };
  }

  async function previewAttachment(attachment: AttachmentMetadata) {
    setMessage(null);
    try {
      const { url } = await fetchBlob(attachment);
      if (attachment.mimeType === "application/pdf") {
        window.open(url, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else {
        if (preview) URL.revokeObjectURL(preview.url);
        setPreview({ id: attachment.id, url, name: attachment.originalName });
      }
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof ApiError ? error.message : "Unable to preview the Attachment." });
    }
  }

  async function download(attachment: AttachmentMetadata) {
    setMessage(null);
    try {
      const { url } = await fetchBlob(attachment);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = attachment.originalName; document.body.append(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof ApiError ? error.message : "Unable to download the Attachment." });
    }
  }

  function askToRemove(attachment: AttachmentMetadata, trigger: HTMLElement) {
    returnFocusRef.current = trigger;
    setRemoving(attachment); setReason(""); setReasonError(""); setMessage(null);
  }

  function closeRemoval() {
    setRemoving(null); setReason(""); setReasonError("");
    window.setTimeout(() => returnFocusRef.current?.focus(), 0);
  }

  async function confirmRemoval(event: FormEvent) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 3 || trimmed.length > 200) { setReasonError("Removal reason must be 3-200 characters."); return; }
    if (!removing) return;
    setRemoveBusy(true);
    try {
      await removeAttachment(requesterId, removing.id, trimmed);
      if (preview?.id === removing.id) setPreview(null);
      closeRemoval();
      setMessage({ kind: "success", text: `${removing.originalName} was removed.` });
      await onChanged();
    } catch (error) {
      setReasonError(error instanceof ApiError ? error.message : "Unable to remove the Attachment.");
    } finally { setRemoveBusy(false); }
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !removeBusy) { event.preventDefault(); closeRemoval(); return; }
    if (event.key !== "Tab") return;
    const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("textarea, button:not(:disabled)") ?? []);
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  return (
    <section className="attachments-section section-gap" aria-labelledby="attachments-title">
      <div className="attachment-heading"><div><h2 id="attachments-title">Attachments</h2><p className="muted">{activeCount} of 5 active Attachments</p></div>{!readOnly && <label className={`button button--secondary button-link${uploading || activeCount >= 5 ? " button--disabled" : ""}`}>Add Attachment<input className="sr-only" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" multiple disabled={uploading || activeCount >= 5} onChange={handleUpload} /></label>}</div>
      <p className="muted attachment-guidance">JPG, PNG, WEBP, or PDF; 5 MB each; maximum five active files.{readOnly ? " Attachments are read-only for this role." : ""}</p>
      {uploading && <p className="state-message" role="status">Uploading Attachment&hellip;</p>}
      {message && <p className={message.kind === "error" ? "state-message state-message--error" : "notice notice--success"} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p>}
      {attachments.length === 0 && !uploading && <div className="empty-state"><h3>No Attachments</h3><p>{readOnly ? "No Attachments are available for this Ticket." : "Add evidence such as a screenshot or PDF."}</p></div>}
      {attachments.length > 0 && <ul className="attachment-list">{attachments.map((attachment) => <li className={`attachment-row${attachment.available ? "" : " attachment-row--removed"}`} key={attachment.id}><div className="attachment-row__main"><strong>{attachment.originalName}</strong><span className="muted">{attachment.mimeType} &middot; {displaySize(attachment.sizeBytes)} &middot; {displayDate(attachment.uploadedAt)}</span>{!attachment.available && <span><span className="badge badge--removed">Removed</span> {attachment.removedAt && displayDate(attachment.removedAt)} &mdash; {attachment.removalReason}</span>}</div>{attachment.available && <div className="attachment-actions"><button className="button button--tertiary button--compact" type="button" onClick={() => previewAttachment(attachment)}>Preview {attachment.originalName}</button><button className="button button--tertiary button--compact" type="button" onClick={() => download(attachment)}>Download {attachment.originalName}</button>{!readOnly && <button className="button button--danger button--compact" type="button" onClick={(event) => askToRemove(attachment, event.currentTarget)}>Remove {attachment.originalName}</button>}</div>}</li>)}</ul>}
      {preview && <figure className="attachment-preview"><img src={preview.url} alt={`Preview of ${preview.name}`} /><figcaption>{preview.name}</figcaption><button type="button" className="button button--tertiary" onClick={() => setPreview(null)}>Close preview</button></figure>}
      {removing && <div className="dialog-backdrop"><div ref={dialogRef} className="removal-dialog" role="dialog" aria-modal="true" aria-labelledby="removal-title" aria-describedby="removal-description" onKeyDown={handleDialogKeyDown}><h3 id="removal-title">Remove Attachment</h3><p id="removal-description">Remove <strong>{removing.originalName}</strong>? Its metadata and reason will remain visible.</p><form onSubmit={confirmRemoval}><label htmlFor="removal-reason">Removal reason <span className="required" aria-hidden="true">*</span></label><textarea ref={reasonRef} id="removal-reason" value={reason} maxLength={200} onChange={(event) => { setReason(event.target.value); setReasonError(""); }} aria-invalid={!!reasonError} aria-describedby={reasonError ? "removal-error" : "removal-help"} /><small id="removal-help" className="muted">3-200 characters</small>{reasonError && <p className="field-error" id="removal-error" role="alert">{reasonError}</p>}<div className="action-row section-gap"><button className="button button--secondary" type="button" disabled={removeBusy} onClick={closeRemoval}>Cancel</button><button className="button button--danger" type="submit" disabled={removeBusy}>{removeBusy ? "Removing Attachment…" : "Confirm Removal"}</button></div></form></div></div>}
    </section>
  );
}
