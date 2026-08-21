import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Check } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

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
import { useExamsQuery, useSubjectsQuery } from "../catalog";
import { useCreateInvitation } from "../adminAccounts";

const inviteSchema = z
  .object({
    email: z.string().email("Enter a valid email"),
    // Inviting another super_admin is not allowed; the bootstrap super
    // admin remains the only one by design.
    role_code: z.enum(["content_manager", "contributor"]),
    system_scope: z.enum(["FR", "EN", "BOTH"]).optional(),
    exam_id: z.string().optional(),
    subject_id: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.role_code === "contributor" && !values.subject_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["subject_id"],
        message: "Choose a subject for the contributor",
      });
    }
    if (values.role_code !== "contributor" && !values.system_scope) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["system_scope"],
        message: "Choose a scope for this role",
      });
    }
  });

type InviteValues = z.infer<typeof inviteSchema>;

export function InviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createInvitation = useCreateInvitation();
  const examsQuery = useExamsQuery();
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role_code: "content_manager", system_scope: "BOTH" },
  });

  const roleCode = form.watch("role_code");
  const examId = form.watch("exam_id") || null;
  const subjectsQuery = useSubjectsQuery(roleCode === "contributor" ? examId : null);

  function onSubmit(values: InviteValues) {
    createInvitation.mutate(
      {
        email: values.email,
        role_code: values.role_code,
        system_scope:
          values.role_code === "contributor" ? null : (values.system_scope ?? null),
        subject_ids:
          values.role_code === "contributor" && values.subject_id
            ? [values.subject_id]
            : null,
      },
      {
        onSuccess: (data) => {
          setCreatedUrl(data.invite_url);
        },
      },
    );
  }

  function close(next: boolean) {
    if (!next) {
      setCreatedUrl(null);
      setCopied(false);
      form.reset({ email: "", role_code: "content_manager", system_scope: "BOTH" });
    }
    onOpenChange(next);
  }

  async function copy() {
    if (!createdUrl) return;
    await navigator.clipboard.writeText(createdUrl);
    setCopied(true);
    toast.success("Invite URL copied");
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite an admin</DialogTitle>
          <DialogDescription>
            The invitee will receive a one-time link to create their account.
          </DialogDescription>
        </DialogHeader>

        {createdUrl ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Share this link with the invitee. It expires in 7 days and works once.
            </p>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3">
              <code className="flex-1 break-all text-xs">{createdUrl}</code>
              <Button size="icon" variant="ghost" onClick={copy} aria-label="Copy invite URL">
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => close(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="admin@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="content_manager">Content Manager</SelectItem>
                        <SelectItem value="contributor">Contributor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {roleCode !== "contributor" && (
                <FormField
                  control={form.control}
                  name="system_scope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>System scope</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a scope" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BOTH">BOTH (all systems)</SelectItem>
                          <SelectItem value="FR">FR (Francophone)</SelectItem>
                          <SelectItem value="EN">EN (Anglophone)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {roleCode === "contributor" && (
                <>
                  <FormField
                    control={form.control}
                    name="exam_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exam</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose an exam" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(examsQuery.data ?? []).map((e) => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.code} — {e.name}
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
                    name="subject_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={!examId}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  examId ? "Choose a subject" : "Select an exam first"
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(subjectsQuery.data ?? []).map((s) => (
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
                </>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => close(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createInvitation.isPending}>
                  {createInvitation.isPending ? "Creating…" : "Create invitation"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
