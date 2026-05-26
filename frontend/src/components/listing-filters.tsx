"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn, COLORS } from "@/lib/utils";
import type { ListingFilters, Source, Transmission } from "@/types";
import { SOURCE_LABELS, TRANSMISSION_LABELS } from "@/types";

const SOURCES: Source[] = ["bat", "cnb", "pcarmarket", "ebay"];
const TRANSMISSIONS: Transmission[] = ["manual", "automatic", "pdk", "dct", "other"];

interface ListingFiltersProps {
  filters: ListingFilters;
  onChange: (filters: ListingFilters) => void;
}

export function ListingFilters({ filters, onChange }: ListingFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const update = (patch: Partial<ListingFilters>) => {
    onChange({ ...filters, ...patch, page: 1 });
  };

  const toggleArray = <T extends string>(
    key: keyof ListingFilters,
    value: T,
    current: T[] = []
  ) => {
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    update({ [key]: next.length ? next : undefined });
  };

  const clearAll = () => {
    onChange({});
  };

  const hasFilters = Object.values(filters).some(
    (v) =>
      v !== undefined &&
      v !== "" &&
      !(Array.isArray(v) && v.length === 0)
  );

  const filtersPanel = (
    <div className="flex flex-col gap-5">
      {/* Search */}
      <div>
        <Label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-500">
          Search
        </Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Make, model, keyword..."
            value={filters.q ?? ""}
            onChange={(e) => update({ q: e.target.value || undefined })}
            className="pl-8"
          />
        </div>
      </div>

      <Separator />

      {/* Make / Model */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-500">
            Make
          </Label>
          <Input
            placeholder="Porsche"
            value={filters.make ?? ""}
            onChange={(e) => update({ make: e.target.value || undefined })}
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-500">
            Model
          </Label>
          <Input
            placeholder="911"
            value={filters.model ?? ""}
            onChange={(e) => update({ model: e.target.value || undefined })}
          />
        </div>
      </div>

      {/* Year Range */}
      <div>
        <Label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-500">
          Year Range
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="1980"
            min={1900}
            max={new Date().getFullYear() + 1}
            value={filters.year_min ?? ""}
            onChange={(e) =>
              update({ year_min: e.target.value ? +e.target.value : undefined })
            }
          />
          <Input
            type="number"
            placeholder={String(new Date().getFullYear())}
            min={1900}
            max={new Date().getFullYear() + 1}
            value={filters.year_max ?? ""}
            onChange={(e) =>
              update({ year_max: e.target.value ? +e.target.value : undefined })
            }
          />
        </div>
      </div>

      {/* Mileage */}
      <div>
        <Label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-500">
          Max Mileage
        </Label>
        <Input
          type="number"
          placeholder="100,000"
          min={0}
          value={filters.mileage_max ?? ""}
          onChange={(e) =>
            update({ mileage_max: e.target.value ? +e.target.value : undefined })
          }
        />
      </div>

      {/* Price Range */}
      <div>
        <Label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-500">
          Price Range
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="$0"
            min={0}
            value={filters.price_min ?? ""}
            onChange={(e) =>
              update({ price_min: e.target.value ? +e.target.value : undefined })
            }
          />
          <Input
            type="number"
            placeholder="Any"
            min={0}
            value={filters.price_max ?? ""}
            onChange={(e) =>
              update({ price_max: e.target.value ? +e.target.value : undefined })
            }
          />
        </div>
      </div>

      <Separator />

      {/* Color */}
      <div>
        <Label className="mb-2 block text-xs uppercase tracking-widest text-zinc-500">
          Color
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {COLORS.map((color) => {
            const active = filters.colors?.includes(color);
            return (
              <button
                key={color}
                onClick={() =>
                  toggleArray("colors", color, filters.colors ?? [])
                }
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                  active
                    ? "border-amber-500 bg-amber-500/10 text-amber-400"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
                )}
              >
                {color}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transmission */}
      <div>
        <Label className="mb-2 block text-xs uppercase tracking-widest text-zinc-500">
          Transmission
        </Label>
        <div className="space-y-1.5">
          {TRANSMISSIONS.map((tx) => (
            <div key={tx} className="flex items-center gap-2">
              <Checkbox
                id={`tx-${tx}`}
                checked={filters.transmissions?.includes(tx) ?? false}
                onCheckedChange={() =>
                  toggleArray("transmissions", tx, filters.transmissions ?? [])
                }
              />
              <Label htmlFor={`tx-${tx}`} className="text-sm text-zinc-300 cursor-pointer">
                {TRANSMISSION_LABELS[tx]}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Sources */}
      <div>
        <Label className="mb-2 block text-xs uppercase tracking-widest text-zinc-500">
          Sources
        </Label>
        <div className="space-y-1.5">
          {SOURCES.map((src) => (
            <div key={src} className="flex items-center gap-2">
              <Checkbox
                id={`src-${src}`}
                checked={filters.sources?.includes(src) ?? false}
                onCheckedChange={() =>
                  toggleArray("sources", src, filters.sources ?? [])
                }
              />
              <Label htmlFor={`src-${src}`} className="text-sm text-zinc-300 cursor-pointer">
                {SOURCE_LABELS[src]}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Exclude stories */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-200">Exclude Stories</p>
          <p className="text-xs text-zinc-500">
            Hide salvage / rebuilt title cars
          </p>
        </div>
        <Switch
          checked={filters.exclude_stories ?? false}
          onCheckedChange={(v) => update({ exclude_stories: v || undefined })}
        />
      </div>

      {/* Clear */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="w-full text-zinc-400"
        >
          <X className="mr-1.5 h-3.5 w-3.5" />
          Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <div className="lg:hidden mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileOpen((o) => !o)}
          className="gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {hasFilters && (
            <span className="rounded-full bg-amber-500 text-black text-[10px] font-bold w-4 h-4 flex items-center justify-center">
              !
            </span>
          )}
        </Button>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <div className="lg:hidden mb-6 rounded-lg border border-[#1a1a1a] bg-[#111111] p-4">
          {filtersPanel}
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block w-56 shrink-0">{filtersPanel}</div>
    </>
  );
}
