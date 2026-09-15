import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ReferenceItem, RequestedPriority, SortOrder, StaffTicketListParams, StaffTicketListResponse, StaffTicketSort, TicketStatus, getCategories, getRelatedSystems, listStaffTickets } from "../api.js";

interface QueueFilters {
  search: string;
  categoryId: string;
  relatedSystemId: string;
  requestedPriority: RequestedPriority | "";
  itPriority: RequestedPriority | "";
  status: TicketStatus | "";
  assignment: "" | "assigned" | "unassigned";
  sort: StaffTicketSort;
  order: SortOrder;
  pageSize: 10 | 20 | 50;
}

const DEFAULT_FILTERS: QueueFilters = { search: "", categoryId: "", relatedSystemId: "", requestedPriority: "", itPriority: "", status: "", assignment: "", sort: "updatedAt", order: "desc", pageSize: 10 };
const STATUSES: TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
const PRIORITIES: RequestedPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function toParams(filters: QueueFilters, page: number): StaffTicketListParams {
  return {
    search: filters.search.trim() || undefined,
    categoryId: filters.categoryId ? Number(filters.categoryId) : undefined,
    relatedSystemId: filters.relatedSystemId ? Number(filters.relatedSystemId) : undefined,
    requestedPriority: filters.requestedPriority || undefined,
    itPriority: filters.itPriority || undefined,
    status: filters.status || undefined,
    assignment: filters.assignment || undefined,
    ...(filters.assignment === "unassigned" ? { unassigned: true } : {}),
    sort: filters.sort,
    order: filters.order,
    page,
    pageSize: filters.pageSize,
  };
}

function label(value: string): string {
  return value.split("_").map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(" ");
}

