"use client";

import { Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { billingApi } from "@/lib/api";

interface UpgradeBannerProps {
  message?: string;
  dismissible?: boolean;
}

export function UpgradeBanner({
  message = "Upgrade to Pro Builder for unlimited saved builds, member pricing, and early access to drops.",
  dismissible = true,
}: UpgradeBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (dismissed) return null;

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const { checkout_url } = await billingApi.createCheckoutSession();
      window.location.href = checkout_url;
    } catch {
      alert("Failed to start checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
      <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
      <p className="flex-1 text-sm text-zinc-300">{message}</p>
      <Button
        size="sm"
        onClick={handleUpgrade}
        disabled={isLoading}
        className="shrink-0"
      >
        {isLoading ? "Loading..." : "Upgrade — $19/mo"}
      </Button>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-2 top-2 text-zinc-500 hover:text-zinc-300"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
