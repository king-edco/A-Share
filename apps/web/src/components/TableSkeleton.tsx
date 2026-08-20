import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton rows shown inside a table body while its query is loading. */
export function TableSkeleton({
  columns,
  rows = 5,
}: {
  columns: number;
  rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <tr key={row} className="border-b">
          {Array.from({ length: columns }).map((__, col) => (
            <td key={col} className="p-3">
              <Skeleton className="h-5 w-full max-w-[140px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
