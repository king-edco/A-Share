import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "react-router-dom";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { z } from "zod";

import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { TableSkeleton } from "@/components/TableSkeleton";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Subject } from "@/lib/types";
import {
  useCreateSubject,
  useDeleteSubject,
  useExamsQuery,
  useSubjectsQuery,
  useUpdateSubject,
} from "../catalog";
import { ExamSelector } from "../ExamSelector";

const subjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

export default function SubjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const examId = searchParams.get("examId");

  const examsQuery = useExamsQuery();
  const subjectsQuery = useSubjectsQuery(examId);

  const createSubject = useCreateSubject(examId ?? "");
  const updateSubject = useUpdateSubject(examId ?? "");
  const deleteSubject = useDeleteSubject(examId ?? "");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState<Subject | null>(null);

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { name: "" },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ name: "" });
    setDialogOpen(true);
  }

  function openEdit(subject: Subject) {
    setEditing(subject);
    form.reset({ name: subject.name });
    setDialogOpen(true);
  }

  function onSubmit(values: SubjectFormValues) {
    if (editing) {
      updateSubject.mutate(
        { id: editing.id, name: values.name },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      createSubject.mutate(values, { onSuccess: () => setDialogOpen(false) });
    }
  }

  const submitting = createSubject.isPending || updateSubject.isPending;
  const subjects = subjectsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Subjects</h1>
          <p className="text-sm text-muted-foreground">
            Manage the subjects belonging to one exam.
          </p>
        </div>
        <Button onClick={openCreate} disabled={!examId}>
          <Plus className="mr-2 h-4 w-4" />
          Create subject
        </Button>
      </div>

      <ExamSelector
        label="Exam"
        value={examId}
        onChange={(next) => {
          setSearchParams(next ? { examId: next } : {});
        }}
      />

      {!examId && examsQuery.isSuccess && (
        <EmptyState
          icon={BookOpen}
          title="Select an exam"
          description="Choose an exam above to view and manage its subjects."
        />
      )}

      {examId && subjectsQuery.isLoading && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableSkeleton columns={3} />
            </TableBody>
          </Table>
        </div>
      )}

      {examId && subjectsQuery.isError && (
        <ErrorState
          message="The subjects for this exam could not be loaded."
          onRetry={() => void subjectsQuery.refetch()}
        />
      )}

      {examId && subjectsQuery.isSuccess && subjects.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="No subjects yet"
          description="Create the first subject for this exam."
          action={{ label: "Create a subject", onClick: openCreate }}
        />
      )}

      {examId && subjectsQuery.isSuccess && subjects.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell className="font-medium">{subject.name}</TableCell>
                  <TableCell>
                    <Badge variant={subject.is_active ? "default" : "secondary"}>
                      {subject.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${subject.name}`}
                        onClick={() => openEdit(subject)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Deactivate ${subject.name}`}
                        onClick={() => setDeleting(subject)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit subject" : "Create subject"}</DialogTitle>
            <DialogDescription>
              {editing
                ? `Update the name of ${editing.name}.`
                : "Add a new subject to this exam."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Mathematics" {...field} />
                    </FormControl>
                    <FormMessage />
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
                    : editing
                      ? "Save changes"
                      : "Create subject"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        resourceName={deleting?.name ?? ""}
        loading={deleteSubject.isPending}
        onConfirm={() => {
          if (deleting) {
            deleteSubject.mutate({ id: deleting.id });
            setDeleting(null);
          }
        }}
      />
    </div>
  );
}
