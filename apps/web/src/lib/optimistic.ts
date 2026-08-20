/**
 * Shared optimistic-mutation boilerplate for list-backed resources.
 *
 * Pattern (React Query):
 * - onMutate: cancel in-flight queries, snapshot the cached list, then apply
 *   the optimistic change (append for create, patch for update, filter for
 *   delete) so the UI updates instantly, without waiting for the server.
 * - onError: roll back to the snapshot and surface a toast.
 * - onSettled: invalidate so server truth re-reconciles the cache.
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";

type List<T> = T[];

interface OptimisticConfig<TData, TItem, TVariables> {
  /** Query key of the cached list being mutated. */
  queryKey: readonly unknown[];
  /** Network call. */
  mutationFn: (vars: TVariables) => Promise<TData>;
  /** Apply the optimistic change to the cached list. */
  optimisticApply: (previous: List<TItem>, vars: TVariables) => List<TItem>;
  /** Human labels used in the toasts. */
  successMessage: string;
  errorMessage: (error: unknown) => string;
}

export function useOptimisticListMutation<TData, TItem, TVariables>(
  config: OptimisticConfig<TData, TItem, TVariables>,
): ReturnType<
  typeof useMutation<
    TData,
    unknown,
    TVariables,
    { previous?: List<TItem> }
  >
> {
  const queryClient = useQueryClient();

  const options: UseMutationOptions<
    TData,
    unknown,
    TVariables,
    { previous?: List<TItem> }
  > = {
    mutationFn: config.mutationFn,
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: config.queryKey });
      const previous = queryClient.getQueryData<List<TItem>>(config.queryKey);
      queryClient.setQueryData<List<TItem>>(config.queryKey, (old) =>
        config.optimisticApply(old ?? [], vars),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(config.queryKey, context.previous);
      }
      toast.error(config.errorMessage(error));
    },
    onSuccess: () => {
      toast.success(config.successMessage);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: config.queryKey });
    },
  };

  return useMutation(options);
}

/** Pull a readable detail message out of our ApiError (or a generic one). */
export function describeError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
