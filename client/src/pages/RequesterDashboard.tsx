import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, RequesterDashboardData, getRequesterDashboard } from "../api.js";

function displayDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function RequesterDashboard() {
  const [data, setData] = useState<RequesterDashboardData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const load = useCallback(async () => {
    setState("loading");
    try { setData(await getRequesterDashboard()); setState("ready"); }
    catch (error) { setState(error instanceof ApiError && error.status === 403 ? "forbidden" : "error"); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (state === "loading") return <section className="page-card"><h1>Requester Dashboard</h1><p role="status">Loading your dashboard…</p></section>;
  if (state === "forbidden") return <section className="page-card"><h1>Requester Dashboard</h1><p role="alert">This dashboard is only available to Requesters.</p></section>;
  if (state === "error" || !data) return <section className="page-card"><h1>Requester Dashboard</h1><p className="error-message" role="alert">We couldn’t load your dashboard.</p><button className="button button--secondary" type="button" onClick={() => void load()}>Try again</button></section>;

  return <section className="page-card dashboard" aria-labelledby="requester-dashboard-title">
    <div className="page-heading"><div><p className="eyebrow">Requester workspace</p><h1 id="requester-dashboard-title">Requester Dashboard</h1><p className="muted">A summary of your support requests.</p></div><Link className="button button--primary button-link" to="/tickets/new">Create Ticket</Link></div>
    <div className="dashboard-metrics section-gap">
      <Link className="dashboard-metric" to="/tickets?statusGroup=open"><span>Open Tickets</span><strong>{data.metrics.openTickets}</strong><small>View your open requests</small></Link>
      <Link className="dashboard-metric" to="/tickets?status=WAITING_FOR_REQUESTER"><span>Waiting for Me</span><strong>{data.metrics.waitingForMe}</strong><small>Requests needing your reply</small></Link>
    </div>
    <div className="dashboard-columns section-gap">
      <section aria-labelledby="recently-updated-title"><h2 id="recently-updated-title">Recently Updated</h2>
        {data.recentlyUpdated.length ? <ul className="dashboard-list">{data.recentlyUpdated.map((ticket) => <li key={ticket.id}><Link to={`/tickets/${ticket.id}`}><strong>{ticket.ticketNumber}</strong><span>{ticket.summary}</span></Link><span className="badge badge--status">{ticket.currentStatus.replaceAll("_", " ")}</span><small>{displayDate(ticket.updatedAt)}</small></li>)}</ul> : <p className="empty-state">No Tickets have been updated in the last seven days.</p>}
      </section>
      <section><h2>Recently Resolved</h2>
        {data.recentlyResolved.length ? <ul className="dashboard-list">{data.recentlyResolved.map((ticket) => <li key={ticket.id}><Link to={`/tickets/${ticket.id}`}><strong>{ticket.ticketNumber}</strong><span>{ticket.summary}</span></Link><span className="badge badge--status">{ticket.currentStatus}</span><small>{displayDate(ticket.updatedAt)}</small></li>)}</ul> : <p className="empty-state">No requests were resolved in the last seven days.</p>}
      </section>
    </div>
  </section>;
}
