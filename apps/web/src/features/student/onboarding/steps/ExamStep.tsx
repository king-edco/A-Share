import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

import { useOnboardingExamsQuery } from "../catalog";
import { useOnboardingStore } from "../store";
import type { Exam } from "@/lib/types";

export function ExamStep({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const examsQuery = useOnboardingExamsQuery();
  const { data, set } = useOnboardingStore();
  const exams = examsQuery.data ?? [];

  function pick(exam: Exam) {
    set({
      examId: exam.id,
      examName: exam.name,
      examSystem: exam.system,
    });
    onNext();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Quel examen prépares-tu ?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choisis l'examen qui t'attend.
        </p>
      </div>

      {examsQuery.isLoading && (
        <div className="grid gap-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      )}

      {examsQuery.isError && (
        <ErrorState
          message="Impossible de charger les examens. Vérifie ta connexion et réessaie."
          onRetry={() => void examsQuery.refetch()}
        />
      )}

      {examsQuery.isSuccess && exams.length === 0 && (
        <EmptyState
          icon={GraduationCap}
          title="Aucun examen disponible"
          description="Les examens n'ont pas encore été configurés. Réessaie plus tard."
        />
      )}

      {examsQuery.isSuccess && exams.length > 0 && (
        <div className="space-y-3">
          {exams.map((exam) => (
            <button
              key={exam.id}
              onClick={() => pick(exam)}
              className={`w-full rounded-xl border p-4 text-left transition hover:border-primary/50 hover:bg-muted/40 ${
                data.examId === exam.id ? "border-primary bg-primary/5" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{exam.name}</p>
                  <p className="text-xs text-muted-foreground">{exam.code}</p>
                </div>
                <Badge variant={exam.system === "FR" ? "default" : "secondary"}>
                  {exam.system}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}

      <Button variant="outline" onClick={onBack}>
        Retour
      </Button>
    </div>
  );
}
