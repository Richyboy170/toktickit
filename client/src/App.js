import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { checkSystem } from "./api.js";
export default function App() {
    const [state, setState] = useState("idle");
    const [categories, setCategories] = useState([]);
    void categories;
    async function handleCheck() {
        setState("loading");
        try {
            const result = await checkSystem();
            setCategories(result.categories);
            setState("success");
        }
        catch {
            // Any failure - server down, bad status, no network - lands here.
            setState("error");
        }
    }
    return (_jsxs("div", { className: "container py-5", style: { maxWidth: 640 }, children: [_jsxs("h1", { className: "h3 mb-4", children: ["TokTickIT ", _jsx("span", { className: "text-success", children: "IT Service Desk" })] }), _jsx("button", { className: "btn btn-success", onClick: handleCheck, disabled: state === "loading", children: state === "loading" ? "Loading…" : "Check System" }), state === "loading" && (_jsx("p", { className: "mt-4 text-muted", children: "\u23F3 Loading\u2026" })), state === "success" && (_jsxs("p", { className: "mt-4", children: ["System Status: ", _jsx("span", { className: "fw-bold text-success", children: "Online" })] })), state === "error" && (_jsxs("div", { className: "mt-4", children: [_jsxs("p", { children: ["System Status: ", _jsx("span", { className: "fw-bold text-danger", children: "Offline" })] }), _jsx("div", { className: "alert alert-danger", role: "alert", children: "Unable to connect to TokTickIT API" })] }))] }));
}
