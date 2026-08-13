"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildsApi, ordersApi } from "@/lib/api";
import { formatPrice, formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import type { Build } from "@/types";

export default function BuildDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [build, setBuild] = useState<Build | null | undefined>(undefined);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    buildsApi
      .get(id)
      .then(setBuild)
      .catch(() => setBuild(null));
  }, [id]);

  async function handleCheckout() {
    if (!build) return;
    setCheckingOut(true);
    try {
      const { checkout_url } = await ordersApi.checkout({
        items: build.items.map((it) => ({ product_id: it.product_id, qty: it.qty })),
        build_id: build.id,
      });
      window.location.href = checkout_url;
    } catch {
      toast({ title: "Checkout failed", variant: "destructive" });
    } finally {
      setCheckingOut(false);
    }
  }

  if (build === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!build) {
    return (
      <div className="p-4 lg:p-6">
        <p className="text-zinc-400">Build not found.</p>
        <Link href="/builds" className="text-amber-500 hover:underline text-sm">
          Back to builds
        </Link>
      </div>
    );
  }

  const vehicle = [build.year, build.make, build.model].filter(Boolean).join(" ");

  return (
    <div className="p-4 lg:p-6 max-w-2xl">
      <Link href="/builds" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 mb-4">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to builds
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">{build.name}</h1>
          {vehicle && <p className="text-sm text-zinc-500 mt-0.5">{vehicle}</p>}
          <p className="text-xs text-zinc-600 mt-1">Last updated {formatDate(build.updated_at)}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium uppercase ${
            build.status === "ordered" ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-400"
          }`}
        >
          {build.status}
        </span>
      </div>

      <div className="mt-6 rounded-lg border border-[#1a1a1a] bg-[#111111] divide-y divide-zinc-800">
        {build.items.map((it) => (
          <div key={it.product_id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="text-zinc-500 text-xs uppercase">{it.brand}</p>
              <p className="text-zinc-200">{it.name} ×{it.qty}</p>
            </div>
            <span className="font-medium text-zinc-100">{formatPrice(it.price_cents * it.qty)}</span>
          </div>
        ))}
        {build.items.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">No parts in this build.</p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg border border-[#1a1a1a] bg-[#111111] px-4 py-3">
        <span className="text-sm text-zinc-400">Subtotal</span>
        <span className="text-lg font-bold text-zinc-100">{formatPrice(build.subtotal_cents)}</span>
      </div>

      {build.status !== "ordered" && build.items.length > 0 && (
        <Button className="w-full mt-4" onClick={handleCheckout} disabled={checkingOut}>
          {checkingOut && <Loader2 className="h-4 w-4 animate-spin" />}
          {checkingOut ? "Redirecting..." : "Checkout this build"}
        </Button>
      )}

      <Link
        href={`/quotes?make=${build.make ?? ""}&model=${build.model ?? ""}&year=${build.year ?? ""}`}
        className="mt-3 block text-center text-sm text-amber-500 hover:underline"
      >
        Get installation quotes for this build →
      </Link>
    </div>
  );
}
