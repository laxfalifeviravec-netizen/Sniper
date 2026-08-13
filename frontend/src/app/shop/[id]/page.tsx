"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  Armchair,
  Check,
  Cpu,
  Disc,
  Layers,
  Lightbulb,
  MoveVertical,
  Palette,
  Speaker,
  Star,
  Wind,
  ArrowLeft,
  Sparkles,
  Wrench,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { getProduct } from "@/lib/products";
import { CATEGORY_COLORS } from "@/lib/products";
import { formatPrice, cn } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { toast } from "@/components/ui/use-toast";
import type { Category } from "@/types";

const CATEGORY_ICONS: Record<Category, React.ElementType> = {
  wheels: Disc,
  wraps: Palette,
  "body-kits": Layers,
  exhaust: Wind,
  suspension: MoveVertical,
  lighting: Lightbulb,
  interior: Armchair,
  tuning: Cpu,
  audio: Speaker,
};

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const product = getProduct(id);
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);

  if (!product) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <p className="text-zinc-400">Product not found.</p>
          <Link href="/shop" className="text-amber-500 hover:underline text-sm mt-2 inline-block">
            Back to shop
          </Link>
        </div>
      </div>
    );
  }

  const Icon = CATEGORY_ICONS[product.category];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link
          href="/shop"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to shop
        </Link>

        <div className="grid gap-8 sm:grid-cols-2">
          <div
            className={cn(
              "relative flex h-72 items-center justify-center rounded-xl bg-gradient-to-br",
              CATEGORY_COLORS[product.category]
            )}
          >
            <Icon className="h-24 w-24 text-white/90" strokeWidth={1} />
            {product.sponsored && (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300 backdrop-blur">
                <Sparkles className="h-3 w-3" />
                Sponsored
              </span>
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {product.brand}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-zinc-100">{product.name}</h1>
            <div className="mt-2 flex items-center gap-1.5 text-sm">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-zinc-200 font-medium">{product.rating.toFixed(1)}</span>
              <span className="text-zinc-500">({product.reviews.toLocaleString()} reviews)</span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-zinc-100">
                {formatPrice(product.price_cents)}
              </span>
              {product.compare_at_cents && (
                <span className="text-base text-zinc-600 line-through">
                  {formatPrice(product.compare_at_cents)}
                </span>
              )}
            </div>

            <p className="mt-4 text-sm text-zinc-400 leading-relaxed">{product.description}</p>

            <div className="mt-4 space-y-1.5 text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-amber-500" />
                Fits:{" "}
                {product.compatibility === "universal"
                  ? "Universal — fits any make/model"
                  : product.compatibility.join(", ")}
              </div>
              {product.install_time_hrs != null && (
                <div className="flex items-center gap-2">
                  <Wrench className="h-3.5 w-3.5 text-amber-500" />
                  Est. install time: {product.install_time_hrs}h
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center rounded-md border border-zinc-700">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-zinc-400 hover:text-zinc-100"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm text-zinc-100">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(10, q + 1))}
                  className="px-3 py-2 text-zinc-400 hover:text-zinc-100"
                >
                  +
                </button>
              </div>
              <Button
                className="flex-1"
                onClick={() => {
                  addToCart(product, qty);
                  toast({ title: "Added to build", description: `${product.name} ×${qty}` });
                }}
              >
                Add to build
              </Button>
            </div>

            <Link
              href={`/quotes?category=${product.category}`}
              className="mt-3 block text-center text-sm text-amber-500 hover:underline"
            >
              Need it installed? Get free quotes →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
