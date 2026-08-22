import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useOnboardingPoolQuery,
  useOnboardingSeriesQuery,
  useOnboardingSubjectsQuery,
} from "../catalog";
import { useOnboardingStore } from "../store";
import { BookOpen } from "lucide-react";

export function SubjectsStep({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { data, set } = useOnboardingStore();
  const seriesQuery = useOnboardingSeriesQuery(data.examId);
  const poolQuery = useOnboardingPoolQuery(data.seriesId);
  const extrasQuery = useOnboardingSubjectsQuery(
    seriesQuery.data?.find((s) => s.id === data.seriesId && !s.is_binding)
      ? data.examId
      : null,
  );

  const series = seriesQuery.data?.find((s) => s.id === data.seriesId);
  const pool = useMemo(() => poolQuery.data ?? [], [poolQuery.data]);
  const extras = useMemo(() => extrasQuery.data ?? [], [extrasQuery.data]);
  const poolIds = useMemo(() => new Set(pool.map((p) => p.subject_id)), [pool]);
  const extrasAvailable = useMemo(
    () => extras.filter((s) => !poolIds.has(s.id)),
    [extras, poolIds],
  );

  const compulsoryIds = useMemo(
    () => new Set(pool.filter((p) => p.is_compulsory).map((p) => p.subject_id)),
    [pool],
  );

  // Compulsory subjects are pre-checked from the start and cannot be
  // unchecked — the student only chooses among optional/extra subjects.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set([...compulsoryIds, ...data.subjectIds]),
  );

  // The pool loads asynchronously: backfill compulsory ids when it arrives.
  useEffect(() => {
    if (compulsoryIds.size === 0) return;
    setSelected((prev) => new Set([...prev, ...compulsoryIds]));
  }, [compulsoryIds]);

  const minSubjects = series?.min_subjects ?? null;
  const maxSubjects = series?.max_subjects ?? null;
  const count = selected.size;
  const belowMin = minSubjects !== null && count < minSubjects;
  const aboveMax = maxSubjects !== null && count >= maxSubjects;

  function toggle(subjectId: string, compulsory: boolean) {
    if (compulsory) return; // locked
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        if (aboveMax) return prev;
        next.add(subjectId);
      }
      return next;
    });
  }

  function confirm() {
    set({ subjectIds: Array.from(selected) });
    onNext();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Tes matières</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Les matières que tu veux réviser.
        </p>
      </div>

      {(poolQuery.isLoading || seriesQuery.isLoading) && (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      )}

      {(poolQuery.isError || seriesQuery.isError) && (
        <ErrorState
          message="Impossible de charger les matières de cette série."
          onRetry={() => {
            void seriesQuery.refetch();
            void poolQuery.refetch();
          }}
        />
      )}

      {poolQuery.isSuccess && pool.length === 0 && extrasAvailable.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="Aucune matière disponible pour le moment"
          description="Cette série n'a pas encore de matières configurées."
        />
      )}

      {poolQuery.isSuccess && pool.length > 0 && (
        <div className="space-y-3">
          {pool.map((link) => (
            <SubjectRow
              key={link.subject_id}
              name={link.name}
              selected={selected.has(link.subject_id)}
              compulsory={link.is_compulsory}
              onToggle={() => toggle(link.subject_id, link.is_compulsory)}
            />
          ))}
        </div>
      )}

      {extrasAvailable.length > 0 && (
        <div className="space-y-3 border-t border-dashed pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ajouter d'autres matières
          </p>
          {extrasAvailable.map((subject) => (
            <SubjectRow
              key={subject.id}
              name={subject.name}
              selected={selected.has(subject.id)}
              compulsory={false}
              onToggle={() => toggle(subject.id, false)}
            />
          ))}
        </div>
      )}

      {(minSubjects !== null || maxSubjects !== null) && (
        <p
          className={`text-sm font-medium ${
            belowMin ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {count}/{maxSubjects ?? "∞"} sélectionnée{count > 1 ? "s" : ""}
          {belowMin && ` (au moins ${minSubjects} requise${minSubjects > 1 ? "s" : ""})`}
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>
          Retour
        </Button>
        <Button onClick={confirm} disabled={belowMin || count === 0} className="flex-1">
          Continuer
        </Button>
      </div>
    </div>
  );
}

function SubjectRow({
  name,
  selected,
  compulsory,
  onToggle,
}: {
  name: string;
  selected: boolean;
  compulsory: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={compulsory}
      className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition ${
        selected ? "border-primary bg-primary/5" : "hover:bg-muted/40"
      } ${compulsory ? "cursor-not-allowed opacity-90" : ""}`}
    >
      <span className="font-medium">{name}</span>
      <div className="flex items-center gap-2">
        {compulsory && (
          <Badge variant="secondary" className="text-[10px]">
            obligatoire
          </Badge>
        )}
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full border ${
            selected ? "border-primary bg-primary text-primary-foreground" : "border-input"
          }`}
        >
          {selected && <Check className="h-3 w-3" />}
        </span>
      </div>
    </button>
  );
}
