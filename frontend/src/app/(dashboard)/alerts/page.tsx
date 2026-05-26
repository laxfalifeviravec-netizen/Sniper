"use client";

import Link from "next/link";
import useSWR from "swr";
import { Bell, Plus } from "lucide-react";
import { AlertCard } from "@/components/alert-card";
import { UpgradeBanner } from "@/components/upgrade-banner";
import { Button } from "@/components/ui/button";
import { alertsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "@/components/ui/use-toast";

const FREE_ALERT_LIMIT = 3;

export default function AlertsPage() {
  const { user } = useAuth();

  const { data: alerts, error, mutate, isLoading } = useSWR(
    "alerts",
    alertsApi.list,
    { revalidateOnFocus: true }
  );

  const isPro = user?.plan === "pro";
  const atLimit = !isPro && (alerts?.length ?? 0) >= FREE_ALERT_LIMIT;

  const handleToggleActive = async (id: string, active: boolean) => {
    await alertsApi.update(id, { active });
    mutate();
    toast({
      title: active ? "Alert activated" : "Alert paused",
    });
  };

  const handleDelete = async (id: string) => {
    await alertsApi.delete(id);
    mutate();
    toast({ title: "Alert deleted" });
  };

  return (
    <div className="p-4 lg:p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">My Alerts</h1>
          {alerts && (
            <p className="mt-0.5 text-sm text-zinc-500">
              {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
              {!isPro && ` / ${FREE_ALERT_LIMIT} free`}
            </p>
          )}
        </div>
        <Button
          asChild={!atLimit}
          disabled={atLimit}
          size="sm"
          onClick={
            atLimit
              ? () =>
                  toast({
                    title: "Limit reached",
                    description: "Upgrade to Pro for unlimited alerts.",
                    variant: "destructive",
                  })
              : undefined
          }
        >
          {atLimit ? (
            <span>
              <Plus className="mr-1.5 h-4 w-4" />
              New alert
            </span>
          ) : (
            <Link href="/alerts/new">
              <Plus className="mr-1.5 h-4 w-4" />
              New alert
            </Link>
          )}
        </Button>
      </div>

      {/* Upgrade banner for free users near limit */}
      {!isPro && (alerts?.length ?? 0) >= FREE_ALERT_LIMIT - 1 && (
        <div className="mb-6">
          <UpgradeBanner message="You've reached the 3-alert limit on the free plan. Upgrade to Pro for unlimited alerts and SMS notifications." />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-lg border border-[#1a1a1a] bg-[#111111] animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-md border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          Failed to load alerts.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && alerts?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[#1a1a1a] bg-[#111111] py-16 text-center">
          <Bell className="h-10 w-10 text-zinc-700 mb-4" />
          <p className="text-zinc-300 font-medium">No alerts yet</p>
          <p className="text-sm text-zinc-500 mt-1">
            Create your first alert to start monitoring.
          </p>
          <Button asChild className="mt-6">
            <Link href="/alerts/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Create alert
            </Link>
          </Button>
        </div>
      )}

      {/* Alert list */}
      {alerts && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
