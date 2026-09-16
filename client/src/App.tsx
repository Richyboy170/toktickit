import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, requiresPasswordChange, useAuth } from "./auth-context.js";
import { AppShell } from "./components/AppShell.js";
import { ChangePassword } from "./pages/ChangePassword.js";
import { CreateTicket } from "./pages/CreateTicket.js";
import { Login } from "./pages/Login.js";
import { MyTickets } from "./pages/MyTickets.js";
import { RequesterSelection } from "./pages/RequesterSelection.js";
import { TicketDetailPage } from "./pages/TicketDetail.js";
import { StaffTicketDetail } from "./pages/StaffTicketDetail.js";
import { StaffTicketQueue } from "./pages/StaffTicketQueue.js";
import { UserManagement } from "./pages/UserManagement.js";
import { useRequester, RequesterProvider } from "./requester-context.js";

// The old selector is kept only for the Lab 2 regression tests. It is not a
// production route and cannot be used to enter the authenticated application.
// The compatibility selector is available only to the explicit E2E mode (or
// when a test harness opts in). Checking MODE directly avoids relying on a
// shell environment variable being forwarded through npm/Playwright.
const legacyRequesterCompatibilityMode = import.meta.env.MODE === "e2e"
  || import.meta.env.VITE_ENABLE_LEGACY_REQUESTER === "true";
const legacyRequesterTestMode = legacyRequesterCompatibilityMode || import.meta.env.VITEST === "true";

function homeForRole(role: string | undefined): string {
  return role === "IT_STAFF" ? "/staff/tickets" : role === "ADMINISTRATOR" ? "/users" : "/tickets";
}

function AuthenticatedFrame() {
  const { user } = useAuth();
  const { requester } = useRequester();
  const location = useLocation();
  if (!user && legacyRequesterCompatibilityMode && !requester) {
    return <Navigate to="/select-requester" replace />;
  }
  if (!user && !(legacyRequesterTestMode && requester)) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user && requiresPasswordChange(user)) return <Navigate to="/change-password" replace />;
  return <AppShell />;
}

function RoleGate({ roles }: { roles: Array<"REQUESTER" | "IT_STAFF" | "ADMINISTRATOR"> }) {
  const { user } = useAuth();
  const { requester } = useRequester();
  if (!user && legacyRequesterTestMode && requester && roles.includes("REQUESTER")) return <Outlet />;
  if (!user) return <Navigate to="/login" replace />;
  return roles.includes(user.role) ? <Outlet /> : <Forbidden />;
}

function LegacySelection() {
  const { user } = useAuth();
  return user ? <Navigate to={homeForRole(user.role)} replace /> : <RequesterSelection />;
}

function TicketDetailRouter() {
  const { user } = useAuth();
  return user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR" ? <StaffTicketDetail /> : <TicketDetailPage />;
}

function Forbidden() {
  const { user } = useAuth();
  return <section className="page-card empty-state"><h1>Access unavailable</h1><p>Your role does not have permission to use this screen.</p><NavigateHome role={user?.role} /></section>;
}

function NavigateHome({ role }: { role?: string }) {
  return <Link className="button button--secondary button-link" to={homeForRole(role)}>Return to your workspace</Link>;
}

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? homeForRole(user.role) : "/login"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RequesterProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/select-requester" element={legacyRequesterTestMode ? <LegacySelection /> : <Navigate to="/login" replace />} />
            <Route element={<AuthenticatedFrame />}>
              <Route element={<RoleGate roles={["REQUESTER"]} />}>
                <Route path="/tickets" element={<MyTickets />} />
                <Route path="/tickets/new" element={<CreateTicket />} />
              </Route>
              <Route element={<RoleGate roles={["REQUESTER", "IT_STAFF", "ADMINISTRATOR"]} />}>
                <Route path="/tickets/:ticketId" element={<TicketDetailRouter />} />
              </Route>
              <Route element={<RoleGate roles={["IT_STAFF"]} />}>
                <Route path="/staff/tickets" element={<StaffTicketQueue />} />
                <Route path="/ticket-queue" element={<StaffTicketQueue />} />
              </Route>
              <Route element={<RoleGate roles={["IT_STAFF", "ADMINISTRATOR"]} />}>
                <Route path="/staff/tickets/:ticketId" element={<StaffTicketDetail />} />
                <Route path="/admin/tickets/:ticketId" element={<StaffTicketDetail />} />
              </Route>
              <Route element={<RoleGate roles={["ADMINISTRATOR"]} />}>
                <Route path="/users" element={<UserManagement />} />
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/admin/user-management" element={<UserManagement />} />
              </Route>
            </Route>
            <Route path="/forbidden" element={<Forbidden />} />
            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </RequesterProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
