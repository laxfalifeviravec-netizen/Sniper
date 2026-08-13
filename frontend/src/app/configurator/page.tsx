"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save, ShoppingCart, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";
import { MakeModelCombobox } from "@/components/make-model-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORIES, filterProducts } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { buildsApi } from "@/lib/api";
import { formatPrice, cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import type { Category } from "@/types";

export default function ConfiguratorPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { lines, subtotal, addToCart, removeFromCart, updateCartQty, clearCart } = useCart();

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("wheels");
  const [saving, setSaving] = useState(false);
  const [buildName, setBuildName] = useState("");

  const products = useMemo(
    () => filterProducts({ category: activeCategory, make: make || undefined, sort: "featured" }),
    [activeCategory, make]
  );

  async function handleSaveBuild() {
    if (!isAuthenticated) {
      router.push("/register?next=/configurator");
      return;
    }
    if (!lines.length) {
      toast({ title: "Your build is empty", description: "Add a few parts first.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const name =
        buildName.trim() ||
        [year, make, model].filter(Boolean).join(" ") ||
        "My build";
      await buildsApi.create({
        name,
        make: make || undefined,
        model: model || undefined,
        year: year ? Number(year) : undefined,
        items: lines,
      });
      toast({ title: "Build saved", description: `"${name}" is in your dashboard.` });
      router.push("/builds");
    } catch {
      toast({ title: "Failed to save build", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <SiteHeader />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-100">Build your car</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Pick your vehicle, then stack parts across every category. Your total updates live.
        </p>

        {/* Vehicle picker */}
        <div className="mt-6 rounded-lg border border-[#1a1a1a] bg-[#111111] p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label className="mb-1.5 block text-xs text-zinc-500">Vehicle</Label>
              <MakeModelCombobox
                make={make}
                model={model}
                onMakeChange={setMake}
                onModelChange={setModel}
              />
            </div>
            <div className="sm:w-28">
              <Label className="mb-1.5 block text-xs text-zinc-500">Year</Label>
              <Input
                type="number"
                placeholder="2022"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Category browser */}
          <div>
            <div className="flex flex-wrap gap-2 mb-5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors border",
                    activeCategory === c.id
                      ? "bg-amber-500 text-black border-amber-500"
                      : "border-zinc-700 text-zinc-400 hover:text-zinc-100"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  href={`/shop/${p.id}`}
                  onAdd={(product) => {
                    addToCart(product);
                    toast({ title: "Added to build", description: product.name });
                  }}
                />
              ))}
            </div>
            {products.length === 0 && (
              <p className="text-sm text-zinc-500 py-8 text-center">
                No parts in this category match your vehicle yet.
              </p>
            )}
          </div>

          {/* Build summary sidebar */}
          <aside className="lg:sticky lg:top-20 h-fit rounded-lg border border-[#1a1a1a] bg-[#111111] p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-zinc-100 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-amber-500" />
                Your build
              </h2>
              {lines.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-zinc-500 hover:text-red-400"
                >
                  Clear
                </button>
              )}
            </div>

            {lines.length === 0 ? (
              <p className="text-sm text-zinc-500 py-6 text-center">
                No parts added yet. Tap the + on any part.
              </p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {lines.map((line) => (
                  <div key={line.product_id} className="flex items-start justify-between gap-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-200 truncate">{line.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <button
                          onClick={() => updateCartQty(line.product_id, line.qty - 1)}
                          className="text-zinc-500 hover:text-zinc-200 px-1"
                        >
                          −
                        </button>
                        <span className="text-xs text-zinc-400 w-4 text-center">{line.qty}</span>
                        <button
                          onClick={() => updateCartQty(line.product_id, line.qty + 1)}
                          className="text-zinc-500 hover:text-zinc-200 px-1"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-zinc-300 font-medium">
                        {formatPrice(line.price_cents * line.qty)}
                      </span>
                      <button
                        onClick={() => removeFromCart(line.product_id)}
                        className="text-zinc-600 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-sm text-zinc-400">Subtotal</span>
              <span className="text-lg font-bold text-zinc-100">{formatPrice(subtotal)}</span>
            </div>

            <div className="mt-4 space-y-2">
              <Input
                placeholder="Name this build (optional)"
                value={buildName}
                onChange={(e) => setBuildName(e.target.value)}
                className="text-sm"
              />
              <Button
                className="w-full"
                variant="secondary"
                onClick={handleSaveBuild}
                disabled={saving || lines.length === 0}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save build
              </Button>
              <Button asChild className="w-full" disabled={lines.length === 0}>
                <Link href="/cart">Go to checkout</Link>
              </Button>
              <Link
                href={`/quotes?make=${make}&model=${model}&year=${year}`}
                className="block text-center text-xs text-amber-500 hover:underline pt-1"
              >
                Or get installation quotes instead →
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
