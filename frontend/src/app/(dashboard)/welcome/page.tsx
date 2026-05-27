"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Check, Mail, MessageSquare, Loader2 } from "lucide-react";

interface FormValues {
  make: string;
  model: string;
  year: string;
  notifyEmail: boolean;
  notifySms: boolean;
}

const TOTAL_STEPS = 3;

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            i + 1 === current
              ? "w-6 bg-amber-500"
              : i + 1 < current
              ? "w-2 bg-amber-500/50"
              : "w-2 bg-zinc-700"
          )}
        />
      ))}
    </div>
  );
}

export default function WelcomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<FormValues>({
    make: "",
    model: "",
    year: "",
    notifyEmail: true,
    notifySms: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isPro = user?.plan === "pro";

  function handleNext() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleCreateAlert() {
    setSubmitting(true);
    setError("");
    try {
      const token = getToken();
      const alertName =
        [values.year, values.make, values.model].filter(Boolean).join(" ") ||
        "My first alert";

      const filters: Record<string, unknown> = {};
      if (values.make) filters.makes = [values.make];
      if (values.model) filters.models = [values.model];
      const yearNum = parseInt(values.year, 10);
      if (!isNaN(yearNum)) {
        filters.year_min = yearNum;
        filters.year_max = yearNum;
      }

      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({
          name: alertName,
          filters,
          notify_email: values.notifyEmail,
          notify_sms: values.notifySms && isPro,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { detail?: string }).detail ?? "Failed to create alert");
        return;
      }

      router.replace("/alerts");
    } catch {
      setError("Failed to create alert");
    } finally {
      setSubmitting(false);
    }
  }

  const hasCarInfo = values.make || values.model || values.year;

  const summaryName =
    [values.year, values.make, values.model].filter(Boolean).join(" ") ||
    "General alert (all cars)";

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <StepDots current={step} />

        {/* Step 1: Car details */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-zinc-100">
                What car are you hunting?
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                Tell us what you&apos;re looking for and we&apos;ll watch every
                major auction site 24/7.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
              <div>
                <Label htmlFor="make" className="mb-1.5 block">
                  Make
                </Label>
                <Input
                  id="make"
                  type="text"
                  placeholder="e.g. Porsche"
                  value={values.make}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, make: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="model" className="mb-1.5 block">
                  Model
                </Label>
                <Input
                  id="model"
                  type="text"
                  placeholder="e.g. 911"
                  value={values.model}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, model: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="year" className="mb-1.5 block">
                  Year
                </Label>
                <Input
                  id="year"
                  type="number"
                  placeholder="e.g. 2018"
                  value={values.year}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, year: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                className="text-zinc-500 hover:text-zinc-300"
                onClick={handleNext}
              >
                Skip
              </Button>
              <Button
                onClick={handleNext}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-8"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Notifications */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-zinc-100">
                How do you want to be notified?
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                Choose how you&apos;d like to hear about new matches.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
              {/* Email toggle — always on */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800">
                    <Mail className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-300">Email</p>
                    <p className="text-xs text-zinc-600">Always enabled</p>
                  </div>
                </div>
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500">
                  <Check className="h-3 w-3 text-black" />
                </div>
              </div>

              <div className="border-t border-zinc-800" />

              {/* SMS toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800">
                    <MessageSquare className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-300">SMS</p>
                    {!isPro ? (
                      <p className="text-xs text-amber-500">
                        Pro plan required
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-600">
                        Text message alerts
                      </p>
                    )}
                  </div>
                </div>
                {isPro ? (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={values.notifySms}
                    onClick={() =>
                      setValues((v) => ({ ...v, notifySms: !v.notifySms }))
                    }
                    className={cn(
                      "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                      values.notifySms ? "bg-amber-500" : "bg-zinc-700"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200",
                        values.notifySms ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                ) : (
                  <span className="text-xs font-medium text-amber-500 border border-amber-500/30 rounded-full px-2.5 py-0.5">
                    Upgrade
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                className="text-zinc-500 hover:text-zinc-300"
                onClick={handleBack}
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-8"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Summary / confirm */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-zinc-100">
                You&apos;re all set!
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                Here&apos;s the alert we&apos;re about to create for you.
              </p>
            </div>

            {/* Summary card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1">
                  Alert name
                </p>
                <p className="text-base font-semibold text-zinc-100">
                  {summaryName}
                </p>
              </div>

              {hasCarInfo && (
                <div className="border-t border-zinc-800 pt-4 grid grid-cols-3 gap-4">
                  {values.make && (
                    <div>
                      <p className="text-xs text-zinc-500">Make</p>
                      <p className="text-sm font-medium text-zinc-200">
                        {values.make}
                      </p>
                    </div>
                  )}
                  {values.model && (
                    <div>
                      <p className="text-xs text-zinc-500">Model</p>
                      <p className="text-sm font-medium text-zinc-200">
                        {values.model}
                      </p>
                    </div>
                  )}
                  {values.year && (
                    <div>
                      <p className="text-xs text-zinc-500">Year</p>
                      <p className="text-sm font-medium text-zinc-200">
                        {values.year}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-zinc-800 pt-4">
                <p className="text-xs text-zinc-500 mb-2">Notifications</p>
                <div className="flex gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">
                    <Mail className="h-3 w-3" />
                    Email
                  </span>
                  {values.notifySms && isPro && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">
                      <MessageSquare className="h-3 w-3" />
                      SMS
                    </span>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleCreateAlert}
                disabled={submitting}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold py-3"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating alert…
                  </>
                ) : (
                  "Create this alert"
                )}
              </Button>
              <button
                type="button"
                onClick={() => router.replace("/listings")}
                className="text-center text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Skip for now — browse listings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