function displayDate(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "—" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function ownerOf(ticket: StaffTicketListResponse["items"][number]): string {
  return ticket.ticketOwner?.name ?? ticket.assignedTo?.name ?? ticket.owner?.name ?? "Unassigned";
}

export function StaffTicketQueue() {
  const [draft, setDraft] = useState<QueueFilters>(DEFAULT_FILTERS);
  const [applied, setApplied] = useState<QueueFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<ReferenceItem[]>([]);
  const [systems, setSystems] = useState<ReferenceItem[]>([]);
  const [result, setResult] = useState<StaffTicketListResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    const queue = listStaffTickets(toParams(applied, page));
    const references = Promise.all([getCategories(), getRelatedSystems()]).catch(() => [[], []] as [ReferenceItem[], ReferenceItem[]]);
    try {
      const [tickets, [nextCategories, nextSystems]] = await Promise.all([queue, references]);
      setResult(tickets);
      setCategories(nextCategories);
      setSystems(nextSystems);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [applied, page]);

  useEffect(() => { void load(); }, [load]);

  function update<K extends keyof QueueFilters>(name: K, value: QueueFilters[K]) {
    setDraft((current) => ({ ...current, [name]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setApplied({ ...draft });
  }

  function clearFilters() {
    setDraft(DEFAULT_FILTERS); setApplied(DEFAULT_FILTERS); setPage(1);
  }

  const items = result?.items ?? [];
  const hasFilter = Boolean(applied.search.trim() || applied.categoryId || applied.relatedSystemId || applied.requestedPriority || applied.itPriority || applied.status || applied.assignment);
  return <section className="page-card" aria-labelledby="ticket-queue-title">
    <div className="page-heading"><div><p className="eyebrow">IT Staff workspace</p><h1 id="ticket-queue-title">Ticket Queue</h1><p className="muted">Find, prioritize, and take ownership of support work.</p></div></div>
    <form className="ticket-filters section-gap staff-queue-filters" onSubmit={submit} aria-label="Filter Ticket Queue">
      <div className="filter-search"><label htmlFor="queue-search">Search</label><input id="queue-search" value={draft.search} maxLength={120} placeholder="Ticket number, summary, or requester" onChange={(event) => update("search", event.target.value)} /></div>
      <Select id="queue-category" label="Category" value={draft.categoryId} onChange={(value) => update("categoryId", value)} options={categories} />
      <Select id="queue-system" label="Related System" value={draft.relatedSystemId} onChange={(value) => update("relatedSystemId", value)} options={systems} />
      <PrioritySelect id="queue-requested-priority" label="Requested Priority" value={draft.requestedPriority} onChange={(value) => update("requestedPriority", value)} />
      <PrioritySelect id="queue-it-priority" label="IT Priority" value={draft.itPriority} onChange={(value) => update("itPriority", value)} />
      <div><label htmlFor="queue-status">Status</label><select id="queue-status" value={draft.status} onChange={(event) => update("status", event.target.value as QueueFilters["status"])}><option value="">All statuses</option>{STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></div>
      <div><label htmlFor="queue-assignment">Ownership</label><select id="queue-assignment" value={draft.assignment} onChange={(event) => update("assignment", event.target.value as QueueFilters["assignment"])}><option value="">All Tickets</option><option value="assigned">Assigned</option><option value="unassigned">Unassigned</option></select></div>
      <div><label htmlFor="queue-sort">Sort by</label><select id="queue-sort" value={draft.sort} onChange={(event) => update("sort", event.target.value as StaffTicketSort)}><option value="updatedAt">Last updated</option><option value="createdAt">Created date</option><option value="ticketNumber">Ticket number</option><option value="summary">Summary</option><option value="itPriority">IT Priority</option><option value="currentStatus">Status</option></select></div>
      <div><label htmlFor="queue-order">Order</label><select id="queue-order" value={draft.order} onChange={(event) => update("order", event.target.value as SortOrder)}><option value="desc">Descending</option><option value="asc">Ascending</option></select></div>
      <div><label htmlFor="queue-page-size">Per page</label><select id="queue-page-size" value={draft.pageSize} onChange={(event) => update("pageSize", Number(event.target.value) as QueueFilters["pageSize"])}>{[10, 20, 50].map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
      <div className="filter-actions"><button className="button button--primary" type="submit">Apply Filters</button><button className="button button--secondary" type="button" onClick={clearFilters}>Clear Filters</button></div>
    </form>
    {state === "loading" && <p className="state-message section-gap" role="status">Loading Ticket Queue…</p>}
    {state === "error" && <div className="state-message state-message--error section-gap" role="alert"><p>Unable to load the Ticket Queue.</p><button className="button button--secondary" type="button" onClick={() => void load()}>Retry</button></div>}
    {state === "ready" && items.length === 0 && <div className="empty-state section-gap"><h2>{hasFilter ? "No matching Tickets" : "No Tickets in the Queue"}</h2><p>{hasFilter ? "Try changing or clearing the active filters." : "New support work will appear here."}</p>{hasFilter && <button className="button button--secondary" type="button" onClick={clearFilters}>Clear Filters</button>}</div>}
    {state === "ready" && items.length > 0 && <>
      <p className="result-count" role="status">Showing {items.length} of {result?.pagination.totalItems ?? items.length} Tickets</p>
      <div className="ticket-table-wrap"><table className="ticket-table staff-queue-table"><thead><tr><th scope="col">Ticket</th><th scope="col">Summary / Requester</th><th scope="col">Category / System</th><th scope="col">Requested</th><th scope="col">IT Priority</th><th scope="col">Status</th><th scope="col">Owner</th><th scope="col">Updated</th><th scope="col">Action</th></tr></thead><tbody>{items.map((ticket) => <tr key={ticket.id}><td><Link to={`/staff/tickets/${ticket.id}`}>{ticket.ticketNumber}</Link><small>{displayDate(ticket.ticketDate)}</small></td><td>{ticket.summary}<small>{ticket.requester?.name ?? "Requester unavailable"}</small></td><td>{ticket.category?.name ?? "—"}<small>{ticket.relatedSystem?.name ?? "—"}</small></td><td><span className={`badge badge--${ticket.requestedPriority.toLowerCase()}`}>{label(ticket.requestedPriority)}</span></td><td><span className={`badge badge--${(ticket.itPriority ?? ticket.requestedPriority).toLowerCase()}`}>{label(ticket.itPriority ?? ticket.requestedPriority)}</span></td><td><span className="badge badge--status">{label(ticket.currentStatus)}</span></td><td>{ownerOf(ticket)}</td><td>{displayDate(ticket.updatedAt)}</td><td><Link to={`/staff/tickets/${ticket.id}`}>Open Ticket</Link></td></tr>)}</tbody></table></div>
      <div className="ticket-cards staff-ticket-cards">{items.map((ticket) => <article className="ticket-card" key={ticket.id}><div><Link className="ticket-card__number" to={`/staff/tickets/${ticket.id}`}>{ticket.ticketNumber}</Link><span className="badge badge--status">{label(ticket.currentStatus)}</span></div><h2>{ticket.summary}</h2><dl><div><dt>Requester</dt><dd>{ticket.requester?.name ?? "—"}</dd></div><div><dt>Owner</dt><dd>{ownerOf(ticket)}</dd></div><div><dt>Requested</dt><dd><span className={`badge badge--${ticket.requestedPriority.toLowerCase()}`}>{label(ticket.requestedPriority)}</span></dd></div><div><dt>IT Priority</dt><dd><span className={`badge badge--${(ticket.itPriority ?? ticket.requestedPriority).toLowerCase()}`}>{label(ticket.itPriority ?? ticket.requestedPriority)}</span></dd></div><div><dt>Updated</dt><dd>{displayDate(ticket.updatedAt)}</dd></div></dl><Link className="button button--secondary button-link ticket-card__action" to={`/staff/tickets/${ticket.id}`}>Open Ticket</Link></article>)}</div>
      <nav className="pagination" aria-label="Ticket Queue pages"><button className="button button--secondary" type="button" disabled={(result?.pagination.page ?? page) <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {result?.pagination.page ?? page} of {result?.pagination.totalPages ?? 1}</span><button className="button button--secondary" type="button" disabled={(result?.pagination.page ?? page) >= (result?.pagination.totalPages ?? 1)} onClick={() => setPage((value) => value + 1)}>Next</button></nav>
    </>}
  </section>;
}

function Select({ id, label: text, value, onChange, options }: { id: string; label: string; value: string; onChange: (value: string) => void; options: ReferenceItem[] }) {
  return <div><label htmlFor={id}>{text}</label><select id={id} value={value} onChange={(event) => onChange(event.target.value)}><option value="">All {text.toLowerCase()}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></div>;
}

function PrioritySelect({ id, label: text, value, onChange }: { id: string; label: string; value: RequestedPriority | ""; onChange: (value: RequestedPriority | "") => void }) {
  return <div><label htmlFor={id}>{text}</label><select id={id} value={value} onChange={(event) => onChange(event.target.value as RequestedPriority | "")}><option value="">All priorities</option>{PRIORITIES.map((priority) => <option key={priority} value={priority}>{label(priority)}</option>)}</select></div>;
}
