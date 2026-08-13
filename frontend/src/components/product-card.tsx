"use client";

import {
  Armchair,
  Cpu,
  Disc,
  Layers,
  Lightbulb,
  MoveVertical,
  Palette,
  Speaker,
  Star,
  Wind,
  Plus,
  Sparkles,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/products";
import type { Category, Product } from "@/types";

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

interface ProductCardProps {
  product: Product;
  onAdd?: (product: Product) => void;
  href?: string;
}

export function ProductCard({ product, onAdd, href }: ProductCardProps) {
  const Icon = CATEGORY_ICONS[product.category];

  const content = (
    <>
      <div
        className={cn(
          "relative flex h-36 items-center justify-center rounded-t-lg bg-gradient-to-br",
          CATEGORY_COLORS[product.category]
        )}
      >
        <Icon className="h-12 w-12 text-white/90" strokeWidth={1.5} />
        {product.sponsored && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300 backdrop-blur">
            <Sparkles className="h-2.5 w-2.5" />
            Sponsored
          </span>
        )}
        {product.compare_at_cents && (
          <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
            SALE
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          {product.brand}
        </p>
        <p className="text-sm font-semibold text-zinc-100 leading-snug line-clamp-2">
          {product.name}
        </p>
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="text-zinc-300">{product.rating.toFixed(1)}</span>
          <span>({product.reviews.toLocaleString()})</span>
        </div>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-zinc-100">
              {formatPrice(product.price_cents)}
            </span>
            {product.compare_at_cents && (
              <span className="text-xs text-zinc-600 line-through">
                {formatPrice(product.compare_at_cents)}
              </span>
            )}
          </div>
          {onAdd && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onAdd(product);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500 text-black transition-colors hover:bg-amber-400"
              aria-label={`Add ${product.name} to build`}
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </>
  );

  const cardClass =
    "flex flex-col rounded-lg border border-[#1a1a1a] bg-[#111111] overflow-hidden transition-colors hover:border-zinc-700";

  if (href) {
    return (
      <a href={href} className={cardClass}>
        {content}
      </a>
    );
  }

  return <div className={cardClass}>{content}</div>;
}
