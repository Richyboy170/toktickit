import { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api.js";
import { requiresPasswordChange, useAuth } from "../auth-context.js";
import { SystemCheck } from "../components/SystemCheck.js";

function homeForRole(role: string | undefined): string {
  return role === "IT_STAFF" ? "/staff/tickets" : role === "ADMINISTRATOR" ? "/users" : "/tickets";
}

function allowedReturnPath(role: string | undefined, path: unknown): string | undefined {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) return undefined;
  const prefixes = role === "REQUESTER"
    ? ["/tickets"]
    : role === "IT_STAFF"
      ? ["/staff/tickets", "/ticket-queue", "/tickets/"]
      : role === "ADMINISTRATOR"
        ? ["/users", "/admin/users", "/admin/user-management", "/admin/tickets/", "/tickets/"]
        : [];
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)) ? path : undefined;
}

export function Login() {
  const { user, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (!user) return;
    const requestedPath = allowedReturnPath(user.role, (location.state as { from?: string } | null)?.from);
    navigate(requiresPasswordChange(user) ? "/change-password" : requestedPath ?? homeForRole(user.role), { replace: true });
  }, [user, navigate, location.state]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const next: typeof fieldErrors = {};
    if (!email.trim()) next.email = "Enter your email address.";
    if (!password) next.password = "Enter your password.";
    setFieldErrors(next);
    setError("");
    if (Object.keys(next).length) return;
    void signIn(email.trim(), password).catch((reason: unknown) => {
      if (reason instanceof ApiError && reason.status === 403 && reason.code === "ACCOUNT_INACTIVE") {
        setError("This account is inactive. Contact an Administrator.");
      } else if (reason instanceof ApiError && (reason.status === 401 || reason.code === "INVALID_CREDENTIALS")) {
        setError("Invalid email or password.");
      } else if (reason instanceof ApiError) {
        setError(reason.message);
      } else {
        setError("Unable to sign in right now. Please try again.");
      }
    });
  }

  return (
    <main className="selection-page">
      <section className="selection-card login-card" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">T</div>
        <h1 id="login-title">Sign in to TokTickIT</h1>
        <p className="selection-card__lead">Use your service desk account</p>
        {error && <div className="state-message state-message--error" role="alert">{error}</div>}
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="login-email">Email address <span className="required" aria-hidden="true">*</span></label>
            <input id="login-email" type="email" autoComplete="username" value={email} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "login-email-error" : undefined} onChange={(event) => { setEmail(event.target.value); setFieldErrors((current) => ({ ...current, email: undefined })); }} />
            {fieldErrors.email && <p id="login-email-error" className="field-error" role="alert">{fieldErrors.email}</p>}
          </div>
          <div className="field section-gap">
            <label htmlFor="login-password">Password <span className="required" aria-hidden="true">*</span></label>
            <input id="login-password" type="password" autoComplete="current-password" value={password} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? "login-password-error" : undefined} onChange={(event) => { setPassword(event.target.value); setFieldErrors((current) => ({ ...current, password: undefined })); }} />
            {fieldErrors.password && <p id="login-password-error" className="field-error" role="alert">{fieldErrors.password}</p>}
          </div>
          <button className="button button--primary button--full section-gap" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign In"}</button>
        </form>
        <p className="muted login-help">Use the account issued by your Administrator.</p>
        <SystemCheck />
      </section>
    </main>
  );
}
