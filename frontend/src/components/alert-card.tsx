"use client";

import Link from "next/link";
import { Bell, ChevronRight, MessageSquare, Trash2 } from "lucide-react";
import { SourceBadge } from "./source-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/lib/utils";
import type { Alert, Source } from "@/types";
import { useState } from "react";

interface AlertCardProps {
  alert: Alert;
  onToggleActive?: (id: string, active: boolean) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function AlertCard({ alert, onToggleActive, onDelete }: AlertCardProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { filters } = alert;

  const handleToggle = async (checked: boolean) => {
    if (!onToggleActive) return;
    setIsToggling(true);
    try {
      await onToggleActive(alert.id, checked);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm(`Delete alert "${alert.name}"?`)) return;
    setIsDeleting(true);
    try {
      await onDelete(alert.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const makeModel = [filters.make, filters.model].filter(Boolean).join(" ");
  const yearRange =
    filters.year_min && filters.year_max
      ? `${filters.year_min}–${filters.year_max}`
      : filters.year_min
      ? `${filters.year_min}+`
      : filters.year_max
      ? `up to ${filters.year_max}`
      : null;

  return (
    <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-4 transition-colors hover:border-zinc-700">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-zinc-100 truncate">{alert.name}</h3>
            {alert.active ? (
              <Badge variant="success" className="shrink-0">Active</Badge>
            ) : (
              <Badge variant="secondary" className="shrink-0">Paused</Badge>
            )}
            {alert.match_count !== undefined && (
              <span className="text-xs text-zinc-400">
                {alert.match_count} matches
              </span>
            )}
          </div>

          {/* Filter summary */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {makeModel && (
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                {makeModel}
              </span>
            )}
            {yearRange && (
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                {yearRange}
              </span>
            )}
            {filters.mileage_max && (
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                &lt;{filters.mileage_max.toLocaleString()} mi
              </span>
            )}
            {filters.transmissions?.map((tx) => (
              <span key={tx} className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                {tx.toUpperCase()}
              </span>
            ))}
            {filters.colors?.map((c) => (
              <span key={c} className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                {c}
              </span>
            ))}
            {filters.exclude_stories && (
              <span className="rounded bg-green-900/50 border border-green-800 px-2 py-0.5 text-xs text-green-400">
                No Stories
              </span>
            )}
            {filters.required_options?.map((opt) => (
              <span key={opt} className="rounded bg-amber-900/30 border border-amber-800/50 px-2 py-0.5 text-xs text-amber-400">
                {opt}
              </span>
            ))}
          </div>

          {/* Sources */}
          {filters.sources && filters.sources.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {(filters.sources as Source[]).map((src) => (
                <SourceBadge key={src} source={src} />
              ))}
            </div>
          )}

          {/* Notifications */}
          <div className="mt-2 flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
              <Bell className="h-3 w-3" />
              Email
            </span>
            {alert.notify_sms && (
              <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                <MessageSquare className="h-3 w-3" />
                SMS
              </span>
            )}
            {alert.last_match_at && (
              <span className="text-xs text-zinc-600">
                Last match {formatDate(alert.last_match_at)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-3 shrink-0">
          <Switch
            checked={alert.active}
            onCheckedChange={handleToggle}
            disabled={isToggling}
            aria-label="Toggle alert active"
          />
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-7 w-7 text-zinc-500 hover:text-red-400"
              aria-label="Delete alert"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" asChild className="h-7 w-7 text-zinc-500 hover:text-zinc-100">
              <Link href={`/alerts/${alert.id}`} aria-label="View alert details">
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
