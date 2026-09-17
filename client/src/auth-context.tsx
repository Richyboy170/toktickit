import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AuthUser, ChangePasswordInput, changePassword as apiChangePassword, getCurrentUser, login as apiLogin, logout as apiLogout, LoginResponse } from "./api.js";

export const AUTH_STORAGE_KEY = "toktickit.authUser";
const AUTHENTICATED_KEY = "toktickit.authenticated";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<LoginResponse>;
  signOut: () => Promise<void>;
  completePasswordChange: (input: ChangePasswordInput) => Promise<AuthUser | null>;
  refreshUser: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<AuthUser>;
    if (!Number.isInteger(value.id) || typeof value.name !== "string" || typeof value.email !== "string") return null;
    if (value.role !== "REQUESTER" && value.role !== "IT_STAFF" && value.role !== "ADMINISTRATOR") return null;
    return value as AuthUser;
  } catch {
    return null;
  }
}

function persistUser(user: AuthUser | null): void {
  try {
    if (user) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      sessionStorage.setItem(AUTHENTICATED_KEY, "1");
    } else {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTHENTICATED_KEY);
    }
  } catch {
    // Session storage is an optimization; the server cookie remains authoritative.
  }
}

export function requiresPasswordChange(user: AuthUser | null): boolean {
  return Boolean(user?.mustChangePassword ?? user?.requiresPasswordChange);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readUser);
  const [loading, setLoading] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const current = await getCurrentUser();
      setUser(current);
      persistUser(current);
      return current;
    } catch {
      // A failed current-user probe leaves a cached user available for the
      // current tab; protected API calls still enforce the server session.
      return user;
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    void getCurrentUser().then((current) => {
      if (!active) return;
      if (current) {
        setUser(current);
        persistUser(current);
      } else if (!readUser()) {
        setUser(null);
      }
    }).catch(() => {
      // Login remains available when the API is offline; individual actions
      // display their own safe error state.
    });
    return () => { active = false; };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await apiLogin(email, password);
      setUser(response.user);
      persistUser(response.user);
      return response;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await apiLogout();
    } finally {
      setUser(null);
      persistUser(null);
      setLoading(false);
    }
  }, []);

  const completePasswordChange = useCallback(async (input: ChangePasswordInput) => {
    setLoading(true);
    try {
      const response = await apiChangePassword(input);
      const next = response.user ? { ...user, ...response.user, mustChangePassword: false, requiresPasswordChange: false } as AuthUser : user ? { ...user, mustChangePassword: false, requiresPasswordChange: false } : null;
      setUser(next);
      persistUser(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const value = useMemo(() => ({ user, loading, signIn, signOut, completePasswordChange, refreshUser }), [user, loading, signIn, signOut, completePasswordChange, refreshUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
