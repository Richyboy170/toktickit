import { useState } from "react";
import { checkSystem, Category } from "./api.js";

// The screen is always in exactly one of these four states.
type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  void categories;

  async function handleCheck() {
    setState("loading");
    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setState("success");
    } catch {
      // Any failure - server down, bad status, no network - lands here.
      setState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {state === "loading" && (
        <p className="mt-4 text-muted">⏳ Loading…</p>
      )}

      {state === "success" && (
        <p className="mt-4">
          System Status: <span className="fw-bold text-success">Online</span>
        </p>
      )}

      {state === "error" && (
        <div className="mt-4">
          <p>
            System Status: <span className="fw-bold text-danger">Offline</span>
          </p>
          <div className="alert alert-danger" role="alert">
            Unable to connect to TokTickIT API
          </div>
        </div>
      )}
    </div>
  );
}
