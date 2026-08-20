import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Exam } from "@/lib/types";
import {
  useCreateExam,
  useDeleteExam,
  useExamsQuery,
  useUpdateExam,
} from "../catalog";

const examSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  system: z.enum(["FR", "EN"], { message: "System is required" }),
});

type ExamFormValues = z.infer<typeof examSchema>;

export default function ExamsPage() {
  const examsQuery = useExamsQuery();
  const exams = examsQuery.data ?? [];

  const createExam = useCreateExam();
  const updateExam = useUpdateExam();
  const deleteExam = useDeleteExam();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [deleting, setDeleting] = useState<Exam | null>(null);

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: { code: "", name: "", system: "FR" },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ code: "", name: "", system: "FR" });
    setDialogOpen(true);
  }

  function openEdit(exam: Exam) {
    setEditing(exam);
    form.reset({ code: exam.code, name: exam.name, system: exam.system });
    setDialogOpen(true);
  }

  function onSubmit(values: ExamFormValues) {
    if (editing) {
      updateExam.mutate(
        { id: editing.id, name: values.name, system: values.system },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      createExam.mutate(values, { onSuccess: () => setDialogOpen(false) });
    }
  }

  const submitting = createExam.isPending || updateExam.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Exams</h1>
          <p className="text-sm text-muted-foreground">
            Manage the exam catalog offered on the platform.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create exam
        </Button>
      </div>

      {examsQuery.isLoading && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>System</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableSkeleton columns={5} />
            </TableBody>
          </Table>
        </div>
      )}

      {examsQuery.isError && (
        <ErrorState
          message="The exam list could not be loaded. Check that the API is reachable and try again."
          onRetry={() => void examsQuery.refetch()}
        />
      )}

      {examsQuery.isSuccess && exams.length === 0 && (
        <EmptyState
          icon={GraduationCap}
          title="No exams yet"
          description="Create the first exam (Bac, Probatoire, GCE, TVE) to start building the catalog."
          action={{ label: "Create your first exam", onClick: openCreate }}
        />
      )}

      {examsQuery.isSuccess && exams.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>System</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.map((exam) => (
                <TableRow key={exam.id}>
                  <TableCell className="font-medium">{exam.code}</TableCell>
                  <TableCell>{exam.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{exam.system}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={exam.is_active ? "default" : "secondary"}>
                      {exam.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${exam.code}`}
                        onClick={() => openEdit(exam)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Deactivate ${exam.code}`}
                        onClick={() => setDeleting(exam)}
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
            <DialogTitle>{editing ? "Edit exam" : "Create exam"}</DialogTitle>
            <DialogDescription>
              {editing
                ? `Update the details of ${editing.code}.`
                : "Add a new exam to the catalog."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="BAC" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Baccalauréat" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="system"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a system" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FR">FR (Francophone)</SelectItem>
                        <SelectItem value="EN">EN (Anglophone)</SelectItem>
                      </SelectContent>
                    </Select>
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
                      : "Create exam"}
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
        loading={deleteExam.isPending}
        onConfirm={() => {
          if (deleting) {
            deleteExam.mutate({ id: deleting.id });
            setDeleting(null);
          }
        }}
      />
    </div>
  );
}
