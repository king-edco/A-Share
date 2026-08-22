import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, GitBranch } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOnboardingSeriesQuery } from "../catalog";
import { useOnboardingStore } from "../store";
import type { Series } from "@/lib/types";

export function SeriesStep({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { data, set } = useOnboardingStore();
  const seriesQuery = useOnboardingSeriesQuery(data.examId);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(
    data.seriesId ?? null,
  );

  const series = useMemo(() => seriesQuery.data ?? [], [seriesQuery.data]);

  const { roots, childrenOf } = useMemo(() => {
    const byParent = new Map<string | null, Series[]>();
    for (const s of series) {
      const key = s.parent_series_id;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(s);
    }
    return {
      roots: byParent.get(null) ?? [],
      childrenOf: (id: string) => byParent.get(id) ?? [],
    };
  }, [series]);

  const parent: Series | null = selectedParentId
    ? (series.find((s) => s.id === selectedParentId) ?? null)
    : null;
  const children = parent ? childrenOf(parent.id) : [];

  function chooseRoot(item: Series) {
    const kids = childrenOf(item.id);
    if (kids.length > 0) {
      // Drill down within the same step, do not advance the wizard step.
      setSelectedParentId(item.id);
    } else {
      set({
        seriesId: item.id,
        seriesLabel: item.label,
      });
      onNext();
    }
  }

  function chooseChild(item: Series) {
    set({
      seriesId: item.id,
      seriesLabel: item.label,
    });
    onNext();
  }

  function resetToRoots() {
    setSelectedParentId(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Choisis ta série</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ta filière décide de ton programme de révision.
        </p>
      </div>

      {seriesQuery.isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      )}

      {seriesQuery.isError && (
        <ErrorState
          message="Impossible de charger les séries pour cet examen."
          onRetry={() => void seriesQuery.refetch()}
        />
      )}

      {seriesQuery.isSuccess && roots.length === 0 && (
        <EmptyState
          icon={GitBranch}
          title="Aucune série disponible pour le moment"
          description="Cet examen n'a pas encore de filières configurées. Retourne en arrière pour choisir un autre examen."
        />
      )}

      {seriesQuery.isSuccess && roots.length > 0 && (
        <AnimatePresence mode="wait">
          {parent === null ? (
            <motion.div
              key="roots"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              {roots.map((item) => (
                <button
                  key={item.id}
                  onClick={() => chooseRoot(item)}
                  className={`w-full rounded-xl border p-4 text-left transition hover:border-primary/50 hover:bg-muted/40 ${
                    data.seriesId === item.id ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{item.code}</p>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                    </div>
                    {childrenOf(item.id).length > 0 && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="children"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <button
                  onClick={resetToRoots}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Séries
                </button>
                <ChevronRight className="h-3 w-3" />
                <span>{parent.code}</span>
              </div>
              {children.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Aucune sous-série ici — tu peux confirmer{" "}
                  <strong>{parent.code}</strong> ou retourner au choix précédent.
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => chooseChild(parent)}>
                      Confirmer {parent.code}
                    </Button>
                    <Button size="sm" variant="outline" onClick={resetToRoots}>
                      Retour
                    </Button>
                  </div>
                </div>
              ) : (
                children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => chooseChild(child)}
                    className="w-full rounded-xl border p-4 text-left transition hover:border-primary/50 hover:bg-muted/40"
                  >
                    <p className="font-semibold">{child.code}</p>
                    <p className="text-xs text-muted-foreground">{child.label}</p>
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <Button variant="outline" onClick={onBack}>
        Retour
      </Button>
    </div>
  );
}
