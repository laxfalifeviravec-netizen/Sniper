"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Boxes, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildsApi } from "@/lib/api";
import { formatPrice, formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import type { Build } from "@/types";

export default function BuildsPage() {
  const [builds, setBuilds] = useState<Build[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    buildsApi
      .list()
      .then(setBuilds)
      .catch(() => setBuilds([]));
  }, []);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await buildsApi.delete(id);
      setBuilds((prev) => (prev ? prev.filter((b) => b.id !== id) : prev));
    } catch {
      toast({ title: "Failed to delete build", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">My Builds</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Saved configurations you can reorder or edit anytime.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/configurator">
            <Plus className="h-4 w-4" />
            New build
          </Link>
        </Button>
      </div>

      {builds === null ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : builds.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center">
          <Boxes className="mx-auto h-8 w-8 text-zinc-600 mb-3" />
          <p className="text-zinc-400">No saved builds yet.</p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/configurator">Start your first build</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {builds.map((b) => {
            const vehicle = [b.year, b.make, b.model].filter(Boolean).join(" ");
            return (
              <div key={b.id} className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-100 truncate">{b.name}</p>
                    {vehicle && <p className="text-xs text-zinc-500 mt-0.5">{vehicle}</p>}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                      b.status === "ordered"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                  {b.items.length} part{b.items.length !== 1 ? "s" : ""} · {formatDate(b.updated_at)}
                </p>
                <p className="mt-2 text-lg font-bold text-zinc-100">{formatPrice(b.subtotal_cents)}</p>
                <div className="mt-4 flex gap-2">
                  <Button asChild size="sm" variant="secondary" className="flex-1">
                    <Link href={`/builds/${b.id}`}>View</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(b.id)}
                    disabled={deletingId === b.id}
                    className="text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
