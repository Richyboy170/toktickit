import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell.js";
import { RequesterSelection } from "./pages/RequesterSelection.js";
import { CreateTicket } from "./pages/CreateTicket.js";
import { RequesterProvider, useRequester } from "./requester-context.js";

function OwnedApplication() {
  const { requester } = useRequester();
  return requester ? <AppShell /> : <Navigate to="/select-requester" replace />;
}

function Placeholder({ title, message }: { title: string; message: string }) {
  return (
    <section className="page-card" aria-labelledby="placeholder-title">
      <h1 id="placeholder-title">{title}</h1>
      <p className="muted">{message}</p>
    </section>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RequesterProvider>
        <Routes>
          <Route path="/select-requester" element={<RequesterSelection />} />
          <Route element={<OwnedApplication />}>
            <Route
              path="/tickets"
              element={<Placeholder title="My Tickets" message="Your requester-owned tickets will appear here." />}
            />
            <Route
              path="/tickets/new"
              element={<CreateTicket />}
            />
            <Route
              path="/tickets/:ticketId"
              element={<Placeholder title="Ticket Detail" message="Owned ticket information will appear here." />}
            />
          </Route>
          <Route path="*" element={<Navigate to="/tickets" replace />} />
        </Routes>
      </RequesterProvider>
    </BrowserRouter>
  );
}
