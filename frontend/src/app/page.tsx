"use client";

import Link from "next/link";
import {
  Bell,
  Car,
  Check,
  ChevronRight,
  Filter,
  MessageSquare,
  Target,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SourceBadge } from "@/components/source-badge";
import { PricingSection } from "@/components/pricing-section";
import { useAuth } from "@/lib/auth";
import type { Source } from "@/types";

const TICKER_ITEMS: {
  title: string;
  bid: string;
  source: Source;
  time: string;
}[] = [
  { title: "1987 Porsche 911 Carrera", bid: "$42,500", source: "bat", time: "2h left" },
  { title: "2003 BMW M3 Competition", bid: "$28,750", source: "cnb", time: "4h left" },
  { title: "1994 Acura NSX", bid: "$87,000", source: "bat", time: "12h left" },
  { title: "2007 Ferrari F430", bid: "$115,000", source: "pcarmarket", time: "1h left" },
  { title: "1969 Ford Mustang Boss 302", bid: "$65,000", source: "bat", time: "3h left" },
  { title: "2016 Porsche 911 GT3 RS", bid: "$178,000", source: "pcarmarket", time: "6h left" },
  { title: "2001 Honda S2000", bid: "$18,500", source: "cnb", time: "8h left" },
  { title: "1995 BMW E36 M3", bid: "$22,000", source: "bat", time: "22h left" },
  { title: "2014 Lotus Evora S", bid: "$44,000", source: "ebay", time: "5h left" },
  { title: "1991 Mazda RX-7 FC", bid: "$17,200", source: "cnb", time: "14h left" },
];

const FEATURES = [
  {
    icon: Filter,
    title: "Granular filters",
    description:
      "Filter by color, specific options (like Sport Chrono or sunroof), transmission type, and more.",
  },
  {
    icon: Bell,
    title: "Instant alerts",
    description:
      "Get notified the moment a matching car is listed — not hours later.",
  },
  {
    icon: MessageSquare,
    title: "SMS notifications",
    description:
      "Pro users receive SMS within 5 minutes of a new listing. No app required.",
  },
  {
    icon: Check,
    title: "No-Stories filter",
    description:
      "Automatically exclude salvage, rebuilt title, and flood cars from your results.",
  },
  {
    icon: Car,
    title: "4 platforms, one search",
    description:
      "Monitor BaT, Cars & Bids, PCarMarket, and eBay Motors simultaneously.",
  },
  {
    icon: Zap,
    title: "Unlimited alerts",
    description:
      "Pro users can set up unlimited saved searches across any make, model, or spec.",
  },
];

function LiveTicker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="overflow-hidden border-y border-zinc-800 bg-zinc-900/50 py-3">
      <div className="flex animate-ticker-scroll gap-8 w-max">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 text-sm whitespace-nowrap"
          >
            <SourceBadge source={item.source} />
            <span className="text-zinc-200 font-medium">{item.title}</span>
            <span className="text-amber-400 font-bold">{item.bid}</span>
            <span className="text-zinc-500">{item.time}</span>
            <span className="text-zinc-700">•</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-[#0a0a0a]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0a0a0a]/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-amber-500" />
            <span className="text-lg font-bold text-zinc-100 tracking-tight">
              Sniper
            </span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-zinc-400">
            <a href="#features" className="hover:text-zinc-100 transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-zinc-100 transition-colors">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button asChild>
                <Link href="/listings">
                  Dashboard
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/register">Sign up free</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-4 pt-20 pb-16 sm:pt-28 sm:pb-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Live monitoring across 4 platforms
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold text-zinc-100 tracking-tight leading-none">
            Never miss{" "}
            <span className="text-amber-400">the one</span>.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Get alerted the instant your dream car hits{" "}
            <span className="text-zinc-200">BaT</span>,{" "}
            <span className="text-zinc-200">Cars & Bids</span>,{" "}
            <span className="text-zinc-200">PCarMarket</span>, or{" "}
            <span className="text-zinc-200">eBay Motors</span>.
            <br className="hidden sm:block" />
            Specific options. Color combos. No-stories filter. SMS alerts.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <Button asChild size="lg" className="text-base px-8">
              <Link href="/register">Get started free</Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="text-base">
              <Link href="/listings">Browse live listings</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-zinc-600">
            Free forever on 3 alerts. No credit card required.
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

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-100">
              Built for serious buyers
            </h2>
            <p className="mt-3 text-zinc-400">
              Every feature was designed with the BaT crowd in mind.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-6"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-amber-500/10 border border-amber-500/20">
                    <Icon className="h-5 w-5 text-amber-500" />
                  </div>
                  <h3 className="font-semibold text-zinc-100 mb-2">{f.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 border-y border-zinc-800/50 bg-zinc-900/20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold text-zinc-100 mb-12">
            How it works
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                n: "1",
                title: "Set your alert",
                body: "Define your target car with as many or as few filters as you want.",
              },
              {
                n: "2",
                title: "We watch 24/7",
                body: "Our scrapers check all platforms every few minutes, around the clock.",
              },
              {
                n: "3",
                title: "You get the call",
                body: "Email or SMS the moment a match appears. You decide fast.",
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

      {/* Pricing */}
      <PricingSection />

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-100">
            Your next car is out there.
          </h2>
          <p className="mt-4 text-zinc-400">
            Don&apos;t let it sell while you&apos;re asleep.
          </p>
          <Button asChild size="lg" className="mt-8 text-base px-10">
            <Link href="/register">Create your first alert — free</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 px-4">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-600">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-amber-600" />
            <span>Sniper</span>
          </div>
          <p>© {new Date().getFullYear()} Sniper. All rights reserved.</p>
          <div className="flex gap-4">
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
