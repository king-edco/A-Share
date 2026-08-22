/**
 * Thin fetch wrapper for the student namespace.
 *
 * Mirrors the admin api client but attaches student tokens to
 * /api/v1/students/* paths, and does one silent refresh + retry on a 401.
 * Fully separate from the admin client (different refresh-token storage key).
 */

const API_URL: string = import.meta.env.VITE_API_URL ?? "";

export const STUDENT_REFRESH_TOKEN_KEY = "ashare.student_refresh_token";

export class StudentApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "StudentApiError";
    this.status = status;
  }
}

interface StudentHandlers {
  getAccessToken: () => string | null;
  setAccessToken: (token: string | null) => void;
  onAuthFailure: () => void;
}

let handlers: StudentHandlers = {
  getAccessToken: () => null,
  setAccessToken: () => undefined,
  onAuthFailure: () => undefined,
};

/** Called once by the student auth provider. */
export function configureStudentApi(next: StudentHandlers): void {
  handlers = next;
}

/** Attempt a silent refresh; resolves to the new access token or null. */
export async function studentSilentRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem(STUDENT_REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/student/refresh`, {
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

export async function studentApiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const auth = path.startsWith("/api/v1/students");
  let token = auth ? handlers.getAccessToken() : null;
  let response = await rawFetch(path, init, token);

  if (response.status === 401 && auth) {
    token = await studentSilentRefresh();
    if (token !== null) {
      response = await rawFetch(path, init, token);
    }
    if (response.status === 401) {
      handlers.onAuthFailure();
      throw new StudentApiError(401, "Session expired");
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
    throw new StudentApiError(response.status, detail);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
