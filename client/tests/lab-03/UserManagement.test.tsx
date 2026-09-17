import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

const admin: api.AuthUser = { id: 1, name: "Admin User", email: "admin@example.edu", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false };
const requester: api.UserRecord = { id: 2, name: "Ananda Requester", email: "ananda@example.edu", role: "REQUESTER", isActive: true, mustChangePassword: true };

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem("toktickit.authUser", JSON.stringify(admin));
  window.history.replaceState({}, "", "/users");
  vi.spyOn(api, "getCurrentUser").mockResolvedValue(admin);
  vi.spyOn(api, "listUsers").mockResolvedValue([requester]);
});

afterEach(() => vi.restoreAllMocks());

describe("Administrator User Management", () => {
  it("shows a safe list failure and retries without exposing backend details", async () => {
    vi.mocked(api.listUsers)
      .mockRejectedValueOnce(new Error("database detail"))
      .mockResolvedValueOnce([requester]);
    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load users.");
    expect(screen.queryByText("database detail")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect((await screen.findAllByText(requester.name)).length).toBeGreaterThan(0);
  });

  it("lists account fields and opens the create-user form", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { name: "User Management" })).toBeInTheDocument();
    expect((await screen.findAllByText(requester.name)).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Requester").length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: "Create User" }));
    expect(screen.getByRole("heading", { name: "Create User" })).toBeInTheDocument();
    expect(screen.getByLabelText("Initial password")).toBeInTheDocument();
  });

  it("blocks an invalid create form before calling the API", async () => {
    const create = vi.spyOn(api, "createUser");
    render(<App />);
    await screen.findByRole("heading", { name: "User Management" });
    await userEvent.click(screen.getByRole("button", { name: "Create User" }));
    await userEvent.click(screen.getByRole("button", { name: "Save User" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/name must/i);
    expect(create).not.toHaveBeenCalled();
  });
});
