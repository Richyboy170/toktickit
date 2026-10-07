import { FormEvent, useCallback, useEffect, useState } from "react";
import { ActionInput, ActionStatus, ActionTaken, ApiError, StaffUser, createTicketAction, getAssignableStaff, getTicketActions, updateTicketAction } from "../api.js";

interface ActionDraft {
  actionAt: string;
  description: string;
  result: string;
  assigneeUserId: string;
  followUpRequired: boolean;
  followUpNote: string;
  attachmentNotes: string;
}

function localDateTime(value?: string): string {
  const date = value ? new Date(value) : new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
function draftFromAction(action: ActionTaken): ActionDraft {
  return { actionAt: localDateTime(action.actionAt), description: action.description, result: action.result ?? "", assigneeUserId: String(action.assignee.id), followUpRequired: action.followUpRequired, followUpNote: action.followUpNote ?? "", attachmentNotes: action.attachmentNotes ?? "" };
}
function label(value: string): string { return value.split("_").map((word) => word[0] + word.slice(1).toLowerCase()).join(" "); }
function asInput(draft: ActionDraft): ActionInput {
  return { actionAt: new Date(draft.actionAt).toISOString(), description: draft.description.trim(), result: draft.result.trim() || null, assigneeUserId: Number(draft.assigneeUserId), followUpRequired: draft.followUpRequired, followUpNote: draft.followUpRequired ? draft.followUpNote.trim() : null, attachmentNotes: draft.attachmentNotes.trim() || null };
}

export function ActionsTaken({ ticketId, canManage, currentUserId }: { ticketId: number; canManage: boolean; currentUserId?: number }) {
  const [actions, setActions] = useState<ActionTaken[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [draft, setDraft] = useState<ActionDraft>(() => ({ actionAt: localDateTime(), description: "", result: "", assigneeUserId: currentUserId ? String(currentUserId) : "", followUpRequired: false, followUpNote: "", attachmentNotes: "" }));
  const [editing, setEditing] = useState<Record<number, ActionDraft>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTicketActions(ticketId);
      setActions(result.actions);
      setEditing((current) => Object.fromEntries(result.actions.filter((action) => current[action.id]).map((action) => [action.id, current[action.id]])));
      setError("");
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : "Unable to load Actions Taken."); }
    finally { setLoading(false); }
  }, [ticketId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (canManage) void getAssignableStaff().then(setStaff).catch(() => setError("Unable to load active IT Staff assignees.")); }, [canManage]);

  function editDraft(action: ActionTaken): ActionDraft { return editing[action.id] ?? draftFromAction(action); }
  function changeDraft(actionId: number, update: Partial<ActionDraft>) {
    const action = actions.find((item) => item.id === actionId);
    if (!action) return;
    setEditing((current) => ({ ...current, [actionId]: { ...(current[actionId] ?? draftFromAction(action)), ...update } }));
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      await createTicketAction(ticketId, asInput(draft));
      setDraft({ actionAt: localDateTime(), description: "", result: "", assigneeUserId: currentUserId ? String(currentUserId) : "", followUpRequired: false, followUpNote: "", attachmentNotes: "" });
      setNotice("Action recorded."); await load();
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : "Unable to create the Action. Your entries are still here."); }
    finally { setSaving(false); }
  }

  async function saveEdit(action: ActionTaken, status?: ActionStatus, resultOverride?: string) {
    const value = editDraft(action);
    setSaving(true); setError(""); setNotice("");
    try {
      await updateTicketAction(ticketId, action.id, action.updatedAt, { ...asInput(value), ...(resultOverride !== undefined ? { result: resultOverride } : {}), ...(status ? { status } : {}) });
      setEditingId(null); setNotice(status ? `Action marked ${label(status)}.` : "Action updated."); await load();
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : "Unable to update the Action. Your edits are still here."); }
    finally { setSaving(false); }
  }

  async function cancelAction(action: ActionTaken) {
    if (!window.confirm("Cancel this Action? It will remain in the history.")) return;
    const reason = window.prompt("Reason for cancelling this Action (required):")?.trim();
    if (!reason) { setError("Enter a cancellation reason in Result before cancelling."); return; }
    setEditing((current) => ({ ...current, [action.id]: { ...editDraft(action), result: reason } }));
    await saveEdit(action, "CANCELLED", reason);
  }

  function formFields(value: ActionDraft, update: (fields: Partial<ActionDraft>) => void, suffix: string) {
    return <div className="form-grid action-form-grid">
      <div className="field"><label htmlFor={`action-date-${suffix}`}>Action Date and Time</label><input id={`action-date-${suffix}`} type="datetime-local" required value={value.actionAt} onChange={(event) => update({ actionAt: event.target.value })} /></div>
      <div className="field"><label htmlFor={`action-assignee-${suffix}`}>Assigned To</label><select id={`action-assignee-${suffix}`} required value={value.assigneeUserId} onChange={(event) => update({ assigneeUserId: event.target.value })}><option value="">Choose active IT Staff</option>{staff.filter((member) => member.role === "IT_STAFF").map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></div>
      <div className="field detail-field--wide"><label htmlFor={`action-description-${suffix}`}>Description</label><textarea id={`action-description-${suffix}`} required minLength={1} maxLength={4000} value={value.description} onChange={(event) => update({ description: event.target.value })} /></div>
      <div className="field detail-field--wide"><label htmlFor={`action-result-${suffix}`}>Result or Cancellation Reason</label><textarea id={`action-result-${suffix}`} maxLength={4000} value={value.result} onChange={(event) => update({ result: event.target.value })} /></div>
      <div className="field"><label className="checkbox-field" htmlFor={`action-followup-${suffix}`}><input id={`action-followup-${suffix}`} type="checkbox" checked={value.followUpRequired} onChange={(event) => update({ followUpRequired: event.target.checked, ...(event.target.checked ? {} : { followUpNote: "" }) })} /> Follow-up Required</label></div>
      {value.followUpRequired && <div className="field detail-field--wide"><label htmlFor={`action-followup-note-${suffix}`}>Follow-up Note</label><textarea id={`action-followup-note-${suffix}`} required maxLength={2000} value={value.followUpNote} onChange={(event) => update({ followUpNote: event.target.value })} /></div>}
      <div className="field detail-field--wide"><label htmlFor={`action-attachments-${suffix}`}>Attachment Notes</label><textarea id={`action-attachments-${suffix}`} maxLength={1000} value={value.attachmentNotes} onChange={(event) => update({ attachmentNotes: event.target.value })} /><small className="muted">Text references only; no Action file uploads.</small></div>
    </div>;
  }

  return <section className="actions-section section-gap" id="actions-taken" aria-labelledby="actions-taken-title">
    <div className="page-heading"><div><h2 id="actions-taken-title">Actions Taken</h2><p className="muted">{actions.length} recorded {actions.length === 1 ? "Action" : "Actions"}, ordered by Action date.</p></div></div>
    {error && <p className="state-message state-message--error" role="alert">{error} <button className="button button--tertiary button--compact" type="button" onClick={() => void load()}>Refresh</button></p>}
    {notice && <p className="notice notice--success" role="status">{notice}</p>}
    {loading ? <p role="status">Loading Actions Taken…</p> : actions.length === 0 ? <p className="empty-state">No work has been recorded for this Ticket yet.</p> : <ol className="action-timeline">{actions.map((action) => <li key={action.id}>
      <div className="action-summary"><div><time dateTime={action.actionAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(action.actionAt))}</time><span className="badge badge--status">{label(action.status)}</span></div><p>{action.description}</p><dl><div><dt>Performed by</dt><dd>{action.performedBy.name}</dd></div><div><dt>Assigned to</dt><dd>{action.assignee.name}</dd></div>{action.result && <div><dt>Result</dt><dd>{action.result}</dd></div>}{action.followUpRequired && <div><dt>Follow-up</dt><dd>{action.followUpNote}</dd></div>}{action.attachmentNotes && <div><dt>Attachment Notes</dt><dd>{action.attachmentNotes}</dd></div>}</dl><small>Last updated {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(action.updatedAt))}</small></div>
      {canManage && action.status !== "COMPLETED" && action.status !== "CANCELLED" && <div className="action-management">{editingId === action.id ? <form onSubmit={(event) => { event.preventDefault(); void saveEdit(action); }}>{formFields(editDraft(action), (fields) => changeDraft(action.id, fields), String(action.id))}<button className="button button--primary" type="submit" disabled={saving}>Save changes</button><button className="button button--tertiary" type="button" onClick={() => setEditingId(null)}>Close editor</button></form> : <button className="button button--secondary button--compact" type="button" onClick={() => { setEditingId(action.id); setEditing((current) => ({ ...current, [action.id]: draftFromAction(action) })); }}>Edit Action</button>}
        {action.status === "PLANNED" && <button className="button button--secondary button--compact" type="button" disabled={saving} onClick={() => void saveEdit(action, "IN_PROGRESS")}>Start</button>}
        {action.status === "IN_PROGRESS" && <button className="button button--primary button--compact" type="button" disabled={saving} onClick={() => { setEditingId(action.id); setEditing((current) => ({ ...current, [action.id]: current[action.id] ?? draftFromAction(action) })); }}>Complete Action</button>}
        <button className="button button--danger button--compact" type="button" disabled={saving} onClick={() => void cancelAction(action)}>Cancel Action</button>
        {editingId === action.id && action.status === "IN_PROGRESS" && <button className="button button--primary button--compact" type="button" disabled={saving} onClick={() => void saveEdit(action, "COMPLETED")}>Save Result and Complete</button>}
      </div>}
    </li>)}</ol>}
    {canManage && <form className="action-create-form section-gap" onSubmit={(event) => void submitCreate(event)}><h3>Record an Action</h3>{formFields(draft, (fields) => setDraft((current) => ({ ...current, ...fields })), "new")}<button className="button button--primary" type="submit" disabled={saving || loading}>{saving ? "Recording…" : "Record Action"}</button></form>}
  </section>;
}
