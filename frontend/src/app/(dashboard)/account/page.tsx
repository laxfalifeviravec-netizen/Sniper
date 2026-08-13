"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CreditCard,
  Phone,
  User,
  Zap,
  Check,
  Shield,
  Store,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { authApi, billingApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";

const profileSchema = z.object({
  name: z.string().optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, "Enter a valid phone number (e.g. +14155550100)")
    .optional()
    .or(z.literal("")),
});

type ProfileData = z.infer<typeof profileSchema>;

export default function AccountPage() {
  const { user, updateUser } = useAuth();
  const [billingLoading, setBillingLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      phone: user?.phone ?? "",
    },
  });

  const onSaveProfile = async (data: ProfileData) => {
    try {
      const updated = await authApi.updateProfile({
        name: data.name || undefined,
        phone: data.phone || undefined,
      });
      updateUser(updated);
      toast({ title: "Profile updated", variant: "default" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Update failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      const { checkout_url } = await billingApi.createCheckoutSession("pro");
      window.location.href = checkout_url;
    } catch {
      toast({
        title: "Error",
        description: "Failed to start checkout.",
        variant: "destructive",
      });
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setBillingLoading(true);
    try {
      const { portal_url } = await billingApi.createPortalSession();
      window.location.href = portal_url;
    } catch {
      toast({
        title: "Error",
        description: "Failed to open billing portal.",
        variant: "destructive",
      });
    } finally {
      setBillingLoading(false);
    }
  };

  const isPro = user?.plan === "pro";

  return (
    <div className="p-4 lg:p-6 max-w-2xl">
      <h1 className="text-xl font-bold text-zinc-100 mb-6">Account</h1>

      {/* Plan section */}
      <section className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-5 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-semibold text-zinc-100 mb-1 flex items-center gap-2">
              Current plan
              {isPro ? (
                <Badge className="bg-amber-500 text-black text-xs">PRO</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">FREE</Badge>
              )}
            </h2>
            {isPro ? (
              <p className="text-sm text-zinc-400">
                Unlimited builds, member pricing, and free shipping.
              </p>
            ) : (
              <p className="text-sm text-zinc-400">
                1 saved build with standard pricing and shipping.
              </p>
            )}
          </div>

          {isPro ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleManageBilling}
              disabled={billingLoading}
            >
              <CreditCard className="mr-1.5 h-4 w-4" />
              {billingLoading ? "Loading..." : "Manage billing"}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleUpgrade}
              disabled={upgradeLoading}
            >
              <Zap className="mr-1.5 h-4 w-4" />
              {upgradeLoading ? "Loading..." : "Upgrade to Pro — $19/mo"}
            </Button>
          )}
        </div>

        {!isPro && (
          <>
            <Separator className="my-4" />
            <div className="grid grid-cols-2 gap-2">
              {[
                "Unlimited saved builds",
                "Member pricing storewide",
                "Free shipping",
                "Early access to drops",
                "Priority shop matching",
                "Build sharing & export",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-zinc-400">
                  <Check className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-4">
          <p className="text-2xl font-bold text-zinc-100">
            {user?.build_count ?? 0}
          </p>
          <p className="text-sm text-zinc-500 mt-0.5">Saved builds</p>
        </div>
        <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-4">
          <p className="text-2xl font-bold text-zinc-100">
            {user?.created_at ? formatDate(user.created_at) : "—"}
          </p>
          <p className="text-sm text-zinc-500 mt-0.5">Member since</p>
        </div>
      </section>

      {/* Profile form */}
      <section className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-5">
        <h2 className="font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-zinc-500" />
          Profile
        </h2>

        <form onSubmit={handleSubmit(onSaveProfile)} className="space-y-4">
          <div>
            <Label htmlFor="email" className="mb-1.5 block">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email ?? ""}
              disabled
              className="opacity-60"
            />
            <p className="mt-1 text-xs text-zinc-600">
              Email cannot be changed.
            </p>
          </div>

          <div>
            <Label htmlFor="name" className="mb-1.5 block">
              Display name
            </Label>
            <Input
              id="name"
              placeholder="Your name"
              {...register("name")}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="phone" className="mb-1.5 block flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              Phone number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+14155550100"
              {...register("phone")}
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-red-400">{errors.phone.message}</p>
            )}
            <p className="mt-1 text-xs text-zinc-600">
              Used if a shop needs to reach you about an installation quote.
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || !isDirty}
              size="sm"
            >
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </section>

      {/* Shop partner CTA */}
      {user?.role !== "shop" && (
        <section className="mt-6 rounded-lg border border-[#1a1a1a] bg-[#111111] p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <Store className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-zinc-100">Run an install shop?</h2>
              <p className="text-sm text-zinc-400 mt-0.5">
                List your business and get matched with builders looking for installation.
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link href="/for-shops">Get started</Link>
          </Button>
        </section>
      )}

      {/* Security note */}
      <div className="mt-4 flex items-center gap-2 text-xs text-zinc-600">
        <Shield className="h-3.5 w-3.5" />
        Your data is encrypted and never sold. Billing is handled by Stripe.
      </div>
    </div>
  );
}
