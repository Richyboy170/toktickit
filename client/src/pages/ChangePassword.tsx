import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api.js";
import { requiresPasswordChange, useAuth } from "../auth-context.js";
import { useRequester } from "../requester-context.js";

function homeForRole(role: string | undefined): string {
  return role === "IT_STAFF" ? "/staff/tickets" : role === "ADMINISTRATOR" ? "/users" : "/tickets";
}

export function ChangePassword() {
  const { user, loading, completePasswordChange, signOut } = useAuth();
  const { clearRequester } = useRequester();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  async function logout() {
    try {
      await signOut();
    } finally {
      clearRequester();
      navigate("/login", { replace: true });
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!currentPassword) {
      setError("Enter your current password.");
      return;
    }
    if (newPassword.length < 12 || newPassword.length > 128) {
      setError("New password must be 12-128 characters.");
      return;
    }
    if (newPassword.trim() !== newPassword) {
      setError("New password must not begin or end with whitespace.");
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError("New password must include at least one letter and one number.");
      return;
    }
    if (newPassword !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    void completePasswordChange({ currentPassword, newPassword, confirmPassword: confirmation }).then(() => {
      setSuccess("Password changed successfully.");
      navigate(homeForRole(user?.role), { replace: true });
    }).catch((reason: unknown) => {
      setError(reason instanceof ApiError ? reason.message : "Unable to change your password. Please try again.");
    });
  }

  if (!user) return null;

  return (
    <main className="selection-page">
      <section className="selection-card" aria-labelledby="change-password-title">
        <div className="brand-mark" aria-hidden="true">T</div>
        <h1 id="change-password-title">Change Password</h1>
        <p className="selection-card__lead">{requiresPasswordChange(user) ? "Choose a new password before continuing" : "Update your account password"}</p>
        {requiresPasswordChange(user) && <div className="notice notice--warning"><strong>Password change required.</strong> This initial password can only be used once.</div>}
        {error && <div className="state-message state-message--error" role="alert">{error}</div>}
        {success && <div className="notice notice--success" role="status">{success}</div>}
        <form onSubmit={submit} noValidate>
          <label htmlFor="current-password">Current password <span className="required" aria-hidden="true">*</span></label>
          <input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          <label htmlFor="new-password">New password <span className="required" aria-hidden="true">*</span></label>
          <input id="new-password" type="password" autoComplete="new-password" value={newPassword} aria-describedby="new-password-help" onChange={(event) => setNewPassword(event.target.value)} />
          <small id="new-password-help" className="muted">12-128 characters, including a letter and a number, without leading or trailing spaces.</small>
          <label className="section-gap" htmlFor="confirm-password">Confirm new password <span className="required" aria-hidden="true">*</span></label>
          <input id="confirm-password" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          <button className="button button--primary button--full section-gap" type="submit" disabled={loading}>{loading ? "Saving password…" : "Save New Password"}</button>
        </form>
        <button className="button button--tertiary button--full section-gap" type="button" disabled={loading} onClick={() => void logout()}>Sign out</button>
      </section>
    </main>
  );
}
