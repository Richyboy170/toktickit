import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState({}, "", "/login");
});

afterEach(() => vi.restoreAllMocks());

describe("Lab 3 authentication", () => {
  it("submits credentials and displays the authenticated role", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(null);
    vi.spyOn(api, "login").mockResolvedValue({
      user: { id: 10, name: "Narin Staff", email: "narin@example.edu", role: "IT_STAFF", isActive: true, mustChangePassword: false },
      mustChangePassword: false,
    });
    render(<App />);

    await userEvent.type(screen.getByLabelText(/email/i), "narin@example.edu");
    await userEvent.type(screen.getByLabelText(/password/i), "initial-password");
    await userEvent.click(screen.getByRole("button", { name: /sign in|log in/i }));

    expect(await screen.findByRole("heading", { name: "Ticket Queue" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
    expect(screen.queryByText(/change requester/i)).not.toBeInTheDocument();
  });

  it("requires a password change before entering the normal shell", async () => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(null);
    vi.spyOn(api, "login").mockResolvedValue({
      user: { id: 11, name: "Initial User", email: "initial@example.edu", role: "REQUESTER", isActive: true, mustChangePassword: true },
      mustChangePassword: true,
    });
    render(<App />);
    await userEvent.type(screen.getByLabelText(/email/i), "initial@example.edu");
    await userEvent.type(screen.getByLabelText(/password/i), "initial-password");
    await userEvent.click(screen.getByRole("button", { name: /sign in|log in/i }));
    expect(await screen.findByRole("heading", { name: /change password/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /my tickets/i })).not.toBeInTheDocument();
  });

  it.each([
    ["REQUESTER", "/tickets"],
    ["IT_STAFF", "/staff/tickets"],
    ["ADMINISTRATOR", "/users"],
  ] as const)("uses the %s role workspace after login", async (role, expectedPath) => {
    vi.spyOn(api, "getCurrentUser").mockResolvedValue(null);
    vi.spyOn(api, "login").mockResolvedValue({
      user: { id: 12, name: `${role} User`, email: `${role.toLowerCase()}@example.edu`, role, isActive: true, mustChangePassword: false },
      mustChangePassword: false,
    });
    render(<App />);

    await userEvent.type(screen.getByLabelText(/email/i), `${role.toLowerCase()}@example.edu`);
    await userEvent.type(screen.getByLabelText(/password/i), "valid-password1");
    await userEvent.click(screen.getByRole("button", { name: /sign in|log in/i }));

    await waitFor(() => expect(window.location.pathname).toBe(expectedPath));
  });
});
