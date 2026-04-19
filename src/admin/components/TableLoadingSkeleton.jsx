import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function TableLoadingSkeleton({ rows = 6, columns = 6 }) {
  return (
    <div className="space-y-3 p-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`s-row-${rowIndex}`} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton key={`s-col-${rowIndex}-${columnIndex}`} className="h-7 w-full rounded-md bg-[#E7E2D8]" />
          ))}
        </div>
      ))}
    </div>
  );
}
