import { FormEvent, useCallback, useEffect, useState } from "react";
import { ApiError, createUser, CreateUserInput, listUsers, setInitialPassword, updateUser, UpdateUserInput, UserRecord, UserRole } from "../api.js";
import { useAuth } from "../auth-context.js";

const ROLES: UserRole[] = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];

function roleLabel(role: string): string {
  return role === "IT_STAFF" ? "IT Staff" : role === "ADMINISTRATOR" ? "Administrator" : "Requester";
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validatePassword(value: string): string {
  if (value.length < 12 || value.length > 128) return "Initial password must be 12-128 characters.";
  if (value.trim() !== value) return "Initial password must not begin or end with whitespace.";
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) return "Initial password must include at least one letter and one number.";
  return "";
}

const EMPTY_CREATE: CreateUserInput = { name: "", email: "", role: "REQUESTER", isActive: true, initialPassword: "", confirmPassword: "" };

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const [draftSearch, setDraftSearch] = useState("");
  const [draftRole, setDraftRole] = useState<UserRole | "">("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createValues, setCreateValues] = useState<CreateUserInput>(EMPTY_CREATE);
  const [createError, setCreateError] = useState("");
  const [createSaving, setCreateSaving] = useState(false);
  const [editing, setEditing] = useState<UserRecord | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setUsers(await listUsers({ search: search.trim() || undefined, role: role || undefined }));
      setState("ready");
    } catch {
      setState("error");
    }
  }, [search, role]);

  useEffect(() => { void load(); }, [load]);

  function applySearch(event: FormEvent) {
    event.preventDefault();
    setSearch(draftSearch);
    setRole(draftRole);
  }

  function validateUser(value: CreateUserInput): string {
    if (value.name.trim().length < 2 || value.name.trim().length > 120) return "Name must be 2-120 characters.";
    if (!validEmail(value.email.trim())) return "Enter a valid email address.";
    if (!ROLES.includes(value.role)) return "Choose one permitted role.";
    const passwordError = validatePassword(value.initialPassword);
    if (passwordError) return passwordError;
    if (value.initialPassword !== value.confirmPassword) return "Initial passwords do not match.";
    return "";
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    const error = validateUser(createValues);
    setCreateError(error); setMessage(null);
    if (error) return;
    setCreateSaving(true);
    try {
      await createUser({ ...createValues, name: createValues.name.trim(), email: createValues.email.trim() });
      setCreateValues(EMPTY_CREATE);
      setShowCreate(false);
      setMessage({ kind: "success", text: "User created successfully." });
      await load();
    } catch (reason) {
      setCreateError(reason instanceof ApiError ? reason.message : "Unable to create the User.");
    } finally { setCreateSaving(false); }
  }

  function edit(user: UserRecord) {
    setEditing(user); setMessage(null);
  }

  function afterEdit(text: string) {
    setEditing(null); setMessage({ kind: "success", text }); void load();
  }

  return <section className="page-card user-management" aria-labelledby="user-management-title">
    <div className="page-heading"><div><p className="eyebrow">Administrator workspace</p><h1 id="user-management-title">User Management</h1><p className="muted">Create and maintain TokTickIT accounts and their single role.</p></div><button className="button button--primary" type="button" onClick={() => { setShowCreate((value) => !value); setCreateError(""); }}>{showCreate ? "Close Create User" : "Create User"}</button></div>
    {message && <p className={message.kind === "error" ? "state-message state-message--error" : "notice notice--success"} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p>}
    {showCreate && <form className="user-form section-gap" aria-label="Create User" onSubmit={submitCreate} noValidate><h2>Create User</h2><div className="form-grid form-grid--three"><div><label htmlFor="create-user-name">Name</label><input id="create-user-name" value={createValues.name} onChange={(event) => setCreateValues({ ...createValues, name: event.target.value })} /></div><div><label htmlFor="create-user-email">Email address</label><input id="create-user-email" type="email" value={createValues.email} onChange={(event) => setCreateValues({ ...createValues, email: event.target.value })} /></div><div><label htmlFor="create-user-role">Role</label><select id="create-user-role" value={createValues.role} onChange={(event) => setCreateValues({ ...createValues, role: event.target.value as UserRole })}>{ROLES.map((item) => <option key={item} value={item}>{roleLabel(item)}</option>)}</select></div><div><label htmlFor="create-user-password">Initial password</label><input id="create-user-password" type="password" autoComplete="new-password" value={createValues.initialPassword} onChange={(event) => setCreateValues({ ...createValues, initialPassword: event.target.value })} /><small className="muted">12-128 characters, including a letter and a number, without leading or trailing spaces.</small></div><div><label htmlFor="create-user-confirm-password">Confirm initial password</label><input id="create-user-confirm-password" type="password" autoComplete="new-password" value={createValues.confirmPassword ?? ""} onChange={(event) => setCreateValues({ ...createValues, confirmPassword: event.target.value })} /></div><label className="checkbox-field"><input type="checkbox" checked={createValues.isActive} onChange={(event) => setCreateValues({ ...createValues, isActive: event.target.checked })} /> Active account</label></div>{createError && <p className="field-error" role="alert">{createError}</p>}<div className="action-row section-gap"><button className="button button--primary" type="submit" disabled={createSaving}>{createSaving ? "Creating…" : "Save User"}</button><button className="button button--secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</button></div></form>}
    <form className="ticket-filters user-filters section-gap" aria-label="Filter Users" onSubmit={applySearch}><div className="filter-search"><label htmlFor="user-search">Search users</label><input id="user-search" placeholder="Name or email" value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} /></div><div><label htmlFor="user-role-filter">Role</label><select id="user-role-filter" value={draftRole} onChange={(event) => setDraftRole(event.target.value as UserRole | "")}><option value="">All roles</option>{ROLES.map((item) => <option key={item} value={item}>{roleLabel(item)}</option>)}</select></div><div className="filter-actions"><button className="button button--primary" type="submit">Apply Filters</button><button className="button button--secondary" type="button" onClick={() => { setDraftSearch(""); setDraftRole(""); setSearch(""); setRole(""); }}>Clear Filters</button></div></form>
    {state === "loading" && <p className="state-message section-gap" role="status">Loading users…</p>}
    {state === "error" && <div className="state-message state-message--error section-gap" role="alert"><p>Unable to load users.</p><button className="button button--secondary" type="button" onClick={() => void load()}>Retry</button></div>}
    {state === "ready" && users.length === 0 && <div className="empty-state section-gap"><h2>No users found</h2><p>Try changing the search or role filter.</p></div>}
    {state === "ready" && users.length > 0 && <div className="ticket-table-wrap section-gap"><table className="ticket-table user-table"><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead><tbody>{users.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.email}</td><td><span className="badge badge--role">{roleLabel(item.role)}</span></td><td><span className={`badge ${item.isActive ? "badge--status" : "badge--inactive"}`}>{item.isActive ? "Active" : "Inactive"}</span></td><td><button className="button button--tertiary button--compact" type="button" onClick={() => edit(item)}>Edit {item.name}</button></td></tr>)}</tbody></table></div>}
    {state === "ready" && users.length > 0 && <div className="ticket-cards user-cards">{users.map((item) => <article className="ticket-card" key={item.id}><div><strong>{item.name}</strong><span className={`badge ${item.isActive ? "badge--status" : "badge--inactive"}`}>{item.isActive ? "Active" : "Inactive"}</span></div><dl><div><dt>Email</dt><dd>{item.email}</dd></div><div><dt>Role</dt><dd>{roleLabel(item.role)}</dd></div></dl><button className="button button--secondary button-link ticket-card__action" type="button" onClick={() => edit(item)}>Edit {item.name}</button></article>)}</div>}
    {editing && <EditUserForm currentUser={currentUser} user={editing} onCancel={() => setEditing(null)} onSaved={afterEdit} />}
  </section>;
}

