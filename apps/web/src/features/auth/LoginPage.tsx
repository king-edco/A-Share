import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { ApiError } from "../../lib/api";
import { useAuth } from "./auth-context";

export default function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // An already-authenticated admin has no business on the login page.
  if (status === "authenticated") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "Invalid email or password."
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 ring-1 ring-sky-400/30">
            <span className="text-xl font-bold text-sky-400">A</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            A-Share Admin
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Sign in to manage exam content
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl"
          noValidate={false}
        >
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
            >
              {error}
            </div>
          )}

          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-300"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            placeholder="admin@example.com"
          />

          <label
            htmlFor="password"
            className="mt-4 block text-sm font-medium text-slate-300"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            placeholder="••••••••"
          />

          <button
            type="submit"
            disabled={submitting || !email || !password}
            className="mt-6 flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
