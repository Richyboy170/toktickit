import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const requester: api.AuthUser = {
  id: 1,
  name: "Ananda Requester",
  email: "ananda@example.edu",
  role: "REQUESTER",
  isActive: true,
  mustChangePassword: false,
};

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState({}, "", "/tickets");
  vi.spyOn(api, "getCurrentUser").mockResolvedValue(null);
});

afterEach(() => vi.restoreAllMocks());

describe("Lab 3 Requester regression", () => {
  it("redirects a protected route to Login without an authenticated session", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: /sign in to toktickit/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
    expect(screen.queryByRole("heading", { name: "My Tickets" })).not.toBeInTheDocument();
  });

  it("does not expose a Change Requester action after authenticated login", async () => {
    sessionStorage.setItem("toktickit.developmentRequester", JSON.stringify({ id: 1, name: requester.name, email: requester.email }));
    vi.spyOn(api, "login").mockResolvedValue({ user: requester, mustChangePassword: false });
    window.history.replaceState({}, "", "/login");
    render(<App />);

    await userEvent.type(screen.getByLabelText(/email/i), requester.email);
    await userEvent.type(screen.getByLabelText(/password/i), "valid-password1");
    await userEvent.click(screen.getByRole("button", { name: /sign in|log in/i }));

    expect(await screen.findByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /change requester/i })).not.toBeInTheDocument();
  });

  it("uses the authenticated Requester shell without a Change Requester action", async () => {
    vi.spyOn(api, "login").mockResolvedValue({ user: requester, mustChangePassword: false });
    window.history.replaceState({}, "", "/login");
    render(<App />);

    await userEvent.type(screen.getByLabelText(/email/i), requester.email);
    await userEvent.type(screen.getByLabelText(/password/i), "valid-password1");
    await userEvent.click(screen.getByRole("button", { name: /sign in|log in/i }));

    expect(await screen.findByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /change requester/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/testing as/i)).not.toBeInTheDocument();
  });

  it("clears the legacy requester record on logout", async () => {
    sessionStorage.setItem("toktickit.developmentRequester", JSON.stringify({ id: 1, name: requester.name, email: requester.email }));
    sessionStorage.setItem("toktickit.authUser", JSON.stringify(requester));
    window.history.replaceState({}, "", "/tickets");
    vi.spyOn(api, "logout").mockResolvedValue();
    render(<App />);

    await screen.findByRole("heading", { name: "My Tickets" });
    await userEvent.click(screen.getByRole("button", { name: /logout/i }));

    expect(await screen.findByRole("heading", { name: /sign in to toktickit/i })).toBeInTheDocument();
    expect(sessionStorage.getItem("toktickit.developmentRequester")).toBeNull();
  });
});
