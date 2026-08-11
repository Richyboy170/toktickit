const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
// Ask the backend whether it is alive.
// Throwing on failure (bad HTTP status OR no connection at all) lets App.tsx show
// one single Offline state instead of handling errors in several places.
export async function checkSystem() {
    const health = await fetch(`${API_URL}/api/health`);
    if (!health.ok)
        throw new Error(`Health check failed (HTTP ${health.status})`);
    return { online: true, categories: [] };
}
