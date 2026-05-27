"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Share2, CheckCircle2, AlertTriangle } from "lucide-react";
import { SourceBadge } from "@/components/source-badge";
import { CountdownTimer } from "@/components/countdown-timer";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatMileage, cn } from "@/lib/utils";
import { TRANSMISSION_LABELS } from "@/types";
import type { Source, Transmission } from "@/types";

interface ListingDetail {
  id: string;
  source: Source;
  external_id: string;
  url: string;
  title: string;
  year: number | null;
  make: string | null;
  model: string | null;
  mileage: number | null;
  price: number | null;
  location: string | null;
  color: string | null;
  transmission: Transmission | null;
  engine: string | null;
  seller_notes: string | null;
  images: string[];
  auction_end: string | null;
  stories_flag: boolean;
  options: string[];
  created_at: string;
  updated_at: string;
}

function SpecCard({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-zinc-100 truncate">
        {value ?? <span className="text-zinc-600">—</span>}
      </p>
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zinc-800", className)} />;
}

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/listings/${id}`)
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setListing(data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: do nothing silently
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="w-full aspect-video" />
          <div className="space-y-3">
            <SkeletonBlock className="h-8 w-2/3" />
            <SkeletonBlock className="h-5 w-1/3" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-16" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !listing) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-zinc-400 text-lg">Listing not found.</p>
        <Link
          href="/listings"
          className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to listings
        </Link>
      </div>
    );
  }

  const images = listing.images ?? [];
  const mainImage = images[selectedImage] ?? images[0] ?? null;
  const thumbnails = images.slice(0, 6);

  const transmissionLabel = listing.transmission
    ? TRANSMISSION_LABELS[listing.transmission] ?? listing.transmission
    : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to listings
        </button>

        {/* Hero image */}
        <div className="relative w-full aspect-video overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={listing.title}
              fill
              sizes="(max-width: 1024px) 100vw, 80vw"
              className="object-cover"
              unoptimized
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <svg
                className="h-16 w-16 text-zinc-700"
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
        </div>

        {/* Thumbnail strip */}
        {thumbnails.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {thumbnails.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedImage(i)}
                className={cn(
                  "relative h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 transition-colors",
                  selectedImage === i
                    ? "border-amber-500"
                    : "border-zinc-700 hover:border-zinc-500"
                )}
              >
                <Image
                  src={img}
                  alt={`Image ${i + 1}`}
                  fill
                  sizes="96px"
                  className="object-cover"
                  unoptimized
                />
              </button>
            ))}
          </div>
        )}

        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <SourceBadge source={listing.source} />
              {listing.stories_flag ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-900/60 border border-red-700/50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-400">
                  <AlertTriangle className="h-3 w-3" />
                  Has Stories
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-900/60 border border-green-700/50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-green-400">
                  <CheckCircle2 className="h-3 w-3" />
                  No Stories
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 leading-tight">
              {listing.title}
            </h1>
            {listing.auction_end && (
              <CountdownTimer endDate={listing.auction_end} className="text-sm" />
            )}
          </div>

          <div className="flex flex-col items-start sm:items-end gap-3 shrink-0">
            {listing.price != null && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                  Price / Current Bid
                </p>
                <p className="text-3xl font-bold text-amber-400">
                  {formatCurrency(listing.price)}
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleShare}
                className="gap-1.5"
              >
                <Share2 className="h-3.5 w-3.5" />
                {copied ? "Copied!" : "Share"}
              </Button>
              <a
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" className="gap-1.5 bg-amber-500 text-black hover:bg-amber-400 font-semibold">
                  View Auction
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Key specs grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SpecCard label="Year" value={listing.year} />
          <SpecCard label="Make" value={listing.make} />
          <SpecCard label="Model" value={listing.model} />
          <SpecCard
            label="Mileage"
            value={listing.mileage != null ? formatMileage(listing.mileage) : null}
          />
          <SpecCard label="Color" value={listing.color} />
          <SpecCard label="Transmission" value={transmissionLabel} />
          <SpecCard label="Engine" value={listing.engine} />
          <SpecCard label="Location" value={listing.location} />
        </div>

        {/* Seller notes */}
        {listing.seller_notes && (
          <div>
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-2">
              Seller Notes
            </h2>
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
              <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
                {listing.seller_notes}
              </pre>
            </div>
          </div>
        )}

        {/* Options */}
        {listing.options && listing.options.length > 0 && (
          <div>
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-2">
              Options
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {listing.options.map((opt) => (
                <span
                  key={opt}
                  className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-xs text-zinc-300"
                >
                  {opt}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
