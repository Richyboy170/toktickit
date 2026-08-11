import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App", () => {
  // UI-01 — WORKED EXAMPLE, provided for you.
  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  it.todo("shows Online and the seeded categories on success");

  // UI-03 — the API is unreachable, so the page must say Offline and explain why.
  it("shows an Offline error message when the API is unavailable", async () => {
    // Replace the real network call with one that always fails.
    vi.spyOn(api, "checkSystem").mockRejectedValue(new Error("network down"));

    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /check system/i }));

    expect(await screen.findByText("Offline")).toBeInTheDocument();
    expect(screen.getByText("Unable to connect to TokTickIT API")).toBeInTheDocument();
  });
});
