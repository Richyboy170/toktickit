import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useRequester } from "../requester-context.js";

export function AppShell() {
  const { requester, clearRequester } = useRequester();
  const navigate = useNavigate();

  function changeRequester() {
    clearRequester();
    navigate("/select-requester");
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header__inner">
          <NavLink className="brand" to="/tickets" aria-label="TokTickIT home">TokTickIT</NavLink>
          <nav className="main-nav" aria-label="Primary navigation">
            <NavLink to="/tickets" end>My Tickets</NavLink>
            <NavLink to="/tickets/new">Create Ticket</NavLink>
          </nav>
          <div className="requester-chip" aria-label="Current Development Requester">
            <span className="requester-chip__label">Testing as</span>
            <strong>{requester?.name}</strong>
            <button className="button button--tertiary button--compact" type="button" onClick={changeRequester}>
              Change Requester
            </button>
          </div>
        </div>
      </header>
      <main className="page-container" id="main-content"><Outlet /></main>
    </div>
  );
}
