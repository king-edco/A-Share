/**
 * Auth provider: holds the session state for the admin interface.
 *
 * - access_token lives only in memory (never persisted)
 * - refresh_token persists in localStorage so reloads can rehydrate silently
 * - on mount, a stored refresh_token is exchanged for a fresh access token,
 *   then /api/v1/auth/me restores the admin identity (status: "loading"
 *   while this is in flight)
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";

import {
  apiFetch,
  configureApi,
  REFRESH_TOKEN_KEY,
  silentRefresh,
} from "../../lib/api";
import { AuthContext, type AdminInfo, type AuthStatus } from "./auth-context";

interface LoginResponse {
  access_token: string;
  refresh_token: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  // Mirror of accessToken for the API module callbacks, which are stable.
  const tokenRef = useRef<string | null>(null);
  const navigate = useNavigate();

  const setToken = useCallback((token: string | null) => {
    tokenRef.current = token;
    setAccessTokenState(token);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setAdmin(null);
    setStatus("unauthenticated");
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    navigate("/login", { replace: true });
  }, [navigate, setToken]);

  // Expose session primitives to the fetch wrapper exactly once.
  useEffect(() => {
    configureApi({
      getAccessToken: () => tokenRef.current,
      setAccessToken: (token) => setToken(token),
      onAuthFailure: () => logout(),
    });
  }, [setToken, logout]);

  // Rehydrate a previous session on first load.
  useEffect(() => {
    let cancelled = false;

    async function rehydrate() {
      const token = await silentRefresh();
      if (cancelled) return;
      if (!token) {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        setStatus("unauthenticated");
        return;
      }
      setToken(token);
      try {
        const me = await apiFetch<AdminInfo>("/api/v1/auth/me");
        if (cancelled) return;
        setAdmin(me);
        setStatus("authenticated");
      } catch {
        if (cancelled) return;
        // Refresh succeeded but /me failed: drop the session outright.
        setToken(null);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        setStatus("unauthenticated");
      }
    }

    void rehydrate();
    return () => {
      cancelled = true;
    };
  }, [setToken]);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await apiFetch<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    tokenRef.current = tokens.access_token;
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    setAccessTokenState(tokens.access_token);
    const me = await apiFetch<AdminInfo>("/api/v1/auth/me");
    setAdmin(me);
    setStatus("authenticated");
  }, []);

  const value = useMemo(
    () => ({ status, admin, accessToken, login, logout }),
    [status, admin, accessToken, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
