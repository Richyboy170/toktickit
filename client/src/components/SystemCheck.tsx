import { useState } from "react";
import { Category, checkSystem } from "../api.js";

type State = "idle" | "loading" | "success" | "error";

export function SystemCheck() {
  const [state, setState] = useState<State>("idle");
  const [categories, setCategories] = useState<Category[]>([]);

  async function handleCheck() {
    setState("loading");
    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <aside className="system-check" aria-label="System diagnostics">
      <button className="button button--tertiary" type="button" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>
      {state === "loading" && <p role="status">Loading system status…</p>}
      {state === "success" && (
        <div>
          <p>System Status: <strong className="success-text">Online</strong></p>
          <ol className="diagnostic-list">
            {categories.map((category) => <li key={category.id}>{category.name}</li>)}
          </ol>
        </div>
      )}
      {state === "error" && (
        <div role="alert">
          System Status: <strong className="error-text">Offline</strong>
          <p>Unable to connect to TokTickIT API</p>
        </div>
      )}
    </aside>
  );
}
