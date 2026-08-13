"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Lock, MapPin, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { leadsApi, shopsApi, billingApi } from "@/lib/api";
import { formatPrice, formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import type { Lead, Shop } from "@/types";

export default function ShopPortalPage() {
  const [shop, setShop] = useState<Shop | null | undefined>(undefined);
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    shopsApi.me().then((s) => {
      setShop(s);
      if (s) leadsApi.list().then(setLeads).catch(() => setLeads([]));
    });
  }, []);

  async function handleClaim(id: string) {
    setClaimingId(id);
    try {
      await leadsApi.claim(id);
      setLeads((prev) => (prev ? prev.map((l) => (l.id === id ? { ...l, status: "claimed" } : l)) : prev));
      toast({ title: "Lead claimed", description: "Full contact info is now visible." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to claim lead";
      toast({ title: "Couldn't claim lead", description: msg, variant: "destructive" });
    } finally {
      setClaimingId(null);
    }
  }

  async function handleUpgrade() {
    setUpgrading(true);
    try {
      const { checkout_url } = await billingApi.createCheckoutSession("shop");
      window.location.href = checkout_url;
    } catch {
      toast({ title: "Failed to start checkout", variant: "destructive" });
    } finally {
      setUpgrading(false);
    }
  }

  if (shop === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="p-4 lg:p-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center">
          <Store className="mx-auto h-8 w-8 text-zinc-600 mb-3" />
          <p className="text-zinc-400 mb-4">You haven&apos;t set up a shop profile yet.</p>
          <Button asChild>
            <Link href="/for-shops">Set up your shop</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            {shop.business_name}
            {shop.is_pro ? (
              <Badge className="bg-amber-500 text-black text-xs">SHOP PRO</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">FREE</Badge>
            )}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {shop.zip} · {shop.categories.join(", ") || "All categories"}
          </p>
        </div>
        {!shop.is_pro && (
          <Button onClick={handleUpgrade} disabled={upgrading}>
            {upgrading && <Loader2 className="h-4 w-4 animate-spin" />}
            Upgrade to Shop Pro — $99/mo
          </Button>
        )}
      </div>

      {!shop.is_pro && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-zinc-300">
          <Lock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          You&apos;re on the free tier — contact details are masked and leads can&apos;t be claimed until you upgrade.
        </div>
      )}

      {leads === null ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center text-zinc-400">
          No leads matching your categories or ZIP yet.
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => {
            const carLine = [lead.year, lead.make, lead.model].filter(Boolean).join(" ") || "Unspecified vehicle";
            return (
              <div key={lead.id} className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-medium text-zinc-100">{carLine}</p>
                    <p className="text-sm text-zinc-400 mt-0.5">{lead.name} · {lead.email}</p>
                    {lead.phone && <p className="text-sm text-zinc-400">{lead.phone}</p>}
                    <p className="text-xs text-zinc-600 mt-1">
                      ZIP {lead.zip} · {lead.category ?? "Any category"} ·{" "}
                      {lead.budget_cents ? formatPrice(lead.budget_cents) : "No budget given"} ·{" "}
                      {formatDate(lead.created_at)}
                    </p>
                    {lead.notes && <p className="mt-2 text-sm text-zinc-300 italic">&quot;{lead.notes}&quot;</p>}
                  </div>
                  <div className="shrink-0">
                    {lead.status === "claimed" ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400">Claimed</Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleClaim(lead.id)}
                        disabled={claimingId === lead.id}
                      >
                        {claimingId === lead.id ? "Claiming..." : "Claim lead"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
