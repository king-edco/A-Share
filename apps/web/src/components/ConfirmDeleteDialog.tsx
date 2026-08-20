import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";

/**
 * Confirmation for soft deletes. Deletion deactivates the resource (it stops
 * appearing in active lists) but preserves the underlying data — so the copy
 * must not claim irreversibility.
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  resourceName,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceName: string;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate {resourceName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will deactivate <strong>{resourceName}</strong>. It will stop
            appearing in lists and student-facing selections, but its data is
            preserved and can be restored later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={buttonVariants({ variant: "destructive" })}
          >
            {loading ? "Deactivating…" : "Deactivate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
