import { AlertCircle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Inline error for a failed list query, with a retry action. */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-destructive/10 p-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-base font-semibold">Couldn't load this list</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      <Button onClick={onRetry} variant="outline" size="sm" className="mt-4">
        <RotateCcw className="mr-2 h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