function EditUserForm({ currentUser, user, onCancel, onSaved }: { currentUser: import("../api.js").AuthUser | null; user: UserRecord; onCancel: () => void; onSaved: (message: string) => void }) {
  const [values, setValues] = useState<UpdateUserInput>({ name: user.name, email: user.email, role: user.role, isActive: user.isActive });
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<"details" | "password" | "">("");

  function validate(): string {
    if (values.name.trim().length < 2 || values.name.trim().length > 120) return "Name must be 2-120 characters.";
    if (!validEmail(values.email.trim())) return "Enter a valid email address.";
    if (!ROLES.includes(values.role)) return "Choose one permitted role.";
    if (user.id === currentUser?.id && !values.isActive) return "You cannot deactivate your own account.";
    return "";
  }

  async function saveDetails(event: FormEvent) {
    event.preventDefault();
    const validation = validate(); setError(validation); if (validation) return;
    setSaving("details");
    try { await updateUser(user.id, { ...values, name: values.name.trim(), email: values.email.trim() }); onSaved("User details updated."); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : "Unable to update the User."); }
    finally { setSaving(""); }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    const validation = validatePassword(password) || (password !== passwordConfirmation ? "Initial passwords do not match." : ""); setError(validation); if (validation) return;
    setSaving("password");
    try { await setInitialPassword(user.id, password); setPassword(""); setPasswordConfirmation(""); onSaved("Initial password set. The User must change it at next login."); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : "Unable to set the initial password."); }
    finally { setSaving(""); }
  }

  return <section className="edit-user-panel section-gap" aria-labelledby="edit-user-title"><h2 id="edit-user-title">Edit User: {user.name}</h2>{error && <p className="state-message state-message--error" role="alert">{error}</p>}<form onSubmit={saveDetails} noValidate><div className="form-grid form-grid--three"><div><label htmlFor="edit-user-name">Name</label><input id="edit-user-name" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} /></div><div><label htmlFor="edit-user-email">Email address</label><input id="edit-user-email" type="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} /></div><div><label htmlFor="edit-user-role">Role</label><select id="edit-user-role" value={values.role} onChange={(event) => setValues({ ...values, role: event.target.value as UserRole })}>{ROLES.map((item) => <option key={item} value={item}>{roleLabel(item)}</option>)}</select></div><label className="checkbox-field"><input type="checkbox" checked={values.isActive} onChange={(event) => setValues({ ...values, isActive: event.target.checked })} /> Active account</label></div><div className="action-row section-gap"><button className="button button--primary" type="submit" disabled={Boolean(saving)}>{saving === "details" ? "Saving…" : "Save User Changes"}</button><button className="button button--secondary" type="button" onClick={onCancel}>Cancel</button></div></form><form className="reset-password-form section-gap" onSubmit={savePassword} noValidate><h3>Set New Initial Password</h3><p className="muted">The User must change this password at next login.</p><label htmlFor="reset-user-password">New initial password</label><input id="reset-user-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /><label htmlFor="reset-user-confirm-password">Confirm new initial password</label><input id="reset-user-confirm-password" type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} /><button className="button button--secondary section-gap-small" type="submit" disabled={Boolean(saving)}>{saving === "password" ? "Saving…" : "Set Initial Password"}</button></form></section>;
}
