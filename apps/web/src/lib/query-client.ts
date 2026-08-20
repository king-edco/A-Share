import { QueryClient } from "@tanstack/react-query";

/** Catalog data changes rarely, so a few minutes of freshness is fine. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
