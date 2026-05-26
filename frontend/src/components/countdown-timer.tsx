"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { cn, formatTimeRemaining } from "@/lib/utils";

interface CountdownTimerProps {
  endDate: string;
  className?: string;
  showIcon?: boolean;
}

export function CountdownTimer({
  endDate,
  className,
  showIcon = true,
}: CountdownTimerProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { display, urgency } = formatTimeRemaining(endDate);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm font-medium tabular-nums",
        urgency === "normal" && "text-zinc-400",
        urgency === "warning" && "text-amber-400",
        urgency === "critical" && "text-red-400",
        className
      )}
    >
      {showIcon && <Clock className="h-3.5 w-3.5 shrink-0" />}
      {display}
    </span>
  );
}
