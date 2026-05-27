"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { ListingGrid } from "@/components/listing-grid";
import { ListingFilters } from "@/components/listing-filters";
import { Button } from "@/components/ui/button";
import { listingsApi } from "@/lib/api";
import type { ListingFilters as Filters } from "@/types";

const PAGE_SIZE = 18;

export default function ListingsPage() {
  const [filters, setFilters] = useState<Filters>({ per_page: PAGE_SIZE });
  const [isScraping, setIsScraping] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(
    ["listings", filters],
    () => listingsApi.list(filters),
    {
      keepPreviousData: true,
      refreshInterval: 60_000,
    }
  );

  const handleFiltersChange = useCallback((newFilters: Filters) => {
    setFilters({ ...newFilters, per_page: PAGE_SIZE });
  }, []);

  const handleFetchNow = async () => {
    setIsScraping(true);
    try {
      await fetch("/api/cron/scrape");
    } catch {
      // ignore network errors — the scrape may still have run
    } finally {
      await mutate();
      setIsScraping(false);
    }
  };

  const currentPage = filters.page ?? 1;
  const totalPages = data?.pages ?? 1;
  const isEmpty = !isLoading && !error && data?.total === 0;

  const goToPage = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-100">Live Listings</h1>
        {data && data.total > 0 && (
          <p className="mt-0.5 text-sm text-zinc-500">
            {data.total.toLocaleString()} listings across all platforms
          </p>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters */}
        <ListingFilters filters={filters} onChange={handleFiltersChange} />

        {/* Grid + pagination */}
        <div className="flex-1 min-w-0">
          {error && (
            <div className="mb-4 rounded-md border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              Failed to load listings. Check your connection.
            </div>
          )}

          {isEmpty ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 px-6 py-16 text-center">
              <p className="text-zinc-400 text-sm mb-4">
                No listings yet — the scraper runs every 30 minutes
              </p>
              <Button
                variant="secondary"
                onClick={handleFetchNow}
                disabled={isScraping}
              >
                {isScraping ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching listings…
                  </>
                ) : (
                  "Fetch listings now"
                )}
              </Button>
            </div>
          ) : (
            <ListingGrid
              listings={data?.items ?? []}
              isLoading={isLoading && !data}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between text-sm">
              <span className="text-zinc-500">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
