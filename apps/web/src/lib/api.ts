/**
 * Thin fetch wrapper around the backend API.
 *
 * The base URL comes from VITE_API_URL (empty means same-origin, which is
 * how the Docker stack is wired: nginx proxies /api/* to the api service).
 *
 * Auth wiring is intentionally inverted: this module never imports the auth
 * context. The provider registers small handlers at runtime (getAccessToken,
 * onAuthFailure) so requests under /api/v1/admin/* and /api/v1/auth/me
 * automatically carry the in-memory access token, and a 401 triggers
 * exactly one silent refresh + retry before giving up.
 */

const API_URL: string = import.meta.env.VITE_API_URL ?? "";

export const REFRESH_TOKEN_KEY = "ashare.refresh_token";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ApiHandlers {
  getAccessToken: () => string | null;
  setAccessToken: (token: string | null) => void;
  onAuthFailure: () => void;
}

let handlers: ApiHandlers = {
  getAccessToken: () => null,
  setAccessToken: () => undefined,
  onAuthFailure: () => undefined,
};

/** Called once by the auth provider so this module can see session state. */
export function configureApi(next: ApiHandlers): void {
  handlers = next;
}

/** Attempt a silent refresh; resolves to the new access token or null. */
export async function silentRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { access_token?: string };
    if (!data.access_token) return null;
    handlers.setAccessToken(data.access_token);
    return data.access_token;
  } catch {
    return null;
  }
}

function needsAuth(path: string): boolean {
  return path.startsWith("/api/v1/admin") || path === "/api/v1/auth/me";
}

async function rawFetch(
  path: string,
  init: RequestInit,
  accessToken: string | null,
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return fetch(`${API_URL}${path}`, { ...init, headers });
}

/**
 * Perform an API request. Authenticated paths get the bearer token; a 401
 * triggers one silent refresh and one retry before the session is dropped.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const auth = needsAuth(path);
  let token = auth ? handlers.getAccessToken() : null;
  let response = await rawFetch(path, init, token);

  if (response.status === 401 && auth) {
    token = await silentRefresh();
    if (token !== null) {
      response = await rawFetch(path, init, token);
    }
    if (response.status === 401) {
      handlers.onAuthFailure();
      throw new ApiError(401, "Session expired");
    }
  }

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      // Keep the generic message when the body is not JSON.
    }
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
