import { BookOpen, ListTree } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "../auth/auth-context";
import { useChaptersQuery, useExamsQuery } from "./catalog";

/**
 * Contributor dashboard: only the subjects the admin is granted on.
 * Chapter management links into the existing Chapters screen scoped by
 * exam/subject query params (the backend already enforces the grants).
 */
export function ContributorDashboard() {
  const { admin } = useAuth();
  const grants = admin?.subject_grants ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">My subjects</h1>
        <p className="text-sm text-muted-foreground">
          The subjects you contribute to.
        </p>
      </div>

      {grants.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="No subjects assigned"
          description="You haven't been granted any subjects yet. Contact your administrator."
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {grants.map((grant) => (
          <SubjectCard key={grant.subject_id} grant={grant} />
        ))}
      </div>
    </div>
  );
}

function SubjectCard({
  grant,
}: {
  grant: { subject_id: string; subject_name: string; exam_code: string };
}) {
  const navigate = useNavigate();
  const chaptersQuery = useChaptersQuery(grant.subject_id);
  const examsQuery = useExamsQuery();
  const examId = (examsQuery.data ?? []).find((e) => e.code === grant.exam_code)?.id ?? "";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{grant.subject_name}</CardTitle>
          <Badge variant="outline">{grant.exam_code}</Badge>
        </div>
        <CardDescription>
          {chaptersQuery.isLoading ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            `${chaptersQuery.data?.length ?? 0} chapter${(chaptersQuery.data?.length ?? 0) === 1 ? "" : "s"}`
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chaptersQuery.isError ? (
          <ErrorState
            message="Could not load chapters."
            onRetry={() => void chaptersQuery.refetch()}
          />
        ) : (
          <Button
            size="sm"
            onClick={() =>
              navigate(
                `/admin/chapters?examId=${examId}&subjectId=${grant.subject_id}`,
              )
            }
          >
            <ListTree className="mr-2 h-4 w-4" />
            Manage chapters
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
