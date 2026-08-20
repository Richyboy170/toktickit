import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell.js";
import { RequesterSelection } from "./pages/RequesterSelection.js";
import { CreateTicket } from "./pages/CreateTicket.js";
import { MyTickets } from "./pages/MyTickets.js";
import { TicketDetailPage } from "./pages/TicketDetail.js";
import { RequesterProvider, useRequester } from "./requester-context.js";

function OwnedApplication() {
  const { requester } = useRequester();
  return requester ? <AppShell /> : <Navigate to="/select-requester" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <RequesterProvider>
        <Routes>
          <Route path="/select-requester" element={<RequesterSelection />} />
          <Route element={<OwnedApplication />}>
            <Route path="/tickets" element={<MyTickets />} />
            <Route
              path="/tickets/new"
              element={<CreateTicket />}
            />
            <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/tickets" replace />} />
        </Routes>
      </RequesterProvider>
    </BrowserRouter>
  );
}
