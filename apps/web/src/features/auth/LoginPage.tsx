import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

import { ApiError } from "../../lib/api";
import { useAuth } from "./auth-context";

export default function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
          ? "Invalid email or password. Please check your credentials."
          : "An unexpected error occurred. Please try again later.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Derived state to keep the button disabled logic clean
  const isFormValid = email.trim().length > 0 && password.length > 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 ring-1 ring-sky-400/30 shadow-lg shadow-sky-500/10">
            <span className="text-2xl font-bold text-sky-400">A</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to the A-Share Admin dashboard
          </p>
        </div>

        {/* Form Section */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl"
          noValidate
        >
          {/* Error Alert */}
          {error && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 animate-in fade-in slide-in-from-top-2"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          )}

          <div className="space-y-5">
            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-slate-300"
              >
                Email address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-slate-500" aria-hidden="true" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-sky-500 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-slate-300"
              >
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-slate-500" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 py-2.5 pl-10 pr-12 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-sky-500 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-300 focus:outline-none focus-visible:text-sky-400"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !isFormValid}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign in to Dashboard</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
