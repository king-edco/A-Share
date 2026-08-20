import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "react-router-dom";
import { ListTree, Pencil, Plus, Trash2 } from "lucide-react";
import { z } from "zod";

import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Chapter } from "@/lib/types";
import {
  useChaptersQuery,
  useCreateChapter,
  useDeleteChapter,
  useExamsQuery,
  useSubjectsQuery,
  useUpdateChapter,
} from "../catalog";
import { ExamSelector } from "../ExamSelector";

const chapterSchema = z.object({
  title: z.string().min(1, "Title is required"),
  parent_chapter_id: z.string().optional(),
  order_index: z.string(),
  syllabus_year: z.string().optional(),
});

type ChapterFormValues = z.infer<typeof chapterSchema>;

interface EditingContext {
  mode: "create" | "edit";
  chapter?: Chapter;
}

const ROOT_VALUE = "__root__";

export default function ChaptersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const examId = searchParams.get("examId");
  const subjectId = searchParams.get("subjectId");

  const examsQuery = useExamsQuery();
  const subjectsQuery = useSubjectsQuery(examId);
  const chaptersQuery = useChaptersQuery(subjectId);

  const createChapter = useCreateChapter(subjectId ?? "");
  const updateChapter = useUpdateChapter(subjectId ?? "");
  const deleteChapter = useDeleteChapter(subjectId ?? "");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EditingContext | null>(null);
  const [deleting, setDeleting] = useState<Chapter | null>(null);

  const form = useForm<ChapterFormValues>({
    resolver: zodResolver(chapterSchema),
    defaultValues: {
      title: "",
      parent_chapter_id: ROOT_VALUE,
      order_index: "0",
      syllabus_year: "",
    },
  });

  const chapters = useMemo(
    () => chaptersQuery.data ?? [],
    [chaptersQuery.data],
  );

  // Sort so parents appear before their children, with a computed depth for
  // indentation. This mirrors how the syllabus reads, not a collapsible tree.
  const ordered = useMemo(() => {
    const byParent = new Map<string | null, Chapter[]>();
    for (const c of chapters) {
      const key = c.parent_chapter_id;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(c);
    }
    const out: { chapter: Chapter; depth: number }[] = [];
    function walk(parent: string | null, depth: number) {
      const nodes = (byParent.get(parent) ?? [])
        .slice()
        .sort((a, b) => a.order_index - b.order_index || a.title.localeCompare(b.title));
      for (const node of nodes) {
        out.push({ chapter: node, depth });
        walk(node.id, depth + 1);
      }
    }
    walk(null, 0);
    return out;
  }, [chapters]);

  function openCreate() {
    setEditing({ mode: "create" });
    form.reset({
      title: "",
      parent_chapter_id: ROOT_VALUE,
      order_index: String(ordered.length),
      syllabus_year: "",
    });
    setDialogOpen(true);
  }

  function openEdit(chapter: Chapter) {
    setEditing({ mode: "edit", chapter });
    form.reset({
      title: chapter.title,
      parent_chapter_id: chapter.parent_chapter_id ?? ROOT_VALUE,
      order_index: String(chapter.order_index),
      syllabus_year: chapter.syllabus_year?.toString() ?? "",
    });
    setDialogOpen(true);
  }

  function onSubmit(values: ChapterFormValues) {
    const common = {
      title: values.title,
      parent_chapter_id:
        values.parent_chapter_id === ROOT_VALUE || !values.parent_chapter_id
          ? null
          : values.parent_chapter_id,
      order_index: values.order_index ? Number(values.order_index) : 0,
      syllabus_year: values.syllabus_year ? Number(values.syllabus_year) : null,
    };
    if (editing?.mode === "edit" && editing.chapter) {
      updateChapter.mutate(
        { id: editing.chapter.id, ...common },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      createChapter.mutate(
        { subject_id: subjectId!, ...common },
        { onSuccess: () => setDialogOpen(false) },
      );
    }
  }

  const submitting = createChapter.isPending || updateChapter.isPending;

  const possibleParents = useMemo(
    () => chapters.filter((c) => editing?.mode !== "edit" || c.id !== editing.chapter?.id),
    [chapters, editing],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Chapters</h1>
          <p className="text-sm text-muted-foreground">
            Manage the syllabus chapter tree per subject.
          </p>
        </div>
        <Button onClick={openCreate} disabled={!subjectId}>
          <Plus className="mr-2 h-4 w-4" />
          Add chapter
        </Button>
      </div>

      <div className="flex gap-4">
        <ExamSelector
          label="Exam"
          value={examId}
          onChange={(next) => {
            setSearchParams(next ? { examId: next } : {});
          }}
        />
        <div className="w-72">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Subject
          </p>
          <Select
            value={subjectId ?? ""}
            onValueChange={(v) => {
              const next: Record<string, string> = { examId: examId! };
              if (v) next.subjectId = v;
              setSearchParams(next);
            }}
            disabled={!examId}
          >
            <SelectTrigger aria-label="Subject">
              <SelectValue placeholder="Select a subject…" />
            </SelectTrigger>
            <SelectContent>
              {(subjectsQuery.data ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!examId && examsQuery.isSuccess && (
        <EmptyState
          icon={ListTree}
          title="Select an exam"
          description="Choose an exam above, then a subject, to manage chapters."
        />
      )}

      {examId && !subjectId && subjectsQuery.isSuccess && (
        <EmptyState
          icon={ListTree}
          title="Select a subject"
          description="Choose a subject above to view and manage its chapters."
        />
      )}

      {subjectId && chaptersQuery.isLoading && (
        <ul className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </ul>
      )}

      {subjectId && chaptersQuery.isError && (
        <ErrorState
          message="The chapters for this subject could not be loaded."
          onRetry={() => void chaptersQuery.refetch()}
        />
      )}

      {subjectId && chaptersQuery.isSuccess && ordered.length === 0 && (
        <EmptyState
          icon={ListTree}
          title="No chapters yet"
          description="Add the first chapter for this subject."
          action={{ label: "Add a chapter", onClick: openCreate }}
        />
      )}

      {subjectId && chaptersQuery.isSuccess && ordered.length > 0 && (
        <ul className="space-y-2">
          {ordered.map(({ chapter, depth }) => (
            <li
              key={chapter.id}
              className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5"
              style={{ marginLeft: `${depth * 1.75}rem` }}
            >
              <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
                {chapter.order_index}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {chapter.title}
              </span>
              {chapter.syllabus_year && (
                <Badge variant="outline">{chapter.syllabus_year}</Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={`Edit ${chapter.title}`}
                onClick={() => openEdit(chapter)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={`Deactivate ${chapter.title}`}
                onClick={() => setDeleting(chapter)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing?.mode === "edit" ? "Edit chapter" : "Add chapter"}
            </DialogTitle>
            <DialogDescription>
              {editing?.mode === "edit"
                ? `Update the details of ${editing.chapter?.title}.`
                : "Add a new chapter to this subject."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Functions" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parent_chapter_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent chapter (optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Top-level chapter" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ROOT_VALUE}>Top-level chapter</SelectItem>
                        {possibleParents.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="order_index"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order index</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="syllabus_year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Syllabus year (optional)</FormLabel>
                      <FormControl>
                        <Input type="number" min={2000} placeholder="—" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
                      : "Add chapter"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        resourceName={deleting?.title ?? ""}
        loading={deleteChapter.isPending}
        onConfirm={() => {
          if (deleting) {
            deleteChapter.mutate({ id: deleting.id });
            setDeleting(null);
          }
        }}
      />
    </div>
  );
}
