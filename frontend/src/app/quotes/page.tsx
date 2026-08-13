"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MakeModelCombobox } from "@/components/make-model-combobox";
import { CATEGORIES } from "@/lib/products";
import { leadsApi } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import type { Category } from "@/types";

function QuotesContent() {
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [zip, setZip] = useState("");
  const [category, setCategory] = useState<Category | "">(
    (searchParams.get("category") as Category) || ""
  );
  const [make, setMake] = useState(searchParams.get("make") ?? "");
  const [model, setModel] = useState(searchParams.get("model") ?? "");
  const [year, setYear] = useState(searchParams.get("year") ?? "");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !zip) {
      toast({ title: "Missing info", description: "Name, email, and ZIP are required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await leadsApi.create({
        name,
        email,
        phone: phone || undefined,
        zip,
        category: category || undefined,
        make: make || undefined,
        model: model || undefined,
        year: year ? Number(year) : undefined,
        notes: notes || undefined,
      });
      setSubmitted(true);
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <SiteHeader />
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-400 mb-3">
            <MapPin className="h-3 w-3" />
            Free — no obligation
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">Get installation quotes</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Tell us what you&apos;re building and we&apos;ll match you with certified shops near you.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <h2 className="mt-4 font-semibold text-zinc-100">Request sent</h2>
            <p className="mt-1 text-sm text-zinc-400">
              We&apos;ve notified shops in your area. Expect quotes by email within 24 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label className="mb-1.5 block">ZIP code</Label>
                <Input value={zip} onChange={(e) => setZip(e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label className="mb-1.5 block">Phone (optional)</Label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">Vehicle</Label>
              <MakeModelCombobox make={make} model={model} onMakeChange={setMake} onModelChange={setModel} />
            </div>
            <div>
              <Label className="mb-1.5 block">Year</Label>
              <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2022" />
            </div>

            <div>
              <Label className="mb-1.5 block">What do you need installed?</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="input-base w-full text-sm"
              >
                <option value="">Any / not sure yet</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="mb-1.5 block">Notes (optional)</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="input-base w-full text-sm resize-none"
                placeholder="Parts you already have, timeline, budget..."
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Sending..." : "Request free quotes"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function QuotesPage() {
  return (
    <Suspense fallback={null}>
      <QuotesContent />
    </Suspense>
  );
}
