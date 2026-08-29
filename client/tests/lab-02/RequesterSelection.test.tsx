import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const ACTIVE_REQUESTERS: api.DevelopmentRequester[] = [
  { id: 1, name: "Ananda Kittisak", email: "ananda.k@example.edu" },
  { id: 2, name: "Chayanee Rattanakul", email: "chayanee.r@example.edu" },
];

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState({}, "", "/select-requester");
});

afterEach(() => vi.restoreAllMocks());

describe("Development Requester Selection", () => {
  it("labels the screen as testing rather than authentication and loads active Requesters", async () => {
    vi.spyOn(api, "getDevelopmentRequesters").mockResolvedValue(ACTIVE_REQUESTERS);
    render(<App />);
    expect(screen.getByText(/this is not a login screen/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/loading active requesters/i);
    expect(await screen.findByRole("option", { name: /Ananda Kittisak/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue to my tickets/i })).toBeDisabled();
  });

  it("stores the chosen Requester for the tab and opens the owned application", async () => {
    vi.spyOn(api, "getDevelopmentRequesters").mockResolvedValue(ACTIVE_REQUESTERS);
    render(<App />);
    await userEvent.selectOptions(await screen.findByLabelText(/development requester/i), "2");
    await userEvent.click(screen.getByRole("button", { name: /continue to my tickets/i }));
    expect(await screen.findByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
    expect(screen.getByText("Chayanee Rattanakul")).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem("toktickit.developmentRequester") ?? "{}").id).toBe(2);
  });

  it("shows empty and safe failure states with retry", async () => {
    const load = vi.spyOn(api, "getDevelopmentRequesters").mockResolvedValueOnce([]);
    const { unmount } = render(<App />);
    expect(await screen.findByText(/no active development requesters/i)).toBeInTheDocument();
    unmount();
    load.mockRejectedValueOnce(new Error("offline"));
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/unable to load development requesters/i);
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("clears requester-owned context when Change Requester is used", async () => {
    sessionStorage.setItem("toktickit.developmentRequester", JSON.stringify(ACTIVE_REQUESTERS[0]));
    window.history.replaceState({}, "", "/tickets");
    vi.spyOn(api, "getDevelopmentRequesters").mockResolvedValue(ACTIVE_REQUESTERS);
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: /change requester/i }));
    await waitFor(() => expect(window.location.pathname).toBe("/select-requester"));
    expect(sessionStorage.getItem("toktickit.developmentRequester")).toBeNull();
  });
});
