import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "react-router-dom";
import { ChevronRight, GitBranch, Pencil, Plus, Trash2 } from "lucide-react";
import { z } from "zod";

import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { Series } from "@/lib/types";
import {
  useCreateSeries,
  useDeleteSeries,
  useExamsQuery,
  useSeriesQuery,
  useUpdateSeries,
} from "../catalog";
import { ExamSelector } from "../ExamSelector";
import { SeriesPoolDialog } from "./SeriesPoolDialog";

const seriesSchema = z.object({
  code: z.string().min(1, "Code is required"),
  label: z.string().min(1, "Label is required"),
  stream_group: z.string().optional(),
  is_binding: z.boolean(),
  min_subjects: z.string().optional(),
  max_subjects: z.string().optional(),
});

type SeriesFormValues = z.infer<typeof seriesSchema>;

interface EditingContext {
  mode: "create-root" | "create-child" | "edit";
  series?: Series;
}

export default function SeriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const examId = searchParams.get("examId");

  const examsQuery = useExamsQuery();
  const seriesQuery = useSeriesQuery(examId);

  const createSeries = useCreateSeries(examId ?? "");
  const updateSeries = useUpdateSeries(examId ?? "");
  const deleteSeries = useDeleteSeries(examId ?? "");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EditingContext | null>(null);
  const [deleting, setDeleting] = useState<Series | null>(null);
  const [poolSeries, setPoolSeries] = useState<Series | null>(null);

  const form = useForm<SeriesFormValues>({
    resolver: zodResolver(seriesSchema),
    defaultValues: {
      code: "",
      label: "",
      stream_group: "",
      is_binding: true,
      min_subjects: "",
      max_subjects: "",
    },
  });

  const series = useMemo(() => seriesQuery.data ?? [], [seriesQuery.data]);

  // Build the tree from the flat list.
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

  function openCreateRoot() {
    setEditing({ mode: "create-root" });
    form.reset({
      code: "",
      label: "",
      stream_group: "",
      is_binding: true,
      min_subjects: "",
      max_subjects: "",
    });
    setDialogOpen(true);
  }

  function openCreateChild(parent: Series) {
    setEditing({ mode: "create-child", series: parent });
    form.reset({
      code: "",
      label: "",
      stream_group: parent.stream_group ?? "",
      is_binding: parent.is_binding,
      min_subjects: parent.min_subjects?.toString() ?? "",
      max_subjects: parent.max_subjects?.toString() ?? "",
    });
    setDialogOpen(true);
  }

  function openEdit(item: Series) {
    setEditing({ mode: "edit", series: item });
    form.reset({
      code: item.code,
      label: item.label,
      stream_group: item.stream_group ?? "",
      is_binding: item.is_binding,
      min_subjects: item.min_subjects?.toString() ?? "",
      max_subjects: item.max_subjects?.toString() ?? "",
    });
    setDialogOpen(true);
  }

  function onSubmit(values: SeriesFormValues) {
    const common = {
      code: values.code,
      label: values.label,
      stream_group: values.stream_group?.trim() || null,
      is_binding: values.is_binding,
      min_subjects: values.min_subjects ? Number(values.min_subjects) : null,
      max_subjects: values.max_subjects ? Number(values.max_subjects) : null,
    };
    if (editing?.mode === "edit" && editing.series) {
      updateSeries.mutate(
        { id: editing.series.id, ...common },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      const parent =
        editing?.mode === "create-child" ? editing.series!.id : null;
      createSeries.mutate(
        { exam_id: examId!, parent_series_id: parent, ...common },
        { onSuccess: () => setDialogOpen(false) },
      );
    }
  }

  const submitting = createSeries.isPending || updateSeries.isPending;

  function SeriesNode({ item, depth }: { item: Series; depth: number }) {
    const children = childrenOf(item.id);
    return (
      <li>
        <Collapsible>
          <div
            className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5"
            style={{ marginLeft: `${depth * 1.5}rem` }}
          >
            {children.length > 0 ? (
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label={`Toggle ${item.code} children`}
                >
                  <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
                </Button>
              </CollapsibleTrigger>
            ) : (
              <span className="w-6" />
            )}
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{item.code}</span>
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <div className="ml-auto flex items-center gap-2">
              {item.stream_group && (
                <Badge variant="outline">{item.stream_group}</Badge>
              )}
              <Badge variant={item.is_binding ? "default" : "secondary"}>
                {item.is_binding ? "Closed pool" : "Suggested pool"}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPoolSeries(item)}
              >
                Pool
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={`Add child to ${item.code}`}
                onClick={() => openCreateChild(item)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={`Edit ${item.code}`}
                onClick={() => openEdit(item)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={`Deactivate ${item.code}`}
                onClick={() => setDeleting(item)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
          {children.length > 0 && (
            <CollapsibleContent>
              <ul className="mt-2 space-y-2">
                {children.map((child) => (
                  <SeriesNode key={child.id} item={child} depth={depth + 1} />
                ))}
              </ul>
            </CollapsibleContent>
          )}
        </Collapsible>
      </li>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Series</h1>
          <p className="text-sm text-muted-foreground">
            Manage the filière hierarchy per exam.
          </p>
        </div>
        <Button onClick={openCreateRoot} disabled={!examId}>
          <Plus className="mr-2 h-4 w-4" />
          Add root series
        </Button>
      </div>

      <ExamSelector
        label="Exam"
        value={examId}
        onChange={(next) => {
          setSearchParams(next ? { examId: next } : {});
        }}
      />

      {examsQuery.isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {!examId && examsQuery.isSuccess && (
        <EmptyState
          icon={GitBranch}
          title="Select an exam"
          description="Choose an exam above to view and manage its series hierarchy."
        />
      )}

      {examId && seriesQuery.isLoading && (
        <div className="rounded-lg border p-4">
          <ul className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </ul>
        </div>
      )}

      {examId && seriesQuery.isError && (
        <ErrorState
          message="The series list for this exam could not be loaded."
          onRetry={() => void seriesQuery.refetch()}
        />
      )}

      {examId && seriesQuery.isSuccess && roots.length === 0 && (
        <EmptyState
          icon={GitBranch}
          title="No series yet"
          description="Add the first root series for this exam."
          action={{ label: "Add root series", onClick: openCreateRoot }}
        />
      )}

      {examId && seriesQuery.isSuccess && roots.length > 0 && (
        <ul className="space-y-2">
          {roots.map((root) => (
            <SeriesNode key={root.id} item={root} depth={0} />
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing?.mode === "edit" ? "Edit series" : "Add series"}
            </DialogTitle>
            <DialogDescription>
              {editing?.mode === "edit"
                ? `Update the details of ${editing.series?.code}.`
                : editing?.mode === "create-child"
                  ? `New child series under ${editing.series?.code}.`
                  : "New root series for this exam."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input placeholder="D" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Label</FormLabel>
                      <FormControl>
                        <Input placeholder="Série D" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="stream_group"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stream group (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="science / arts / technique" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="min_subjects"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min subjects (optional)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} placeholder="—" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="max_subjects"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max subjects (optional)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} placeholder="—" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="is_binding"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Closed subject pool</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Students can't add subjects outside the pool.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? "Saving…"
                    : editing?.mode === "edit"
                      ? "Save changes"
                      : "Add series"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        resourceName={deleting?.code ?? ""}
        loading={deleteSeries.isPending}
        onConfirm={() => {
          if (deleting) {
            deleteSeries.mutate({ id: deleting.id });
            setDeleting(null);
          }
        }}
      />

      <SeriesPoolDialog
        examId={examId}
        series={poolSeries}
        onOpenChange={(open) => !open && setPoolSeries(null)}
      />
    </div>
  );
}
