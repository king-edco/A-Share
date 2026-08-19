import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ApiError } from "../../lib/api";
import { useAuth } from "./auth-context";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // An already-authenticated admin has no business on the login page.
  if (status === "authenticated") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  async function onSubmit(values: LoginValues) {
    setError(null);
    setSubmitting(true);
    try {
      await login(values.email.trim(), values.password);
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
        </div>

        <Card className="border-slate-800 bg-slate-900 text-slate-100">
          <CardHeader className="text-center">
            <CardTitle>
              <h1>A-Share Admin</h1>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Sign in to manage exam content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {error && (
                  <div
                    role="alert"
                    className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground"
                  >
                    {error}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder="admin@example.com"
                          className="border-slate-700 bg-slate-950 placeholder:text-slate-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="current-password"
                          placeholder="••••••••"
                          className="border-slate-700 bg-slate-950 placeholder:text-slate-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    !form.watch("email") ||
                    !form.watch("password")
                  }
                  className="w-full"
                >
                  {submitting ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
