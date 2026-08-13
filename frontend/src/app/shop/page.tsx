"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/cart";
import { CATEGORIES } from "@/lib/products";
import { filterProducts } from "@/lib/products";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToCart } = useCart();

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<Category | "">(
    (searchParams.get("category") as Category) || ""
  );
  const [sort, setSort] = useState("featured");

  useEffect(() => {
    const c = searchParams.get("category") as Category | null;
    if (c) setCategory(c);
  }, [searchParams]);

  const products = useMemo(
    () => filterProducts({ q, category: category || undefined, sort }),
    [q, category, sort]
  );

  function setCategoryParam(c: Category | "") {
    setCategory(c);
    const params = new URLSearchParams(searchParams.toString());
    if (c) params.set("category", c);
    else params.delete("category");
    router.replace(`/shop?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <SiteHeader />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-100">Shop the catalog</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {products.length} part{products.length !== 1 ? "s" : ""} across 9 categories
          </p>
        </div>

        {/* Search + sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search parts, brands..."
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-zinc-500 shrink-0" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="input-base text-sm"
            >
              <option value="featured">Featured</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setCategoryParam("")}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors border",
              category === ""
                ? "bg-amber-500 text-black border-amber-500"
                : "border-zinc-700 text-zinc-400 hover:text-zinc-100"
            )}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryParam(c.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors border",
                category === c.id
                  ? "bg-amber-500 text-black border-amber-500"
                  : "border-zinc-700 text-zinc-400 hover:text-zinc-100"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {products.length === 0 ? (
          <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-12 text-center text-zinc-500">
            No parts match your search.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
        )}
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={null}>
      <ShopContent />
    </Suspense>
  );
}
