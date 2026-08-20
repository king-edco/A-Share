import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, Trash2 } from "lucide-react";
import { z } from "zod";

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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { Series } from "@/lib/types";
import {
  useAttachSubjectToSeries,
  useDetachSubjectFromSeries,
  useSeriesSubjectsQuery,
  useSubjectsQuery,
  useUpdateSeriesSubjectLink,
} from "../catalog";

const attachSchema = z.object({
  subject_id: z.string().min(1, "Choose a subject"),
  coefficient: z.string().optional(),
  is_compulsory: z.boolean(),
  subject_category: z.string().optional(),
});

type AttachValues = z.infer<typeof attachSchema>;

const CATEGORY_NONE = "__none__";

export function SeriesPoolDialog({
  examId,
  series,
  onOpenChange,
}: {
  examId: string | null;
  series: Series | null;
  onOpenChange: (open: boolean) => void;
}) {
  const open = series !== null;
  const seriesId = series?.id ?? null;

  const poolQuery = useSeriesSubjectsQuery(seriesId);
  const subjectsQuery = useSubjectsQuery(examId);

  const attach = useAttachSubjectToSeries(seriesId ?? "");
  const detach = useDetachSubjectFromSeries(seriesId ?? "");
  const updateLink = useUpdateSeriesSubjectLink(seriesId ?? "");

  const [attachOpen, setAttachOpen] = useState(false);

  const form = useForm<AttachValues>({
    resolver: zodResolver(attachSchema),
    defaultValues: {
      subject_id: "",
      coefficient: "",
      is_compulsory: false,
      subject_category: CATEGORY_NONE,
    },
  });

  const pool = useMemo(() => poolQuery.data ?? [], [poolQuery.data]);
  const subjects = useMemo(() => subjectsQuery.data ?? [], [subjectsQuery.data]);

  const available = useMemo(() => {
    const inPool = new Set(pool.map((p) => p.subject_id));
    return subjects.filter((s) => !inPool.has(s.id));
  }, [pool, subjects]);

  // Reset the attach form whenever a different series is opened.
  useEffect(() => {
    if (series) {
      form.reset({
        subject_id: "",
        coefficient: "",
        is_compulsory: false,
        subject_category: CATEGORY_NONE,
      });
      setAttachOpen(false);
    }
  }, [series, form]);

  function onAttach(values: AttachValues) {
    attach.mutate(
      {
        seriesId: seriesId!,
        subject_id: values.subject_id,
        coefficient: values.coefficient ? Number(values.coefficient) : null,
        is_compulsory: values.is_compulsory,
        subject_category:
          values.subject_category === CATEGORY_NONE || !values.subject_category
            ? null
            : values.subject_category,
      },
      { onSuccess: () => setAttachOpen(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Subject pool · {series?.code}</DialogTitle>
          <DialogDescription>
            Manage which subjects belong to this series' pool and their link
            attributes. Removing a subject only detaches it from this pool.
          </DialogDescription>
        </DialogHeader>

        {poolQuery.isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {poolQuery.isError && (
          <ErrorState
            message="The pool could not be loaded."
            onRetry={() => void poolQuery.refetch()}
          />
        )}

        {poolQuery.isSuccess && pool.length === 0 && (
          <EmptyState
            icon={BookOpen}
            title="No subjects in this pool yet"
            description="Attach the first subject below."
          />
        )}

        {poolQuery.isSuccess && pool.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {pool.map((link) => (
              <li
                key={link.subject_id}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {link.name}
                </span>
                {link.subject_category && (
                  <Badge variant="outline">{link.subject_category}</Badge>
                )}
                <Input
                  className="w-24"
                  type="number"
                  step="0.5"
                  placeholder="coef"
                  defaultValue={link.coefficient ?? ""}
                  aria-label={`Coefficient for ${link.name}`}
                  onBlur={(e) => {
                    const value = e.target.value;
                    const current = link.coefficient ?? "";
                    if (value === current) return;
                    updateLink.mutate({
                      subject_id: link.subject_id,
                      coefficient: value ? Number(value) : null,
                    });
                  }}
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Compulsory</span>
                  <Switch
                    checked={link.is_compulsory}
                    aria-label={`Compulsory for ${link.name}`}
                    onCheckedChange={(checked) =>
                      updateLink.mutate({
                        subject_id: link.subject_id,
                        is_compulsory: checked,
                      })
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${link.name} from pool`}
                  onClick={() => detach.mutate({ subject_id: link.subject_id })}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Separator />

        {!attachOpen ? (
          <Button
            variant="outline"
            onClick={() => setAttachOpen(true)}
            disabled={available.length === 0}
          >
            Attach a subject
          </Button>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onAttach)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="subject_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {available.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="coefficient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coefficient (optional)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" placeholder="—" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="subject_category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category (optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={CATEGORY_NONE}>None</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="related_professional">
                            Related professional
                          </SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_compulsory"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <FormLabel className="text-sm">Compulsory</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAttachOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={attach.isPending}>
                  {attach.isPending ? "Attaching…" : "Attach subject"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
