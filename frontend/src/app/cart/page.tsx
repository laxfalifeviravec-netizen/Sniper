"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingCart, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { ordersApi } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

const FREE_SHIPPING_THRESHOLD_CENTS = 50000;
const FLAT_SHIPPING_CENTS = 2500;

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { lines, subtotal, removeFromCart, updateCartQty } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);

  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : FLAT_SHIPPING_CENTS;
  const total = subtotal + shipping;
  const remainingForFreeShip = FREE_SHIPPING_THRESHOLD_CENTS - subtotal;

  async function handleCheckout() {
    if (!isAuthenticated) {
      router.push("/login?next=/cart");
      return;
    }
    setCheckingOut(true);
    try {
      const { checkout_url } = await ordersApi.checkout({
        items: lines.map((l) => ({ product_id: l.product_id, qty: l.qty })),
      });
      window.location.href = checkout_url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Checkout failed";
      toast({ title: "Checkout failed", description: msg, variant: "destructive" });
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-amber-500" />
          Your cart
        </h1>

        {lines.length === 0 ? (
          <div className="mt-8 rounded-lg border border-[#1a1a1a] bg-[#111111] p-12 text-center">
            <p className="text-zinc-400">Your cart is empty.</p>
            <Button asChild className="mt-4">
              <Link href="/configurator">Start building</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_280px]">
            <div className="space-y-3">
              {lines.map((line) => (
                <div
                  key={line.product_id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#1a1a1a] bg-[#111111] p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-zinc-500 uppercase">{line.brand}</p>
                    <p className="text-sm font-medium text-zinc-100 truncate">{line.name}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <button
                        onClick={() => updateCartQty(line.product_id, line.qty - 1)}
                        className="rounded border border-zinc-700 px-2 text-zinc-400 hover:text-zinc-100"
                      >
                        −
                      </button>
                      <span className="text-sm text-zinc-300 w-5 text-center">{line.qty}</span>
                      <button
                        onClick={() => updateCartQty(line.product_id, line.qty + 1)}
                        className="rounded border border-zinc-700 px-2 text-zinc-400 hover:text-zinc-100"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-semibold text-zinc-100">
                      {formatPrice(line.price_cents * line.qty)}
                    </span>
                    <button
                      onClick={() => removeFromCart(line.product_id)}
                      className="text-zinc-600 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <aside className="h-fit rounded-lg border border-[#1a1a1a] bg-[#111111] p-5">
              {remainingForFreeShip > 0 ? (
                <p className="mb-4 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-2.5 py-2">
                  Add {formatPrice(remainingForFreeShip)} more for free shipping
                </p>
              ) : (
                <p className="mb-4 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2.5 py-2">
                  You&apos;ve unlocked free shipping 🎉
                </p>
              )}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Subtotal</span>
                  <span className="text-zinc-200">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Shipping</span>
                  <span className="text-zinc-200">{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-zinc-800 font-semibold">
                  <span className="text-zinc-100">Total</span>
                  <span className="text-amber-400">{formatPrice(total)}</span>
                </div>
              </div>
              <Button className="w-full mt-4" onClick={handleCheckout} disabled={checkingOut}>
                {checkingOut && <Loader2 className="h-4 w-4 animate-spin" />}
                {checkingOut ? "Redirecting..." : "Checkout"}
              </Button>
              {!isAuthenticated && (
                <p className="mt-2 text-xs text-zinc-600 text-center">
                  You&apos;ll sign in first — your cart is saved.
                </p>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
