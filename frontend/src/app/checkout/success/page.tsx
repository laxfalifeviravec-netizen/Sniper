"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { clearCart } from "@/lib/cart";

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");

  useEffect(() => {
    clearCart();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <SiteHeader />
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
        <h1 className="mt-6 text-2xl font-bold text-zinc-100">Order confirmed</h1>
        <p className="mt-2 text-sm text-zinc-500">
          We emailed you a receipt. Your parts are being prepared for shipment.
        </p>
        {sessionId && (
          <p className="mt-3 text-xs text-zinc-700 font-mono break-all">{sessionId}</p>
        )}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="secondary">
            <Link href="/orders">View orders</Link>
          </Button>
          <Button asChild>
            <Link href="/configurator">Start another build</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
}
