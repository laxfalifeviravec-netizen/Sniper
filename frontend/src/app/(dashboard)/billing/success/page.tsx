"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export default function BillingSuccessPage() {
  const router = useRouter();
  const { refreshUser, user } = useAuth();

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const isShop = user?.role === "shop";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
        <CheckCircle className="w-8 h-8 text-amber-500" />
      </div>
      <h1 className="text-3xl font-bold text-zinc-100 mb-2">
        {isShop ? "You're on Shop Pro!" : "You're on Pro!"}
      </h1>
      <p className="text-zinc-400 mb-2 max-w-sm">
        {isShop
          ? "Full lead contact info, unlimited claims, and instant SMS alerts are now active."
          : "Unlimited saved builds, member pricing, and free shipping are now active."}
      </p>
      <div className="flex gap-3 mt-6">
        {isShop ? (
          <Button onClick={() => router.push("/shop-portal")} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
            View your leads
          </Button>
        ) : (
          <Button onClick={() => router.push("/configurator")} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
            <Wrench className="w-4 h-4 mr-2" />
            Start a build
          </Button>
        )}
        <Button variant="outline" onClick={() => router.push("/account")} className="border-zinc-700 text-zinc-300">
          Manage account
        </Button>
      </div>
    </div>
  );
}
