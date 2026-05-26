"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import {
  ArrowLeft,
  Bell,
  ChevronLeft,
  ChevronRight,
  Edit,
  MessageSquare,
} from "lucide-react";
import { ListingGrid } from "@/components/listing-grid";
import { SourceBadge } from "@/components/source-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { alertsApi } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import type { Source } from "@/types";

const PAGE_SIZE = 12;

export default function AlertDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [page, setPage] = useState(1);

  const { data, error, mutate, isLoading } = useSWR(
    ["alert-matches", id, page],
    () => alertsApi.matches(id, page, PAGE_SIZE),
    { revalidateOnFocus: true }
  );

  const alert = data?.alert;

  const handleToggleActive = async (checked: boolean) => {
    if (!alert) return;
    try {
      await alertsApi.update(id, { active: checked });
      mutate();
      toast({ title: checked ? "Alert activated" : "Alert paused" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          Failed to load alert.
        </div>
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="p-4 lg:p-6 max-w-5xl">
        <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse mb-6" />
        <div className="h-40 bg-[#111111] border border-[#1a1a1a] rounded-lg animate-pulse mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 bg-[#111111] border border-[#1a1a1a] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const filters = alert?.filters ?? {};
  const makeModel = [filters.make, filters.model].filter(Boolean).join(" ");
  const yearRange =
    filters.year_min && filters.year_max
      ? `${filters.year_min}–${filters.year_max}`
      : filters.year_min
      ? `${filters.year_min}+`
      : filters.year_max
      ? `–${filters.year_max}`
      : null;

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      {/* Back */}
      <Link
        href="/alerts"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All alerts
      </Link>

      {/* Alert summary card */}
      {alert && (
        <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-5 mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-zinc-100">{alert.name}</h1>
                {alert.active ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="secondary">Paused</Badge>
                )}
              </div>

              {/* Specs summary */}
              <div className="mt-3 flex flex-wrap gap-1.5">
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
                {filters.colors?.map((c) => (
                  <span key={c} className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                    {c}
                  </span>
                ))}
                {filters.transmissions?.map((tx) => (
                  <span key={tx} className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                    {tx.toUpperCase()}
                  </span>
                ))}
                {filters.exclude_stories && (
                  <span className="rounded bg-green-900/40 border border-green-800 px-2 py-0.5 text-xs text-green-400">
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
              <div className="mt-3 flex items-center gap-4">
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
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-3 items-end">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">
                  {alert.active ? "Active" : "Paused"}
                </span>
                <Switch
                  checked={alert.active}
                  onCheckedChange={handleToggleActive}
                />
              </div>
              <Button asChild variant="secondary" size="sm">
                <Link href={`/alerts/${id}/edit`}>
                  <Edit className="mr-1.5 h-3.5 w-3.5" />
                  Edit alert
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Matches */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-zinc-100">
          Matches
          {data && (
            <span className="ml-2 text-sm font-normal text-zinc-500">
              {data.total.toLocaleString()} total
            </span>
          )}
        </h2>
      </div>

      <ListingGrid
        listings={data?.items ?? []}
        isLoading={isLoading && !data}
      />

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-zinc-500">
            Page {page} of {data.pages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= data.pages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
