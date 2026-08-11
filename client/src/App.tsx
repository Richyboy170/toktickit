import { useState } from "react";
import { checkSystem, Category } from "./api.js";

// The screen is always in exactly one of these four states.
type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);

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
        <p className="mt-4 text-muted" role="status">⏳ Loading…</p>
      )}

      {state === "success" && (
        <div className="mt-4">
          <p>
            System Status: <span className="fw-bold text-success">Online</span>
          </p>

          <h2 className="h5 mt-4">Supported Request Categories</h2>
          {categories.length === 0 ? (
            <p className="text-muted">No categories found in the database.</p>
          ) : (
            <ol>
              {categories.map((category) => (
                <li key={category.id}>{category.name}</li>
              ))}
            </ol>
          )}
        </div>
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
