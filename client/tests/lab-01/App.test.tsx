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

  // UI-02 — the happy path: loading state first, then Online + the category list.
  it("shows Online and the seeded categories on success", async () => {
    // A promise we resolve by hand, so the loading state stays on screen long
    // enough to assert it.
    let respond!: (value: api.SystemStatus) => void;
    const pending = new Promise<api.SystemStatus>((resolve) => {
      respond = resolve;
    });
    vi.spyOn(api, "checkSystem").mockReturnValue(pending);

    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /check system/i }));

    // 1. Loading state (the <p role="status"> hourglass, not the button label).
    expect(await screen.findByRole("status")).toHaveTextContent(/loading/i);

    // 2. The API answers.
    respond({
      online: true,
      categories: [
        { id: 1, name: "Account and Access" },
        { id: 2, name: "Hardware" },
        { id: 3, name: "Software" },
        { id: 4, name: "Network" },
      ],
    });

    // 3. Success state: Online plus the four names from the response.
    expect(await screen.findByText("Online")).toBeInTheDocument();
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual(["Account and Access", "Hardware", "Software", "Network"]);
  });

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
