import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const user: api.AuthUser = { id: 11, name: "Initial User", email: "initial@example.edu", role: "REQUESTER", isActive: true, mustChangePassword: true };

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem("toktickit.authUser", JSON.stringify(user));
  window.history.replaceState({}, "", "/change-password");
  vi.spyOn(api, "getCurrentUser").mockResolvedValue(user);
});

afterEach(() => vi.restoreAllMocks());

describe("mandatory password change", () => {
  it("requires the current password, password rules, and confirmation", async () => {
    const change = vi.spyOn(api, "changePassword").mockResolvedValue({ user: { ...user, mustChangePassword: false } });
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Change Password" })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/^new password/i), "new-password");
    await userEvent.type(screen.getByLabelText(/^confirm new password/i), "different1");
    await userEvent.click(screen.getByRole("button", { name: "Save New Password" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/current password/i);
    expect(change).not.toHaveBeenCalled();
  });

  it("allows an authenticated user to change their password voluntarily", async () => {
    const optionalUser: api.AuthUser = { ...user, mustChangePassword: false };
    sessionStorage.setItem("toktickit.authUser", JSON.stringify(optionalUser));
    vi.mocked(api.getCurrentUser).mockResolvedValue(optionalUser);
    const change = vi.spyOn(api, "changePassword").mockResolvedValue({ user: optionalUser });

    render(<App />);
    expect(await screen.findByRole("heading", { name: "Change Password" })).toBeInTheDocument();
    expect(screen.getByText("Update your account password")).toBeInTheDocument();
    expect(screen.queryByText(/password change required/i)).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/^current password/i), "old-password1");
    await userEvent.type(screen.getByLabelText(/^new password/i), "new-password1");
    await userEvent.type(screen.getByLabelText(/^confirm new password/i), "new-password1");
    await userEvent.click(screen.getByRole("button", { name: "Save New Password" }));

    expect(change).toHaveBeenCalledWith({ currentPassword: "old-password1", newPassword: "new-password1", confirmPassword: "new-password1" });
    await waitFor(() => expect(window.location.pathname).toBe("/tickets"));
  });
});
