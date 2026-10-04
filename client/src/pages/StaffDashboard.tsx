import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, StaffDashboardData, TicketStatus, getStaffDashboard } from "../api.js";
import { useAuth } from "../auth-context.js";

const STATUS_ORDER: TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
function label(value: string): string { return value.split("_").map((word) => word[0] + word.slice(1).toLowerCase()).join(" "); }
function displayDate(value: string): string { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }

export function StaffDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const load = useCallback(async () => {
    setState("loading");
    try { setData(await getStaffDashboard()); setState("ready"); }
    catch (error) { setState(error instanceof ApiError && error.status === 403 ? "forbidden" : "error"); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (state === "loading") return <section className="page-card"><h1>Staff Dashboard</h1><p role="status">Loading operations data…</p></section>;
  if (state === "forbidden") return <section className="page-card"><h1>Staff Dashboard</h1><p role="alert">This dashboard is only available to IT Staff and Administrators.</p></section>;
  if (state === "error" || !data) return <section className="page-card"><h1>Staff Dashboard</h1><p className="error-message" role="alert">We couldn’t load operations data.</p><button className="button button--secondary" type="button" onClick={() => void load()}>Try again</button></section>;

  const queue = "/staff/tickets";
  const metrics = [
    { title: "Unassigned Open Tickets", value: data.metrics.unassignedOpenTickets, href: `${queue}?assignment=unassigned&statusGroup=open` },
    { title: "My Open Tickets", value: data.metrics.myOpenTickets, href: `${queue}?ownerId=${user?.id ?? ""}&statusGroup=open` },
    { title: "High/Urgent Open Tickets", value: data.metrics.highUrgentOpenTickets, href: `${queue}?priorityGroup=high-or-urgent&statusGroup=open` },
    { title: "My Active Actions", value: data.metrics.myActiveActions, href: "#my-active-actions" },
  ];
  return <section className="page-card dashboard" aria-labelledby="staff-dashboard-title">
    <div className="page-heading"><div><p className="eyebrow">Operations workspace</p><h1 id="staff-dashboard-title">Staff Dashboard</h1><p className="muted">Ticket status, urgent work, and Actions assigned to you.</p></div><Link className="button button--primary button-link" to={queue}>Open Ticket Queue</Link></div>
    <div className="dashboard-metrics dashboard-metrics--four section-gap">{metrics.map((metric) => <Link className="dashboard-metric" key={metric.title} to={metric.href}><span>{metric.title}</span><strong>{metric.value}</strong><small>Open matching work</small></Link>)}</div>
    <section className="section-gap" aria-labelledby="tickets-by-status-title"><h2 id="tickets-by-status-title">Tickets by Status</h2><div className="status-counts">{STATUS_ORDER.map((status) => <Link key={status} to={`${queue}?status=${status}`}><span>{label(status)}</span><strong>{data.ticketsByStatus[status]}</strong></Link>)}</div></section>
    <div className="dashboard-columns section-gap">
      <section aria-labelledby="urgent-tickets-title"><h2 id="urgent-tickets-title">High and Urgent Open Tickets</h2>
        {data.urgentTickets.length ? <ul className="dashboard-list">{data.urgentTickets.map((ticket) => <li key={ticket.id}><Link to={`/staff/tickets/${ticket.id}`}><strong>{ticket.ticketNumber}</strong><span>{ticket.summary}</span></Link><span className={`badge badge--${ticket.itPriority?.toLowerCase()}`}>{ticket.itPriority}</span><small>{label(ticket.currentStatus)} · {displayDate(ticket.updatedAt)}</small></li>)}</ul> : <p className="empty-state">No open high or urgent Tickets.</p>}
      </section>
      <section id="my-active-actions" aria-labelledby="my-active-actions-title"><h2 id="my-active-actions-title">My Active Actions</h2>
        {data.myActiveActions.length ? <ul className="dashboard-list">{data.myActiveActions.map((action) => <li key={action.id}><Link to={`/staff/tickets/${action.ticketId}#actions-taken`}><strong>{action.ticket.ticketNumber}</strong><span>{action.ticket.summary}</span><span>{action.description}</span></Link><span className="badge badge--status">{label(action.status)}</span><small>{displayDate(action.actionAt)}</small></li>)}</ul> : <p className="empty-state">No active Actions are assigned to you.</p>}
      </section>
    </div>
  </section>;
}
