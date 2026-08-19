import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../features/auth/AuthProvider";
import { REFRESH_TOKEN_KEY } from "../lib/api";
import AppRoutes from "../routes/AppRoutes";

const ADMIN = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "admin@example.com",
  roles: [{ code: "super_admin", label: "Super Admin", system_scope: "BOTH" }],
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Minimal mock of the backend auth endpoints. VITE_API_URL is unset in
 * tests, so requests arrive as path-only URLs.
 */
function installFetchMock() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const headers = new Headers(init?.headers);

      if (url === "/api/v1/auth/login" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as {
          email: string;
          password: string;
        };
        if (body.email === ADMIN.email && body.password === "correct-password") {
          return jsonResponse(200, {
            access_token: "at-1",
            refresh_token: "rt-1",
            token_type: "bearer",
          });
        }
        return jsonResponse(401, { detail: "Invalid credentials" });
      }

      if (url === "/api/v1/auth/refresh" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { refresh_token: string };
        if (body.refresh_token === "rt-1") {
          return jsonResponse(200, {
            access_token: "at-fresh",
            token_type: "bearer",
          });
        }
        return jsonResponse(401, { detail: "Invalid credentials" });
      }

      if (url === "/api/v1/auth/me") {
        if (headers.get("Authorization")?.startsWith("Bearer at-")) {
          return jsonResponse(200, ADMIN);
        }
        return jsonResponse(401, { detail: "Invalid or expired access token" });
      }

      // Health probe and anything else.
      return jsonResponse(404, {});
    }),
  );
}

function renderApp(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("auth flow", () => {
  beforeEach(() => {
    localStorage.clear();
    installFetchMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("logs in with valid credentials and lands on the dashboard", async () => {
    const user = userEvent.setup();
    renderApp("/login");

    await user.type(
      await screen.findByLabelText(/email/i),
      ADMIN.email,
    );
    await user.type(screen.getByLabelText(/password/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await screen.findByRole("heading", { name: /welcome back/i });
    expect(screen.getAllByText(ADMIN.email).length).toBeGreaterThan(0);
    // Role shown both in the topbar badge and the dashboard list.
    expect(screen.getAllByText("super_admin").length).toBeGreaterThan(0);
    expect(screen.getAllByText("BOTH").length).toBeGreaterThan(0);
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("rt-1");
  });

  it("shows an error and stays on /login with invalid credentials", async () => {
    const user = userEvent.setup();
    renderApp("/login");

    await user.type(await screen.findByLabelText(/email/i), ADMIN.email);
    await user.type(screen.getByLabelText(/password/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText("Invalid email or password."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /welcome back/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeEnabled();
  });

  it("redirects an unauthenticated visit to /admin/dashboard to /login", async () => {
    renderApp("/admin/dashboard");

    await screen.findByRole("button", { name: /sign in/i });
    expect(screen.getByRole("heading", { name: /a-share admin/i })).toBeInTheDocument();
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });

  it("rehydrates a stored refresh token instead of forcing a fresh login", async () => {
    localStorage.setItem(REFRESH_TOKEN_KEY, "rt-1");
    renderApp("/admin/dashboard");

    await screen.findByRole("heading", { name: /welcome back/i });
    expect(screen.getAllByText(ADMIN.email).length).toBeGreaterThan(0);
  });

  it("logs out, clears the session, and redirects to /login", async () => {
    const user = userEvent.setup();
    renderApp("/login");

    await user.type(await screen.findByLabelText(/email/i), ADMIN.email);
    await user.type(screen.getByLabelText(/password/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    await screen.findByRole("heading", { name: /welcome back/i });

    await user.click(screen.getByRole("button", { name: /log out/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument(),
    );
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });
});
