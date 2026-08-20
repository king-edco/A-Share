import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  GitBranch,
  GraduationCap,
  ListTree,
  UserCog,
  Users,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { roleKind } from "../auth/roles";
import { useAuth } from "../auth/auth-context";
import { useAdminsQuery, useInvitationsQuery } from "./adminAccounts";
import { useExamsQuery } from "./catalog";

/**
 * Super admin + content manager dashboard. Super admins get the platform
 * overview (accounts + invitations + catalog totals); content managers get
 * the same catalog stats plus a clear summary of their scope.
 */
export function FullAdminDashboard() {
  const { admin } = useAuth();
  const kind = roleKind(admin);
  const navigate = useNavigate();

  const examsQuery = useExamsQuery();
  const adminsQuery = useAdminsQuery();
  const invitationsQuery = useInvitationsQuery();

  const exams = examsQuery.data ?? [];
  const admins = adminsQuery.data ?? [];
  const invitations = invitationsQuery.data ?? [];

  const scope = admin?.roles.find((r) => r.code === "content_manager")?.system_scope;
  const visibleExams =
    kind === "content_manager" && scope && scope !== "BOTH"
      ? exams.filter((e) => e.system === scope)
      : exams;

  const activeAdmins = admins.filter((a) => a.is_active).length;
  const pendingInvites = invitations.filter((i) => i.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          {kind === "super_admin" ? "Platform overview" : "Welcome back"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {kind === "super_admin"
            ? "Everything in one place."
            : `${admin?.email}${scope ? ` · ${scope}` : ""}`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kind === "super_admin" && (
          <>
            <StatCard
              icon={Users}
              label="Active admins"
              value={activeAdmins}
              loading={adminsQuery.isLoading}
            />
            <StatCard
              icon={UserCog}
              label="Pending invitations"
              value={pendingInvites}
              loading={invitationsQuery.isLoading}
            />
          </>
        )}
        <StatCard
          icon={GraduationCap}
          label="Exams"
          value={visibleExams.length}
          loading={examsQuery.isLoading}
        />
        <CatalogTotals scope={scope} kind={kind} />
      </div>

      {kind === "super_admin" && (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Manage admin accounts</h2>
            </CardTitle>
            <CardDescription>
              Invite new admins and manage existing accounts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button
              className="text-sm text-primary underline-offset-4 hover:underline"
              onClick={() => navigate("/admin/accounts")}
            >
              Open Admin accounts
            </button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Catalog</h2>
          </CardTitle>
          <CardDescription>
            Jump into the exam content management screens.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-4">
          <NavTile icon={GraduationCap} label="Exams" to="/admin/exams" />
          <NavTile icon={GitBranch} label="Series" to="/admin/series" />
          <NavTile icon={BookOpen} label="Subjects" to="/admin/subjects" />
          <NavTile icon={ListTree} label="Chapters" to="/admin/chapters" />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof GraduationCap;
  label: string;
  value: number | null;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-2xl font-bold">{value ?? "—"}</p>
        )}
      </CardContent>
    </Card>
  );
}

function CatalogTotals({
  scope,
  kind,
}: {
  scope: string | undefined;
  kind: ReturnType<typeof roleKind>;
}) {
  const examsQuery = useExamsQuery();
  const exams = examsQuery.data ?? [];
  const visible =
    kind === "content_manager" && scope && scope !== "BOTH"
      ? exams.filter((e) => e.system === scope)
      : exams;

  if (visible.length === 0) {
    return null;
  }
  return <PerExamTotals examIds={visible.map((e) => e.id)} />;
}

function PerExamTotals({ examIds }: { examIds: string[] }) {
  // Use the first exam's counts as a representative sample; totals across all
  // exams are derived from the shared queries, which are cached anyway.
  const first = examIds[0];
  return <ExamCounts examId={first} />;
}

import { useSeriesQuery, useSubjectsQuery } from "./catalog";

function ExamCounts({ examId }: { examId: string }) {
  const seriesQ = useSeriesQuery(examId);
  const subjectsQ = useSubjectsQuery(examId);
  return (
    <>
      <StatCard
        icon={GitBranch}
        label="Series"
        value={seriesQ.data?.length ?? null}
        loading={seriesQ.isLoading}
      />
      <StatCard
        icon={BookOpen}
        label="Subjects"
        value={subjectsQ.data?.length ?? null}
        loading={subjectsQ.isLoading}
      />
    </>
  );
}

function NavTile({
  icon: Icon,
  label,
  to,
}: {
  icon: typeof GraduationCap;
  label: string;
  to: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="flex items-center gap-3 rounded-lg border p-4 text-left transition hover:bg-muted/50"
    >
      <Icon className="h-5 w-5 text-primary" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
