"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getToken } from "@/lib/auth";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminStats {
  users: {
    total: number;
    pro: number;
    free: number;
    last_7_days: number;
  };
  listings: {
    total: number;
    active: number;
    by_source: {
      bat: number;
      cnb: number;
      pcarmarket: number;
      ebay: number;
    };
    last_scraped: string | null;
  };
  alerts: {
    total: number;
    active: number;
    with_sms: number;
  };
  matches: {
    total: number;
    last_24h: number;
  };
}

export default function AdminPage() {
  const { isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    fetchStats();
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

  async function triggerScrape() {
    setScraping(true);
    setScrapeResult(null);
    try {
      const token = getToken();
      const res = await fetch("/api/cron/scrape", {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      const data = await res.json();
      setScrapeResult(
        `Done — scraped: ${data.scraped ?? 0}, new: ${data.new ?? 0}, matches: ${data.matches ?? 0}`
      );
      // Refresh stats after scrape
      await fetchStats();
    } catch {
      setScrapeResult("Scrape request failed");
    } finally {
      setScraping(false);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Admin Dashboard</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Platform overview and controls
          </p>
        </div>
        <Button
          onClick={triggerScrape}
          disabled={scraping}
          className="gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
        >
          {scraping ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Scraping…
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Trigger scrape now
            </>
          )}
        </Button>
      </div>

      {scrapeResult && (
        <div className="rounded-md border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-300">
          {scrapeResult}
        </div>
      )}

      {/* Stat cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
            Users
          </p>
          <p className="text-3xl font-bold text-zinc-100">
            {stats.users.total.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {stats.users.pro} pro / {stats.users.free} free
          </p>
          <div className="mt-3">
            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
              +{stats.users.last_7_days} new this week
            </span>
          </div>
        </div>

        {/* Listings card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
            Listings
          </p>
          <p className="text-3xl font-bold text-zinc-100">
            {stats.listings.total.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {stats.listings.active.toLocaleString()} active
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center rounded-full bg-blue-600/20 px-2 py-0.5 text-xs font-medium text-blue-400">
              BaT {stats.listings.by_source.bat}
            </span>
            <span className="inline-flex items-center rounded-full bg-green-600/20 px-2 py-0.5 text-xs font-medium text-green-400">
              C&amp;B {stats.listings.by_source.cnb}
            </span>
            <span className="inline-flex items-center rounded-full bg-purple-600/20 px-2 py-0.5 text-xs font-medium text-purple-400">
              PCar {stats.listings.by_source.pcarmarket}
            </span>
            <span className="inline-flex items-center rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-400">
              eBay {stats.listings.by_source.ebay}
            </span>
          </div>
        </div>

        {/* Alerts card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
            Alerts
          </p>
          <p className="text-3xl font-bold text-zinc-100">
            {stats.alerts.total.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {stats.alerts.active.toLocaleString()} active
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {stats.alerts.with_sms} with SMS
          </p>
        </div>

        {/* Matches card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
            Matches
          </p>
          <p className="text-3xl font-bold text-zinc-100">
            {stats.matches.total.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {stats.matches.last_24h.toLocaleString()} in last 24h
          </p>
        </div>
      </div>
    </div>
  );
}
