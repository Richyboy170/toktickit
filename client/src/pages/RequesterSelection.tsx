import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DevelopmentRequester, getDevelopmentRequesters } from "../api.js";
import { SystemCheck } from "../components/SystemCheck.js";
import { useRequester } from "../requester-context.js";

type LoadState = "loading" | "ready" | "error";

export function RequesterSelection() {
  const [state, setState] = useState<LoadState>("loading");
  const [requesters, setRequesters] = useState<DevelopmentRequester[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const { requester, selectRequester, clearRequester } = useRequester();
  const navigate = useNavigate();

  async function loadRequesters() {
    setState("loading");
    try {
      const result = await getDevelopmentRequesters();
      setRequesters(result);
      const current = result.find((item) => item.id === requester?.id);
      if (current) setSelectedId(String(current.id));
      else {
        setSelectedId("");
        if (requester) clearRequester();
      }
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void loadRequesters();
    // The selection is intentionally revalidated once when this screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const selected = requesters.find((item) => item.id === Number(selectedId));
    if (!selected) return;
    selectRequester(selected);
    navigate("/tickets");
  }

  const empty = state === "ready" && requesters.length === 0;

  return (
    <main className="selection-page">
      <section className="selection-card" aria-labelledby="selection-title">
        <div className="brand-mark" aria-hidden="true">T</div>
        <h1 id="selection-title">TokTickIT</h1>
        <p className="selection-card__lead">Development Requester Selection</p>
        <div className="notice notice--warning">
          <strong>Lab 2 testing only.</strong> Select a Development Requester to test requester-specific
          ticket behavior. This is not a login screen. Authentication and role-based access arrive in Lab 3.
        </div>

        {state === "loading" && <p role="status" className="state-message">Loading active Requesters…</p>}
        {state === "error" && (
          <div className="state-message state-message--error" role="alert">
            <p>Unable to load Development Requesters. Please check the API and try again.</p>
            <button className="button button--secondary" type="button" onClick={loadRequesters}>Retry</button>
          </div>
        )}
        {empty && (
          <div className="state-message" role="status">
            <p>No active Development Requesters are available.</p>
            <button className="button button--secondary" type="button" onClick={loadRequesters}>Retry</button>
          </div>
        )}
        {state === "ready" && requesters.length > 0 && (
          <form onSubmit={handleSubmit}>
            <label htmlFor="development-requester">Development Requester <span className="required" aria-hidden="true">*</span></label>
            <select id="development-requester" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} required>
              <option value="">Choose an active Requester</option>
              {requesters.map((item) => (
                <option key={item.id} value={item.id}>{item.name} — {item.email}</option>
              ))}
            </select>
            <button className="button button--primary button--full" type="submit" disabled={!selectedId}>
              Continue to My Tickets
            </button>
          </form>
        )}
        <SystemCheck />
      </section>
    </main>
  );
}
