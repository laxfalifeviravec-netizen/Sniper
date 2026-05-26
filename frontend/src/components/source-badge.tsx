import { cn } from "@/lib/utils";
import type { Source } from "@/types";
import { SOURCE_LABELS, SOURCE_COLORS } from "@/types";

interface SourceBadgeProps {
  source: Source;
  className?: string;
}

export function SourceBadge({ source, className }: SourceBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        SOURCE_COLORS[source],
        className
      )}
    >
      {SOURCE_LABELS[source]}
    </span>
  );
}
