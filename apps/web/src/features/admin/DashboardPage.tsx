import { useAuth } from "../auth/auth-context";

const SCOPE_HINTS: Record<string, string> = {
  FR: "Francophone exams (Bac, Probatoire, TVE)",
  EN: "Anglophone exams (GCE A Level, GCE O Level)",
  BOTH: "All exam systems",
};

export default function DashboardPage() {
  const { admin } = useAuth();
  if (!admin) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Signed in as <span className="font-medium text-slate-700">{admin.email}</span>
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Your roles
        </h2>
        <ul className="mt-4 divide-y divide-slate-100">
          {admin.roles.map((role) => (
            <li
              key={role.code}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {role.label}
                </p>
                <p className="text-xs text-slate-500">{role.code}</p>
              </div>
              <div className="text-right">
                <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-600 ring-1 ring-sky-500/30">
                  {role.system_scope}
                </span>
                <p className="mt-1 text-xs text-slate-400">
                  {SCOPE_HINTS[role.system_scope] ?? "Exam system scope"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
        <h2 className="text-sm font-semibold text-slate-700">
          Content management is on its way
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Exam, series, subject, and chapter management screens will appear in
          the sidebar soon. They are visible there today as disabled previews.
        </p>
      </div>
    </div>
  );
}
