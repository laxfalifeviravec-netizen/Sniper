import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Gauge, Palette, Settings2 } from "lucide-react";
import { SourceBadge } from "./source-badge";
import { CountdownTimer } from "./countdown-timer";
import { formatCurrency, formatMileage, cn } from "@/lib/utils";
import { TRANSMISSION_LABELS } from "@/types";
import type { Listing } from "@/types";

interface ListingCardProps {
  listing: Listing;
  className?: string;
}

export function ListingCard({ listing, className }: ListingCardProps) {
  const {
    url,
    title,
    year,
    make,
    model,
    mileage,
    color,
    transmission,
    current_bid,
    buy_now_price,
    auction_end,
    image_url,
    stories_flag,
    source,
  } = listing;

  return (
    <Link
      href={`/listings/${listing.id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border border-[#1a1a1a] bg-[#111111] transition-colors hover:border-zinc-700 cursor-pointer",
        className
      )}
    >
    <article className="contents">
      {/* Image */}
      <div className="relative aspect-[16/9] overflow-hidden bg-zinc-900">
        {image_url ? (
          <Image
            src={image_url}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform group-hover:scale-[1.02]"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg
              className="h-12 w-12 text-zinc-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          <SourceBadge source={source} />
          {!stories_flag && (
            <span className="inline-flex items-center rounded-full bg-green-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-50">
              No Stories
            </span>
          )}
        </div>

        {/* External link */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute right-2 top-2 rounded-md bg-black/60 p-1.5 text-zinc-300 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
          aria-label="Open auction"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-3">
        {/* Title */}
        <div>
          <h3 className="line-clamp-1 text-sm font-semibold text-zinc-100 leading-snug">
            {year} {make} {model}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{title}</p>
        </div>

        {/* Specs */}
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {mileage !== undefined && (
            <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
              <Gauge className="h-3 w-3 shrink-0" />
              {formatMileage(mileage)}
            </span>
          )}
          {color && (
            <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
              <Palette className="h-3 w-3 shrink-0" />
              {color}
            </span>
          )}
          {transmission && (
            <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
              <Settings2 className="h-3 w-3 shrink-0" />
              {TRANSMISSION_LABELS[transmission]}
            </span>
          )}
        </div>

        {/* Bid + Timer */}
        <div className="mt-auto flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">
              {buy_now_price ? "Buy Now" : "Current Bid"}
            </p>
            <p className="text-lg font-bold text-amber-400">
              {current_bid
                ? formatCurrency(current_bid)
                : buy_now_price
                ? formatCurrency(buy_now_price)
                : "No reserve"}
            </p>
          </div>
          <CountdownTimer endDate={auction_end} />
        </div>
      </div>
    </article>
    </Link>
  );
}
