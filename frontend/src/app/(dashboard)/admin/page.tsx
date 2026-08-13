"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getToken } from "@/lib/auth";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

interface AdminStats {
  users: { total: number; pro: number; free: number; last_7_days: number };
  orders: { total: number; paid: number; revenue_cents: number; revenue_30d_cents: number };
  builds: { total: number };
  leads: { total: number; new: number; claimed: number };
  shops: { total: number; pro: number };
  mrr_cents: number;
}

export default function AdminPage() {
  const { isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  async function fetchStats() {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      if (res.status === 403) {
        setError("Access denied");
        return;
      }
      if (!res.ok) {
        setError("Failed to load stats");
        return;
      }
      const data: AdminStats = await res.json();
      setStats(data);
    } catch {
      setError("Failed to load stats");
    } finally {
      setLoading(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (error === "Access denied") {
    return (
      <div className="p-4 lg:p-6">
        <div className="rounded-xl border border-red-800 bg-red-950/30 p-8 text-center">
          <p className="text-lg font-semibold text-red-400">Access denied</p>
          <p className="mt-1 text-sm text-zinc-500">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-4 lg:p-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-zinc-400">{error ?? "No data available"}</p>
          <Button variant="outline" className="mt-4" onClick={fetchStats}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Admin Dashboard</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Revenue and platform overview</p>
        </div>
        <Button onClick={fetchStats} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Revenue highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-xl p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-400 mb-2">
            Order revenue (all time)
          </p>
          <p className="text-3xl font-bold text-zinc-100">
            {formatPrice(stats.orders.revenue_cents)}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {formatPrice(stats.orders.revenue_30d_cents)} in last 30 days
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-xl p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-400 mb-2">
            Estimated MRR
          </p>
          <p className="text-3xl font-bold text-zinc-100">{formatPrice(stats.mrr_cents)}</p>
          <p className="mt-1 text-sm text-zinc-400">
            {stats.users.pro} Pro Builder + {stats.shops.pro} Shop Pro
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
            Orders
          </p>
          <p className="text-3xl font-bold text-zinc-100">{stats.orders.total.toLocaleString()}</p>
          <p className="mt-1 text-sm text-zinc-400">{stats.orders.paid.toLocaleString()} paid</p>
        </div>
      </div>

      {/* Stat cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">Users</p>
          <p className="text-3xl font-bold text-zinc-100">{stats.users.total.toLocaleString()}</p>
          <p className="mt-1 text-sm text-zinc-400">{stats.users.pro} pro / {stats.users.free} free</p>
          <div className="mt-3">
            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
              +{stats.users.last_7_days} new this week
            </span>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">Builds</p>
          <p className="text-3xl font-bold text-zinc-100">{stats.builds.total.toLocaleString()}</p>
          <p className="mt-1 text-sm text-zinc-400">saved configurations</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">Leads</p>
          <p className="text-3xl font-bold text-zinc-100">{stats.leads.total.toLocaleString()}</p>
          <p className="mt-1 text-sm text-zinc-400">
            {stats.leads.new} new / {stats.leads.claimed} claimed
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">Shops</p>
          <p className="text-3xl font-bold text-zinc-100">{stats.shops.total.toLocaleString()}</p>
          <p className="mt-1 text-sm text-zinc-400">{stats.shops.pro} on Shop Pro</p>
        </div>
      </div>
    </div>
  );
}
