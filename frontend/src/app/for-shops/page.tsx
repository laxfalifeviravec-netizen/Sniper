"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  Loader2,
  MapPin,
  Phone,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { shopsApi, billingApi } from "@/lib/api";
import { CATEGORIES } from "@/lib/products";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import type { Category, Shop } from "@/types";

const FREE_FEATURES = [
  "See new leads in your area",
  "Preview job details (masked contact info)",
  "List your business on RideForge",
];

const PRO_FEATURES = [
  "Full customer contact info, instantly",
  "Claim & respond to unlimited leads",
  "Instant SMS alerts on new matching leads",
  "Priority placement in quote matching",
];

function ShopOnboardingForm({ onDone }: { onDone: (shop: Shop) => void }) {
  const [businessName, setBusinessName] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function toggleCategory(c: Category) {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!businessName || !zip) {
      toast({ title: "Missing info", description: "Business name and ZIP are required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const shop = await shopsApi.register({ business_name: businessName, zip, phone: phone || undefined, categories });
      toast({ title: "Shop profile created", description: "You're now visible to matching leads." });
      onDone(shop);
    } catch {
      toast({ title: "Failed to create shop profile", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="mb-1.5 block">Business name</Label>
          <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
        </div>
        <div>
          <Label className="mb-1.5 block">ZIP code</Label>
          <Input value={zip} onChange={(e) => setZip(e.target.value)} required />
        </div>
      </div>
      <div>
        <Label className="mb-1.5 block flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5" /> Phone (for instant SMS lead alerts)
        </Label>
        <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+14155550100" />
      </div>
      <div>
        <Label className="mb-2 block">Specialties</Label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => toggleCategory(c.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                categories.includes(c.id)
                  ? "bg-amber-500 text-black border-amber-500"
                  : "border-zinc-700 text-zinc-400 hover:text-zinc-100"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "Creating..." : "Create shop profile — free"}
      </Button>
    </form>
  );
}

export default function ForShopsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null | undefined>(undefined);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setShop(null);
      return;
    }
    shopsApi
      .me()
      .then(setShop)
      .catch(() => setShop(null));
  }, [isAuthenticated]);

  async function handleUpgrade() {
    setUpgrading(true);
    try {
      const { checkout_url } = await billingApi.createCheckoutSession("shop");
      window.location.href = checkout_url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start checkout.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setUpgrading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <SiteHeader />

      {/* Hero */}
      <section className="px-4 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 mb-6">
          <Store className="h-3.5 w-3.5" />
          For install shops & tuners
        </div>
        <h1 className="mx-auto max-w-2xl text-4xl sm:text-5xl font-extrabold text-zinc-100 tracking-tight">
          Stop chasing leads. <span className="text-amber-400">Let them find you.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-zinc-400">
          RideForge customers configure real builds with real budgets. We route install
          requests straight to shops in their category and ZIP code.
        </p>
      </section>

      {/* Stats */}
      <section className="px-4 pb-12">
        <div className="mx-auto max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Users, label: "Builders actively configuring", value: "growing weekly" },
            { icon: MapPin, label: "Matched by category + ZIP", value: "no cold outreach" },
            { icon: Bell, label: "Shop Pro alert speed", value: "instant SMS" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-5 text-center">
              <s.icon className="mx-auto h-5 w-5 text-amber-500 mb-2" />
              <p className="text-sm font-semibold text-zinc-100">{s.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Onboarding / pricing */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-3xl">
          {isLoading || shop === undefined ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
            </div>
          ) : !isAuthenticated ? (
            <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-8 text-center">
              <p className="text-zinc-300 mb-4">Create a free account to set up your shop profile.</p>
              <Button onClick={() => router.push("/register?next=/for-shops")}>
                Sign up as a shop
              </Button>
            </div>
          ) : !shop ? (
            <>
              <h2 className="text-xl font-bold text-zinc-100 mb-4 text-center">Create your shop profile</h2>
              <ShopOnboardingForm onDone={setShop} />
            </>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-6 flex flex-col gap-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Free</h3>
                  <div className="mt-2 text-4xl font-extrabold text-zinc-100">$0</div>
                </div>
                <ul className="flex-1 space-y-2.5">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button variant="secondary" disabled className="w-full">
                  {shop.is_pro ? "Included" : "Current plan"}
                </Button>
              </div>

              <div className="relative rounded-xl border border-amber-500 bg-amber-500/5 p-6 flex flex-col gap-6">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-amber-500 px-3 py-0.5 text-xs font-bold text-black uppercase tracking-wide">
                    Best for growth
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Shop Pro</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-zinc-100">$99</span>
                    <span className="text-sm text-zinc-500">/month</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    <p className="text-xs text-emerald-400">Most shops close 1 job to break even</p>
                  </div>
                </div>
                <ul className="flex-1 space-y-2.5">
                  {PRO_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" onClick={handleUpgrade} disabled={upgrading || shop.is_pro}>
                  {upgrading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {shop.is_pro ? "Active" : upgrading ? "Redirecting..." : "Upgrade to Shop Pro"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
