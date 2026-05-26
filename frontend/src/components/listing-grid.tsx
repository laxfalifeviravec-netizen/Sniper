"use client";

import { ListingCard } from "./listing-card";
import type { Listing } from "@/types";

interface ListingGridProps {
  listings: Listing[];
  isLoading?: boolean;
}

function ListingCardSkeleton() {
  return (
    <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] overflow-hidden">
      <div className="aspect-[16/9] bg-zinc-900 animate-pulse" />
      <div className="p-3 space-y-3">
        <div className="space-y-1.5">
          <div className="h-4 w-3/4 bg-zinc-800 rounded animate-pulse" />
          <div className="h-3 w-1/2 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse" />
          <div className="h-3 w-12 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="flex justify-between items-end">
          <div>
            <div className="h-2 w-16 bg-zinc-800 rounded animate-pulse mb-1" />
            <div className="h-6 w-20 bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="h-4 w-14 bg-zinc-800 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function ListingGrid({ listings, isLoading }: ListingGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-[#1a1a1a] bg-[#111111] py-16 text-center">
        <p className="text-zinc-400 text-sm">No listings match your filters.</p>
        <p className="text-zinc-600 text-xs mt-1">
          Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
