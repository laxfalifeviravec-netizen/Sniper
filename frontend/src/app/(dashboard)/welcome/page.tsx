"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MakeModelCombobox } from "@/components/make-model-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/products";
import type { Category } from "@/types";

const TOTAL_STEPS = 2;

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
  const [step, setStep] = useState(1);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [interest, setInterest] = useState<Category | "">("");

  function goToConfigurator() {
    const params = new URLSearchParams();
    if (make) params.set("make", make);
    if (model) params.set("model", model);
    if (year) params.set("year", year);
    router.replace(`/configurator?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <StepDots current={step} />

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-zinc-100">What are you building?</h1>
              <p className="mt-2 text-sm text-zinc-500">
                Tell us your car — we&apos;ll show you parts that fit.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
              <div>
                <Label className="mb-1.5 block">Vehicle</Label>
                <MakeModelCombobox make={make} model={model} onMakeChange={setMake} onModelChange={setModel} />
              </div>
              <div>
                <Label htmlFor="year" className="mb-1.5 block">Year</Label>
                <Input
                  id="year"
                  type="number"
                  placeholder="e.g. 2018"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                className="text-zinc-500 hover:text-zinc-300"
                onClick={() => setStep(2)}
              >
                Skip
              </Button>
              <Button
                onClick={() => setStep(2)}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-8"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-zinc-100">What&apos;s the first upgrade?</h1>
              <p className="mt-2 text-sm text-zinc-500">
                Pick a category to start with — you can add more once you&apos;re in the configurator.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setInterest(c.id)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-sm font-medium text-left transition-colors",
                      interest === c.id
                        ? "border-amber-500 bg-amber-500/10 text-amber-400"
                        : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button variant="ghost" className="text-zinc-500 hover:text-zinc-300" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={goToConfigurator}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-8"
              >
                Start building
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
