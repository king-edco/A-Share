import { useEffect, useState } from "react";

type BackendStatus = "checking" | "ok" | "unreachable";

const API_URL: string = import.meta.env.VITE_API_URL ?? "";

export default function App() {
  const [status, setStatus] = useState<BackendStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_URL}/health`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Unexpected HTTP status ${response.status}`);
        }
        const body: unknown = await response.json();
        const isOk =
          typeof body === "object" &&
          body !== null &&
          (body as { status?: unknown }).status === "ok";
        if (!cancelled) {
          setStatus(isOk ? "ok" : "unreachable");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("unreachable");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center shadow-lg">
        <h1 className="text-2xl font-semibold tracking-tight">A-Share</h1>
        <p className="mt-1 text-sm text-slate-400">Exam-preparation platform</p>
        <p className="mt-6 text-lg font-medium">
          {status === "checking" && "Checking backend..."}
          {status === "ok" && (
            <span className="text-emerald-400">Backend: ok</span>
          )}
          {status === "unreachable" && (
            <span className="text-rose-400">Backend: unreachable</span>
          )}
        </p>
      </div>
    </main>
  );
}
