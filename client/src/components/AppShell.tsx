import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth-context.js";
import { useRequester } from "../requester-context.js";

export function AppShell() {
  const { requester, clearRequester } = useRequester();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  function changeRequester() {
    clearRequester();
    navigate("/select-requester");
  }

  async function logout() {
    try {
      await signOut();
    } finally {
      // Clear the Lab 2 requester identity whenever an authenticated session
      // ends, so a later session cannot inherit it.
      clearRequester();
      navigate("/login", { replace: true });
    }
  }

  const role = user?.role;
  const home = role === "IT_STAFF" ? "/staff/tickets" : role === "ADMINISTRATOR" ? "/users" : "/tickets";
  const roleLabel = role === "IT_STAFF" ? "IT Staff" : role === "ADMINISTRATOR" ? "Administrator" : "Requester";

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header__inner">
          <NavLink className="brand" to={home} aria-label="TokTickIT home">TokTickIT</NavLink>
          <nav className="main-nav" aria-label="Primary navigation">
            {(!user || user.role === "REQUESTER") && <>
              <NavLink to="/tickets" end>My Tickets</NavLink>
              <NavLink to="/tickets/new">Create Ticket</NavLink>
            </>}
            {user?.role === "IT_STAFF" && <NavLink to="/staff/tickets">Ticket Queue</NavLink>}
            {user?.role === "ADMINISTRATOR" && <NavLink to="/users">User Management</NavLink>}
            {user && <NavLink to="/change-password">Change Password</NavLink>}
          </nav>
          <div className="requester-chip" aria-label={user ? "Current authenticated user" : "Current Development Requester"}>
            <span className="requester-chip__label">{user ? roleLabel : "Testing as"}</span>
            <strong>{user?.name ?? requester?.name}</strong>
            {user && <button className="button button--tertiary button--compact" type="button" onClick={() => void logout()}>Logout</button>}
            {!user && requester && <button className="button button--tertiary button--compact" type="button" onClick={changeRequester}>Change Requester</button>}
          </div>
        </div>
      </header>
      <main className="page-container" id="main-content"><Outlet /></main>
    </div>
  );
}
