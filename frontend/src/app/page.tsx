"use client";

import Link from "next/link";
import {
  Armchair,
  Cpu,
  Disc,
  Layers,
  Lightbulb,
  MoveVertical,
  Palette,
  Speaker,
  Wind,
  ChevronRight,
  Gauge,
  ShieldCheck,
  Sparkles,
  Store,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";
import { PricingSection } from "@/components/pricing-section";
import { CountdownTimer } from "@/components/countdown-timer";
import { CATEGORIES, filterProducts } from "@/lib/products";
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

const BUILD_TICKER = [
  { car: "2019 WRX STI", spend: "$6,240", parts: "Coilovers, wheels, cat-back" },
  { car: "1998 Supra Turbo", spend: "$11,800", parts: "Widebody, tune, exhaust" },
  { car: "2022 Civic Type R", spend: "$3,150", parts: "Wrap, lighting, intake" },
  { car: "2015 Mustang GT", spend: "$8,920", parts: "Headers, wheels, coilovers" },
  { car: "2020 M3 Competition", spend: "$14,300", parts: "Downpipe, JB4, wheels" },
  { car: "2017 GT-R", spend: "$21,400", parts: "Widebody kit, wing, wrap" },
  { car: "2021 Bronco", spend: "$5,760", parts: "Lighting, suspension, audio" },
  { car: "2013 BRZ", spend: "$4,480", parts: "Coilovers, exhaust, interior" },
];

const flashSaleEnd = new Date(Date.now() + 1000 * 60 * 60 * 18).toISOString();
const featuredProducts = filterProducts({ sort: "featured" }).slice(0, 4);

function LiveTicker() {
  const items = [...BUILD_TICKER, ...BUILD_TICKER];
  return (
    <div className="overflow-hidden border-y border-zinc-800 bg-zinc-900/50 py-3">
      <div className="flex animate-ticker-scroll gap-8 w-max">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 text-sm whitespace-nowrap">
            <Wrench className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-zinc-200 font-medium">{item.car}</span>
            <span className="text-zinc-500">{item.parts}</span>
            <span className="text-amber-400 font-bold">{item.spend}</span>
            <span className="text-zinc-700">•</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <SiteHeader />

      {/* Hero */}
      <section className="relative px-4 pt-20 pb-16 sm:pt-28 sm:pb-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            9 categories · 58+ parts · any make, any model
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold text-zinc-100 tracking-tight leading-none">
            Customize <span className="text-amber-400">any car</span>.
            <br />
            Price it live.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Pick your make, model, and year. Stack wheels, wraps, exhaust, suspension,
            and more into one build with a running total.
            <br className="hidden sm:block" />
            Then order the parts or get matched with a certified install shop near you.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <Button asChild size="lg" className="text-base px-8">
              <Link href="/configurator">Start building free</Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="text-base">
              <Link href="/shop">Browse the catalog</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-zinc-600">
            Free to build. No credit card required.
          </p>
        </div>

        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 20%, rgba(245,158,11,0.05) 0%, transparent 60%)",
          }}
        />
      </section>

      {/* Live ticker */}
      <LiveTicker />

      {/* Categories */}
      <section id="categories" className="py-20 px-4">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-100">
              Every category, one build
            </h2>
            <p className="mt-3 text-zinc-400">
              Mix and match across the whole catalog — the total updates live.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICONS[c.id];
              return (
                <Link
                  key={c.id}
                  href={`/shop?category=${c.id}`}
                  className="group rounded-lg border border-[#1a1a1a] bg-[#111111] p-5 transition-colors hover:border-amber-500/40"
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-amber-500/10 border border-amber-500/20">
                    <Icon className="h-5 w-5 text-amber-500" />
                  </div>
                  <h3 className="font-semibold text-zinc-100 mb-1 flex items-center gap-1">
                    {c.label}
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-600 transition-transform group-hover:translate-x-0.5" />
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {c.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Flash sale — urgency drives conversion */}
      <section className="py-16 px-4 border-y border-zinc-800/50 bg-gradient-to-b from-amber-500/5 to-transparent">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/30 px-2.5 py-1 text-xs font-bold text-red-400 mb-2">
                <Sparkles className="h-3 w-3" />
                FLASH SALE
              </div>
              <h2 className="text-2xl font-bold text-zinc-100">
                Featured parts — today only
              </h2>
            </div>
            <CountdownTimer endDate={flashSaleEnd} className="text-base" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((p) => (
              <ProductCard key={p.id} product={p} href={`/shop/${p.id}`} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold text-zinc-100 mb-12">
            How it works
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                n: "1",
                title: "Configure your build",
                body: "Pick your car and stack parts across 9 categories with a live running total.",
              },
              {
                n: "2",
                title: "Order or get quotes",
                body: "Buy the parts direct, or request installation quotes from certified local shops.",
              },
              {
                n: "3",
                title: "Get it built",
                body: "Track your order, coordinate install, and save the build to share or reorder.",
              },
            ].map((step) => (
              <div key={step.n} className="text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-500 text-amber-400 text-xl font-bold mb-4">
                  {step.n}
                </div>
                <h3 className="font-semibold text-zinc-100 mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-400">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="py-10 px-4 border-y border-zinc-800/50 bg-zinc-900/20">
        <div className="mx-auto max-w-5xl grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            <p className="text-sm text-zinc-400">Secure checkout via Stripe, every order</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Gauge className="h-5 w-5 text-amber-500" />
            <p className="text-sm text-zinc-400">Fitment-aware catalog for any make or model</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Store className="h-5 w-5 text-amber-500" />
            <p className="text-sm text-zinc-400">Vetted install shop network nationwide</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-100">
            Your build starts here.
          </h2>
          <p className="mt-4 text-zinc-400">
            Free to configure. Pay only when you order.
          </p>
          <Button asChild size="lg" className="mt-8 text-base px-10">
            <Link href="/configurator">Start building — free</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 px-4">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-600">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-amber-600" />
            <span>RideForge</span>
          </div>
          <p>© {new Date().getFullYear()} RideForge. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/for-shops" className="hover:text-zinc-400 transition-colors">
              For Shops
            </Link>
            <a href="#" className="hover:text-zinc-400 transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-zinc-400 transition-colors">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
