"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export default function BillingSuccessPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
        <CheckCircle className="w-8 h-8 text-amber-500" />
      </div>
      <h1 className="text-3xl font-bold text-zinc-100 mb-2">You&apos;re on Pro!</h1>
      <p className="text-zinc-400 mb-2">
        Unlimited alerts, SMS notifications, and advanced filters are now active.
      </p>
      <p className="text-zinc-500 text-sm mb-8">
        Your first scrape runs within 30 minutes — you&apos;ll get notified the moment a match appears.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => router.push("/alerts/new")} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
          <Zap className="w-4 h-4 mr-2" />
          Create your first alert
        </Button>
        <Button variant="outline" onClick={() => router.push("/listings")} className="border-zinc-700 text-zinc-300">
          Browse listings
        </Button>
      </div>
    </div>
  );
}
