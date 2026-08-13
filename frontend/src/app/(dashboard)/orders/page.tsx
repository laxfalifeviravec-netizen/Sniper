"use client";

import { useEffect, useState } from "react";
import { Loader2, Package } from "lucide-react";
import { ordersApi } from "@/lib/api";
import { formatPrice, formatDate } from "@/lib/utils";
import type { Order } from "@/types";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-zinc-800 text-zinc-400",
  paid: "bg-emerald-500/10 text-emerald-400",
  fulfilled: "bg-blue-500/10 text-blue-400",
  cancelled: "bg-red-500/10 text-red-400",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    ordersApi
      .list()
      .then(setOrders)
      .catch(() => setOrders([]));
  }, []);

  return (
    <div className="p-4 lg:p-6">
      <h1 className="text-xl font-bold text-zinc-100 mb-1">Orders</h1>
      <p className="text-sm text-zinc-500 mb-6">Your part purchase history.</p>

      {orders === null ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center">
          <Package className="mx-auto h-8 w-8 text-zinc-600 mb-3" />
          <p className="text-zinc-400">No orders yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-200">
                  Order #{o.id.slice(0, 8).toUpperCase()}
                </p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${STATUS_STYLES[o.status] ?? ""}`}>
                  {o.status}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">{formatDate(o.created_at)}</p>
              <div className="mt-2 space-y-1">
                {o.items.map((it, i) => (
                  <p key={i} className="text-xs text-zinc-400">
                    {it.name} ×{it.qty}
                  </p>
                ))}
              </div>
              <p className="mt-2 text-sm font-bold text-zinc-100">{formatPrice(o.total_cents)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
