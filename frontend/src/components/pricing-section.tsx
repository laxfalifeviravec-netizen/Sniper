"use client";

import Link from "next/link";
import { Check, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { billingApi } from "@/lib/api";
import { useState } from "react";

const FREE_FEATURES = [
  "Full configurator access",
  "Browse the entire parts catalog",
  "1 saved build",
  "Get installation quotes",
  "Standard checkout",
];

const PRO_FEATURES = [
  "Unlimited saved builds",
  "Member pricing — save up to 12% storewide",
  "Early access to new drops & flash sales",
  "Priority quote matching with top-rated shops",
  "Free shipping on every order",
  "Build sharing & export",
];

interface PricingCardProps {
  title: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  highlighted?: boolean;
  isLoading?: boolean;
}

function PricingCard({
  title,
  price,
  period,
  description,
  features,
  cta,
  ctaHref,
  onCtaClick,
  highlighted,
  isLoading,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border p-6 flex flex-col gap-6",
        highlighted
          ? "border-amber-500 bg-amber-500/5"
          : "border-[#1a1a1a] bg-[#111111]"
      )}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-amber-500 px-3 py-0.5 text-xs font-bold text-black uppercase tracking-wide">
            Most Popular
          </span>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
          {title}
        </h3>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-4xl font-extrabold text-zinc-100">{price}</span>
          {period && (
            <span className="text-sm text-zinc-500">/{period}</span>
          )}
        </div>
        <p className="mt-2 text-sm text-zinc-400">{description}</p>
      </div>

      <ul className="flex-1 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span className="text-sm text-zinc-300">{f}</span>
          </li>
        ))}
      </ul>

      {ctaHref ? (
        <Button
          asChild
          variant={highlighted ? "default" : "secondary"}
          className="w-full"
        >
          <Link href={ctaHref}>{cta}</Link>
        </Button>
      ) : (
        <Button
          variant={highlighted ? "default" : "secondary"}
          className="w-full"
          onClick={onCtaClick}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : cta}
        </Button>
      )}
    </div>
  );
}

export function PricingSection() {
  const { isAuthenticated, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const { checkout_url } = await billingApi.createCheckoutSession("pro");
      window.location.href = checkout_url;
    } catch {
      alert("Failed to start checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="pricing" className="py-20 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-zinc-100">
            Simple, honest pricing
          </h2>
          <p className="mt-3 text-zinc-400">
            Build for free. Upgrade for member pricing and unlimited builds.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <PricingCard
            title="Free"
            price="$0"
            description="Everything you need to design and price your first build."
            features={FREE_FEATURES}
            cta={isAuthenticated ? "Current plan" : "Get started free"}
            ctaHref={isAuthenticated ? "/builds" : "/register"}
          />
          <PricingCard
            title="Pro Builder"
            price="$19"
            period="month"
            description="For serious builders who mod more than once."
            features={PRO_FEATURES}
            cta={
              isAuthenticated && user?.plan === "pro"
                ? "Manage billing"
                : "Upgrade to Pro"
            }
            highlighted
            onCtaClick={
              isAuthenticated
                ? user?.plan === "pro"
                  ? async () => {
                      const { portal_url } = await billingApi.createPortalSession();
                      window.location.href = portal_url;
                    }
                  : handleUpgrade
                : undefined
            }
            ctaHref={!isAuthenticated ? "/register" : undefined}
            isLoading={isLoading}
          />
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-zinc-500">
          <Store className="h-4 w-4" />
          Run an install shop?{" "}
          <Link href="/for-shops" className="text-amber-500 hover:underline">
            See Shop Pro pricing →
          </Link>
        </div>
      </div>
    </section>
  );
}
