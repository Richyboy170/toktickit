import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { addInternalNote, addPublicComment, ApiError, AuthUser, claimTicket, getAdminTicket, getAssignableStaff, getInternalNotes, getPublicComments, getStaffTicket, InternalNote, PublicComment, StaffTicketDetail as TicketType, StaffUser, TicketStatus, updateTicketPriority, updateTicketStatus, assignTicket, RequestedPriority } from "../api.js";
import { useAuth } from "../auth-context.js";
import { AttachmentSection } from "./TicketDetail.js";

const NEXT_STATUSES: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  CANCELLED: [],
};
const CONSEQUENTIAL_STATUSES = new Set<TicketStatus>(["CANCELLED", "RESOLVED", "CLOSED", "REOPENED"]);
const PRIORITIES: RequestedPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function label(value: string): string {
  return value.split("_").map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(" ");
}

function displayDate(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "—" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function unwrapTicket(value: TicketType | { ticket: TicketType } | undefined): TicketType | undefined {
  if (!value) return undefined;
  return "ticket" in value ? value.ticket : value;
}

function ownerOf(ticket: TicketType): StaffUser | null {
  return ticket.ticketOwner ?? ticket.assignedTo ?? ticket.owner ?? null;
}

function textOf(item: { content?: string; body?: string }): string {
  return item.content ?? item.body ?? "";
}

export function StaffTicketDetail() {
  const { user } = useAuth();
  const { ticketId: rawTicketId } = useParams();
  const ticketId = Number(rawTicketId);
  const [ticket, setTicket] = useState<TicketType | null>(null);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [selectedOwner, setSelectedOwner] = useState("");
  const [itPriority, setItPriority] = useState<RequestedPriority>("MEDIUM");
  const [status, setStatus] = useState<TicketStatus>("NEW");
  const [state, setState] = useState<"loading" | "ready" | "error" | "not-found">("loading");
  const [saving, setSaving] = useState<"claim" | "assign" | "priority" | "status" | "" >("");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = async () => {
    if (!Number.isSafeInteger(ticketId) || ticketId <= 0) { setState("not-found"); return; }
    setState("loading");
    try {
      const loaded = user?.role === "ADMINISTRATOR" ? await getAdminTicket(ticketId) : await getStaffTicket(ticketId);
      setTicket(loaded);
      const owner = ownerOf(loaded);
      setSelectedOwner(owner ? String(owner.id) : "");
      setItPriority(loaded.itPriority ?? loaded.requestedPriority);
      setStatus(loaded.currentStatus);
      setState("ready");
    } catch (error) {
      setState(error instanceof ApiError && error.status === 404 ? "not-found" : "error");
    }
    if (user?.role === "ADMINISTRATOR") {
      setStaff([]);
      return;
    }
    try {
      setStaff(await getAssignableStaff());
    } catch {
      // The owner selector remains useful with the current owner even if the
      // optional staff directory is unavailable.
    }
  };

  useEffect(() => { void load(); }, [ticketId, user?.role]);

  async function runSave(kind: "claim" | "assign" | "priority" | "status", operation: () => Promise<unknown>, successText: string) {
    setSaving(kind); setMessage(null);
    try {
      const result = await operation();
      const updated = unwrapTicket(result as TicketType | { ticket: TicketType } | undefined);
      if (updated) {
        setTicket(updated);
        const owner = ownerOf(updated);
        setSelectedOwner(owner ? String(owner.id) : "");
        setItPriority(updated.itPriority ?? updated.requestedPriority);
        setStatus(updated.currentStatus);
      } else {
        await load();
      }
      setMessage({ kind: "success", text: successText });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof ApiError ? error.message : "Unable to save Ticket changes." });
    } finally { setSaving(""); }
  }

  if (state === "loading") return <section className="page-card"><p className="state-message" role="status">Loading Ticket details…</p></section>;
  if (state === "not-found") return <section className="page-card empty-state"><h1>Ticket not found</h1><p>The Ticket is unavailable or cannot be used from the Staff Queue.</p><Link className="button button--secondary button-link" to={user?.role === "ADMINISTRATOR" ? "/users" : "/staff/tickets"}>Back to {user?.role === "ADMINISTRATOR" ? "User Management" : "Ticket Queue"}</Link></section>;
  if (state === "error" || !ticket) return <section className="page-card"><div className="state-message state-message--error" role="alert"><p>Unable to load the Ticket.</p><button className="button button--secondary" type="button" onClick={() => void load()}>Retry</button></div></section>;

  const loadedTicket = ticket;
  const owner = ownerOf(loadedTicket);
  const requester = loadedTicket.requester;
  const isAdministrator = user?.role === "ADMINISTRATOR";
  const validNextStatuses = NEXT_STATUSES[loadedTicket.currentStatus] ?? [];
  const statusOptions = [loadedTicket.currentStatus, ...validNextStatuses];

  function saveStatus() {
    if (status === loadedTicket.currentStatus) return;
    if (!validNextStatuses.includes(status)) {
      setStatus(loadedTicket.currentStatus);
      return;
    }
    const needsConfirmation = CONSEQUENTIAL_STATUSES.has(status);
    if (needsConfirmation && !window.confirm(`Change Ticket status to ${label(status)}?`)) {
      setStatus(loadedTicket.currentStatus);
      return;
    }
    void runSave("status", () => updateTicketStatus(loadedTicket.id, status, needsConfirmation), "Ticket status updated.");
  }
  return <section className="page-card staff-ticket-detail" aria-labelledby="staff-ticket-detail-title">
    <Link className="back-link" to={isAdministrator ? "/users" : "/staff/tickets"}>&larr; Back to {isAdministrator ? "User Management" : "Ticket Queue"}</Link>
    <div className="detail-heading"><div><p className="eyebrow">{isAdministrator ? "Administrator Ticket Detail" : "IT Staff Ticket Detail"}</p><h1 id="staff-ticket-detail-title">{ticket.ticketNumber}</h1></div><span className="badge badge--status">{label(ticket.currentStatus)}</span></div>
    {isAdministrator && <p className="notice section-gap" role="status">Ticket information is read-only for Administrators. IT Priority remains available for operational review.</p>}
    {message && <p className={message.kind === "error" ? "state-message state-message--error" : "notice notice--success"} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p>}
    <dl className="detail-grid section-gap">
      <DetailField label="Ticket Date" value={displayDate(ticket.ticketDate)} />
      <DetailField label="Requester" value={`${requester.name} (${requester.email})`} />
      <DetailField label="Category" value={ticket.category.name} />
      <DetailField label="Related System" value={ticket.relatedSystem.name} />
      <DetailField label="Requested Priority" value={label(ticket.requestedPriority)} />
      <DetailField label="Current Status" value={label(ticket.currentStatus)} />
      <DetailField label="Ticket Owner" value={owner?.name ?? "Unassigned"} />
      <DetailField label="Last Updated" value={displayDate(ticket.updatedAt)} />
      <DetailField label="Ticket Summary" value={ticket.summary} wide />
      <DetailField label="Description" value={ticket.description} wide multiline />
    </dl>
    <section className="operation-panel section-gap" aria-labelledby="ticket-operations-title">
      <h2 id="ticket-operations-title">Ticket Operations</h2>
      <div className={`form-grid ${isAdministrator ? "form-grid--one" : "form-grid--three"}`}>
        {!isAdministrator && <div className="field"><label htmlFor="ticket-owner">Ticket Owner</label><select id="ticket-owner" value={selectedOwner} onChange={(event) => setSelectedOwner(event.target.value)}><option value="">Unassigned</option>{owner && !staff.some((item) => item.id === owner.id) && <option value={owner.id}>{owner.name}</option>}{staff.filter((item) => item.isActive !== false).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="button button--secondary section-gap-small" type="button" disabled={Boolean(saving) || Boolean(owner && selectedOwner === String(owner.id))} onClick={() => void runSave("assign", () => assignTicket(ticket.id, selectedOwner ? Number(selectedOwner) : null), selectedOwner ? "Ticket reassigned." : "Ticket is now unassigned.")}>{saving === "assign" ? "Saving…" : owner ? "Reassign Ticket" : "Assign Ticket"}</button></div>}
        <div className="field"><label htmlFor="it-priority">IT Priority</label><select id="it-priority" value={itPriority} onChange={(event) => setItPriority(event.target.value as RequestedPriority)}>{PRIORITIES.map((priority) => <option key={priority} value={priority}>{label(priority)}</option>)}</select><button className="button button--secondary section-gap-small" type="button" disabled={Boolean(saving) || itPriority === (ticket.itPriority ?? ticket.requestedPriority)} onClick={() => void runSave("priority", () => updateTicketPriority(ticket.id, itPriority, user?.role), "IT Priority updated.")}>{saving === "priority" ? "Saving…" : "Save IT Priority"}</button></div>
        {!isAdministrator && <div className="field"><label htmlFor="ticket-status">Current Status</label><select id="ticket-status" value={status} disabled={statusOptions.length <= 1} onChange={(event) => setStatus(event.target.value as TicketStatus)}>{statusOptions.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><button className="button button--primary section-gap-small" type="button" disabled={Boolean(saving) || status === ticket.currentStatus || validNextStatuses.length === 0} onClick={saveStatus}>{saving === "status" ? "Saving…" : "Save Status"}</button></div>}
      </div>
      {!isAdministrator && !owner && <button className="button button--primary section-gap" type="button" disabled={Boolean(saving)} onClick={() => void runSave("claim", () => claimTicket(ticket.id), "Ticket claimed by you.")}>{saving === "claim" ? "Claiming…" : "Claim Ticket"}</button>}
      {Boolean(ticket.problemAppearsResolved ?? ticket.requesterResolved ?? ticket.requesterMarkedResolved ?? ticket.requesterResolutionIndicatedAt ?? ticket.requesterResolvedAt) && <p className="notice notice--warning section-gap" role="status">The Requester indicated that this problem appears resolved. IT Staff must still formally resolve or close the Ticket.</p>}
    </section>
    <StaffComments ticketId={ticket.id} initialComments={ticket.publicComments ?? ticket.comments ?? []} initialNotes={ticket.internalNotes ?? ticket.notes ?? []} currentUser={user} canPost={!isAdministrator} />
    <AttachmentSection requesterId={undefined} ticketId={ticket.id} attachments={ticket.attachments ?? []} onChanged={() => load()} readOnly />
  </section>;
}

function DetailField({ label: text, value, wide = false, multiline = false }: { label: string; value: string; wide?: boolean; multiline?: boolean }) {
  return <div className={`detail-field${wide ? " detail-field--wide" : ""}`}><dt>{text}</dt><dd className={multiline ? "detail-field--multiline" : undefined} aria-readonly="true">{value}</dd></div>;
}

function StaffComments({ ticketId, initialComments, initialNotes, currentUser, canPost = true }: { ticketId: number; initialComments: PublicComment[]; initialNotes: InternalNote[]; currentUser: AuthUser | null; canPost?: boolean }) {
  const [comments, setComments] = useState(initialComments)
  const [notes, setNotes] = useState(initialNotes)
  const [comment, setComment] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState<"comment" | "note" | "">("")

  useEffect(() => {
    void getPublicComments(ticketId).then(setComments).catch(() => undefined)
    void getInternalNotes(ticketId).then(setNotes).catch(() => undefined)
  }, [ticketId])

  async function post(kind: "comment" | "note", event: FormEvent) {
    event.preventDefault()
    const value = (kind === "comment" ? comment : note).trim()
    if (!value) { setError(kind === "comment" ? "Public Comment cannot be empty." : "Internal Note cannot be empty."); return }
    if (value.length > 2000) { setError("Entries must be 2000 characters or fewer."); return }
    setSaving(kind)
    setError("")
    try {
      if (kind === "comment") { const created = await addPublicComment(ticketId, value); setComments((current) => [...current, created]); setComment("") }
      else { const created = await addInternalNote(ticketId, value); setNotes((current) => [...current, created]); setNote("") }
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : `Unable to post the ${kind === "comment" ? "Public Comment" : "Internal Note"}.`) }
    finally { setSaving("") }
  }

  return <section className="conversation-section section-gap" aria-label="Ticket communication">
    <div className="conversation-panel public-comments-panel"><h2>Public Comments</h2><p className="muted">Visible to the Requester, IT Staff, and Administrator.</p>{comments.length === 0 ? <p className="empty-state">No Public Comments yet.</p> : <ol className="comment-list">{comments.map((item) => <li key={item.id}><div className="comment-meta"><strong>{item.author?.name ?? "TokTickIT user"}</strong><time dateTime={item.createdAt}>{displayDate(item.createdAt)}</time></div><p>{textOf(item)}</p></li>)}</ol>}{canPost ? <form onSubmit={(event) => void post("comment", event)}><label htmlFor="staff-public-comment">Add Public Comment</label><textarea id="staff-public-comment" value={comment} maxLength={2000} onChange={(event) => { setComment(event.target.value); setError("") }} /><button className="button button--primary section-gap-small" type="submit" disabled={Boolean(saving)}>{saving === "comment" ? "Posting…" : "Post Public Comment"}</button></form> : <p className="muted">Administrators can read Public Comments; posting is reserved for Requesters and IT Staff.</p>}</div>
    <div className="conversation-panel internal-notes-panel"><h2>Internal Notes</h2><p className="muted">Visible only to IT Staff and Administrators.</p>{notes.length === 0 ? <p className="empty-state">No Internal Notes yet.</p> : <ol className="comment-list">{notes.map((item) => <li key={item.id}><div className="comment-meta"><strong>{item.author?.name ?? "TokTickIT user"}</strong><time dateTime={item.createdAt}>{displayDate(item.createdAt)}</time></div><p>{textOf(item)}</p></li>)}</ol>}{canPost ? <form onSubmit={(event) => void post("note", event)}><label htmlFor="internal-note">Add Internal Note</label><textarea id="internal-note" value={note} maxLength={2000} onChange={(event) => { setNote(event.target.value); setError("") }} /><button className="button button--secondary section-gap-small" type="submit" disabled={Boolean(saving)}>{saving === "note" ? "Saving…" : "Save Internal Note"}</button></form> : <p className="muted">Administrators can read Internal Notes; posting is reserved for IT Staff.</p>}</div>
    {error && <p className="field-error" role="alert">{error}</p>}
  </section>
}
