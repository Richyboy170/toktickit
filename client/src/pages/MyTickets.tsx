import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ReferenceItem,
  RequestedPriority,
  SortOrder,
  TicketListParams,
  TicketListResponse,
  TicketSort,
  getCategories,
  getRelatedSystems,
  listTickets,
} from "../api.js";
import { useRequester } from "../requester-context.js";

interface Filters {
  search: string;
  categoryId: string;
  relatedSystemId: string;
  requestedPriority: RequestedPriority | "";
  status: "NEW" | "";
  sort: TicketSort;
  order: SortOrder;
  pageSize: 5 | 10 | 20 | 50;
}

const DEFAULT_FILTERS: Filters = {
  search: "", categoryId: "", relatedSystemId: "", requestedPriority: "", status: "",
  sort: "updatedAt", order: "desc", pageSize: 10,
};

function toParams(filters: Filters, page: number): TicketListParams {
  return {
    search: filters.search.trim() || undefined,
    categoryId: filters.categoryId ? Number(filters.categoryId) : undefined,
    relatedSystemId: filters.relatedSystemId ? Number(filters.relatedSystemId) : undefined,
    requestedPriority: filters.requestedPriority || undefined,
    status: filters.status || undefined,
    sort: filters.sort,
    order: filters.order,
    page,
    pageSize: filters.pageSize,
  };
}

function hasNarrowingFilter(filters: Filters): boolean {
  return Boolean(filters.search.trim() || filters.categoryId || filters.relatedSystemId || filters.requestedPriority || filters.status);
}

function displayDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function label(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function MyTickets() {
  const { requester } = useRequester();
  const [draft, setDraft] = useState<Filters>(DEFAULT_FILTERS);
  const [applied, setApplied] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<ReferenceItem[]>([]);
  const [systems, setSystems] = useState<ReferenceItem[]>([]);
  const [result, setResult] = useState<TicketListResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    if (!requester) return;
    setState("loading");
    try {
      const [tickets, nextCategories, nextSystems] = await Promise.all([
        listTickets(requester.id, toParams(applied, page)),
        getCategories(),
        getRelatedSystems(),
      ]);
      setResult(tickets);
      setCategories(nextCategories);
      setSystems(nextSystems);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [requester, applied, page]);

  useEffect(() => { void load(); }, [load]);

  function submitFilters(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setApplied({ ...draft });
  }

  function clearFilters() {
    setDraft(DEFAULT_FILTERS);
    setPage(1);
    setApplied(DEFAULT_FILTERS);
  }

  const empty = state === "ready" && result?.items.length === 0;
  return (
    <section className="page-card" aria-labelledby="my-tickets-title">
      <div className="page-heading">
        <div><p className="eyebrow">Requester workspace</p><h1 id="my-tickets-title">My Tickets</h1><p className="muted">Tickets owned by {requester?.name}.</p></div>
        <Link className="button button--primary button-link" to="/tickets/new">Create Ticket</Link>
      </div>

      <form className="ticket-filters section-gap" onSubmit={submitFilters} aria-label="Filter Tickets">
        <div className="filter-search"><label htmlFor="ticket-search">Search</label><input id="ticket-search" value={draft.search} maxLength={120} placeholder="Ticket number, summary, or description" onChange={(event) => setDraft({ ...draft, search: event.target.value })} /></div>
        <FilterSelect id="filter-category" label="Category" value={draft.categoryId} onChange={(value) => setDraft({ ...draft, categoryId: value })} options={categories} />
        <FilterSelect id="filter-system" label="Related System" value={draft.relatedSystemId} onChange={(value) => setDraft({ ...draft, relatedSystemId: value })} options={systems} />
        <div><label htmlFor="filter-priority">Priority</label><select id="filter-priority" value={draft.requestedPriority} onChange={(event) => setDraft({ ...draft, requestedPriority: event.target.value as Filters["requestedPriority"] })}><option value="">All priorities</option>{["LOW", "MEDIUM", "HIGH", "URGENT"].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></div>
        <div><label htmlFor="filter-status">Status</label><select id="filter-status" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Filters["status"] })}><option value="">All statuses</option><option value="NEW">New</option></select></div>
        <div><label htmlFor="filter-sort">Sort by</label><select id="filter-sort" value={draft.sort} onChange={(event) => setDraft({ ...draft, sort: event.target.value as TicketSort })}><option value="updatedAt">Last updated</option><option value="createdAt">Ticket date</option><option value="ticketNumber">Ticket number</option><option value="summary">Summary</option></select></div>
        <div><label htmlFor="filter-order">Order</label><select id="filter-order" value={draft.order} onChange={(event) => setDraft({ ...draft, order: event.target.value as SortOrder })}><option value="desc">Descending</option><option value="asc">Ascending</option></select></div>
        <div><label htmlFor="filter-page-size">Per page</label><select id="filter-page-size" value={draft.pageSize} onChange={(event) => setDraft({ ...draft, pageSize: Number(event.target.value) as Filters["pageSize"] })}>{[5, 10, 20, 50].map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
        <div className="filter-actions"><button className="button button--primary" type="submit">Apply Filters</button><button className="button button--secondary" type="button" onClick={clearFilters}>Clear Filters</button></div>
      </form>

      {state === "loading" && <p className="state-message section-gap" role="status">Loading your Tickets&hellip;</p>}
      {state === "error" && <div className="state-message state-message--error section-gap" role="alert"><p>Unable to load your Tickets.</p><button className="button button--secondary" type="button" onClick={load}>Retry</button></div>}
      {empty && !hasNarrowingFilter(applied) && <div className="empty-state section-gap"><h2>No Tickets yet</h2><p>Create your first Ticket to request development support.</p><Link className="button button--primary button-link" to="/tickets/new">Create Ticket</Link></div>}
      {empty && hasNarrowingFilter(applied) && <div className="empty-state section-gap"><h2>No matching Tickets</h2><p>Try changing or clearing the active filters.</p><button className="button button--secondary" type="button" onClick={clearFilters}>Clear Filters</button></div>}
      {state === "ready" && result && result.items.length > 0 && <>
        <p className="result-count" role="status">Showing {result.items.length} of {result.pagination.totalItems} Tickets</p>
        <div className="ticket-table-wrap"><table className="ticket-table"><thead><tr><th scope="col">Ticket</th><th scope="col">Summary</th><th scope="col">Category / System</th><th scope="col">Priority</th><th scope="col">Status</th><th scope="col">Updated</th><th scope="col">Action</th></tr></thead><tbody>{result.items.map((ticket) => <tr key={ticket.id}><td><Link to={`/tickets/${ticket.id}`}>{ticket.ticketNumber}</Link><small>{displayDate(ticket.ticketDate)}</small></td><td>{ticket.summary}</td><td>{ticket.category.name}<small>{ticket.relatedSystem.name}</small></td><td><span className={`badge badge--${ticket.requestedPriority.toLowerCase()}`}>{label(ticket.requestedPriority)}</span></td><td><span className="badge badge--status">New</span></td><td>{displayDate(ticket.updatedAt)}</td><td><Link to={`/tickets/${ticket.id}`}>View Ticket</Link></td></tr>)}</tbody></table></div>
        <div className="ticket-cards">{result.items.map((ticket) => <article className="ticket-card" key={ticket.id}><div><Link className="ticket-card__number" to={`/tickets/${ticket.id}`}>{ticket.ticketNumber}</Link><span className="badge badge--status">New</span></div><h2>{ticket.summary}</h2><dl><div><dt>Category</dt><dd>{ticket.category.name}</dd></div><div><dt>System</dt><dd>{ticket.relatedSystem.name}</dd></div><div><dt>Priority</dt><dd>{label(ticket.requestedPriority)}</dd></div><div><dt>Updated</dt><dd>{displayDate(ticket.updatedAt)}</dd></div></dl><Link className="button button--secondary button-link ticket-card__action" to={`/tickets/${ticket.id}`}>View Ticket</Link></article>)}</div>
        <nav className="pagination" aria-label="Ticket pages"><button className="button button--secondary" type="button" disabled={result.pagination.page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {result.pagination.page} of {result.pagination.totalPages}</span><button className="button button--secondary" type="button" disabled={result.pagination.page >= result.pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></nav>
      </>}
    </section>
  );
}

function FilterSelect({ id, label: text, value, onChange, options }: { id: string; label: string; value: string; onChange: (value: string) => void; options: ReferenceItem[] }) {
  return <div><label htmlFor={id}>{text}</label><select id={id} value={value} onChange={(event) => onChange(event.target.value)}><option value="">All {text.toLowerCase()}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></div>;
}
