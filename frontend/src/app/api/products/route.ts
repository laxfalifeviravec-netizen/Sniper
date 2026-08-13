import { NextRequest, NextResponse } from "next/server";
import { filterProducts } from "@/lib/products";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const items = filterProducts({
    q: sp.get("q") ?? undefined,
    category: sp.get("category") ?? undefined,
    make: sp.get("make") ?? undefined,
    price_min: sp.get("price_min") ? Number(sp.get("price_min")) : undefined,
    price_max: sp.get("price_max") ? Number(sp.get("price_max")) : undefined,
    sort: sp.get("sort") ?? undefined,
  });

  return NextResponse.json({ items, total: items.length });
}
