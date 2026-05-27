"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  Car,
  Filter,
  Globe,
  Bell,
  ClipboardCheck,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  TestTube2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn, COLORS } from "@/lib/utils";
import { alertsApi } from "@/lib/api";
import { MakeModelCombobox } from "@/components/make-model-combobox";
import { useAuth } from "@/lib/auth";
import type { Source, Transmission, AlertCreatePayload } from "@/types";
import { SOURCE_LABELS, TRANSMISSION_LABELS } from "@/types";
import { toast } from "@/components/ui/use-toast";

const SOURCES: Source[] = ["bat", "cnb", "pcarmarket", "ebay"];
const TRANSMISSIONS: Transmission[] = ["manual", "automatic", "pdk", "dct"];

const alertSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  make: z.string().optional(),
  model: z.string().optional(),
  year_min: z.number().int().min(1900).max(2030).optional(),
  year_max: z.number().int().min(1900).max(2030).optional(),
  mileage_max: z.number().int().min(0).optional(),
  price_min: z.number().min(0).optional(),
  price_max: z.number().min(0).optional(),
  colors: z.array(z.string()).optional(),
  transmissions: z.array(z.string()).optional(),
  sources: z.array(z.string()).min(1, "Select at least one source"),
  exclude_stories: z.boolean().optional(),
  required_options: z.array(z.string()).optional(),
  notify_email: z.boolean(),
  notify_sms: z.boolean(),
});

type AlertFormData = z.infer<typeof alertSchema>;

const STEPS = [
  { id: 1, label: "What car", icon: Car },
  { id: 2, label: "Condition", icon: Filter },
  { id: 3, label: "Sources", icon: Globe },
  { id: 4, label: "Alerts", icon: Bell },
  { id: 5, label: "Review", icon: ClipboardCheck },
];

interface AlertFormProps {
  defaultValues?: Partial<AlertFormData>;
  alertId?: string;
  onSuccess?: () => void;
}

export function AlertForm({ defaultValues, alertId, onSuccess }: AlertFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [optionInput, setOptionInput] = useState("");
  const [testResult, setTestResult] = useState<{ count: number } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPro = user?.plan === "pro";

  const form = useForm<AlertFormData>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      notify_email: true,
      notify_sms: false,
      sources: ["bat", "cnb", "pcarmarket", "ebay"],
      colors: [],
      transmissions: [],
      required_options: [],
      exclude_stories: false,
      ...defaultValues,
    },
  });

  const { register, watch, setValue, getValues, formState: { errors } } = form;
  const values = watch();

  const toggleArray = <T extends string>(
    field: keyof AlertFormData,
    value: T
  ) => {
    const current = (values[field] as T[] | undefined) ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setValue(field, next as never);
  };

  const addOption = () => {
    const trimmed = optionInput.trim();
    if (!trimmed) return;
    const current = values.required_options ?? [];
    if (!current.includes(trimmed)) {
      setValue("required_options", [...current, trimmed]);
    }
    setOptionInput("");
  };

  const removeOption = (opt: string) => {
    setValue(
      "required_options",
      (values.required_options ?? []).filter((o) => o !== opt)
    );
  };

  const buildPayload = (): AlertCreatePayload => {
    const v = getValues();
    return {
      name: v.name ?? "My Alert",
      filters: {
        make: v.make || undefined,
        model: v.model || undefined,
        year_min: v.year_min,
        year_max: v.year_max,
        mileage_max: v.mileage_max,
        price_min: v.price_min,
        price_max: v.price_max,
        colors: v.colors?.length ? v.colors : undefined,
        transmissions: v.transmissions?.length
          ? (v.transmissions as Transmission[])
          : undefined,
        sources: (v.sources as Source[]),
        exclude_stories: v.exclude_stories || undefined,
        required_options: v.required_options?.length
          ? v.required_options
          : undefined,
      },
      notify_email: v.notify_email,
      notify_sms: v.notify_sms,
    };
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await alertsApi.test(buildPayload());
      setTestResult({ count: result.count });
    } catch {
      toast({
        title: "Test failed",
        description: "Could not connect to the API.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = buildPayload();
      if (alertId) {
        await alertsApi.update(alertId, payload);
        toast({ title: "Alert updated" });
      } else {
        await alertsApi.create(payload);
        toast({ title: "Alert created" });
      }
      onSuccess?.();
      router.push("/alerts");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save alert.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 3 && (!values.sources || values.sources.length === 0))
      return false;
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicators */}
      <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = s.id === step;
          const isDone = s.id < step;
          return (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => isDone && setStep(s.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                  isActive && "text-amber-400 bg-amber-500/10",
                  isDone && "text-zinc-300 cursor-pointer hover:text-zinc-100",
                  !isActive && !isDone && "text-zinc-600 cursor-not-allowed"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="w-4 h-px bg-zinc-700 mx-0.5 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-6">
        {/* Step 1: What car */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                What car are you hunting?
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Define the make, model, and year range.
              </p>
            </div>
            <div>
              <Label className="mb-1.5 block">Make / Model</Label>
              <MakeModelCombobox
                make={values.make ?? ""}
                model={values.model ?? ""}
                onMakeChange={(v) => setValue("make", v)}
                onModelChange={(v) => setValue("model", v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="year_min" className="mb-1.5 block">Year from</Label>
                <Input
                  id="year_min"
                  type="number"
                  placeholder="1970"
                  {...register("year_min", { valueAsNumber: true })}
                />
              </div>
              <div>
                <Label htmlFor="year_max" className="mb-1.5 block">Year to</Label>
                <Input
                  id="year_max"
                  type="number"
                  placeholder="2024"
                  {...register("year_max", { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Condition */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                Condition & spec filters
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Narrow down by mileage, price, color, and transmission.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mileage_max" className="mb-1.5 block">Max mileage</Label>
                <Input
                  id="mileage_max"
                  type="number"
                  placeholder="100000"
                  {...register("mileage_max", { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price_min" className="mb-1.5 block">Min price ($)</Label>
                <Input
                  id="price_min"
                  type="number"
                  placeholder="0"
                  {...register("price_min", { valueAsNumber: true })}
                />
              </div>
              <div>
                <Label htmlFor="price_max" className="mb-1.5 block">Max price ($)</Label>
                <Input
                  id="price_max"
                  type="number"
                  placeholder="Any"
                  {...register("price_max", { valueAsNumber: true })}
                />
              </div>
            </div>

            <Separator />

            <div>
              <Label className="mb-2 block">Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => {
                  const active = values.colors?.includes(color);
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => toggleArray("colors", color)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        active
                          ? "border-amber-500 bg-amber-500/10 text-amber-400"
                          : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                      )}
                    >
                      {color}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Transmission</Label>
              <div className="grid grid-cols-2 gap-2">
                {TRANSMISSIONS.map((tx) => (
                  <div key={tx} className="flex items-center gap-2">
                    <Checkbox
                      id={`tx-${tx}`}
                      checked={values.transmissions?.includes(tx) ?? false}
                      onCheckedChange={() => toggleArray("transmissions", tx)}
                    />
                    <Label htmlFor={`tx-${tx}`} className="cursor-pointer text-zinc-300">
                      {TRANSMISSION_LABELS[tx]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-200">Exclude Stories</p>
                <p className="text-xs text-zinc-500">
                  Skip salvage, rebuilt title, and flood cars
                </p>
              </div>
              <Switch
                checked={values.exclude_stories ?? false}
                onCheckedChange={(v) => setValue("exclude_stories", v)}
              />
            </div>

            <div>
              <Label className="mb-2 block">Required options / keywords</Label>
              <p className="text-xs text-zinc-500 mb-2">
                Listing must contain ALL of these terms (e.g. &quot;Sport Chrono&quot;, &quot;sunroof&quot;)
              </p>
              <div className="flex gap-2">
                <Input
                  value={optionInput}
                  onChange={(e) => setOptionInput(e.target.value)}
                  placeholder="e.g. Sport Chrono"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addOption();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={addOption}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {(values.required_options ?? []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(values.required_options ?? []).map((opt) => (
                    <span
                      key={opt}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-xs text-amber-400"
                    >
                      {opt}
                      <button
                        type="button"
                        onClick={() => removeOption(opt)}
                        className="ml-0.5 hover:text-amber-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Sources */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                Which platforms to monitor?
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                We&apos;ll check all selected sources and alert you instantly.
              </p>
            </div>
            <div className="space-y-3">
              {SOURCES.map((src) => {
                const active = values.sources?.includes(src) ?? false;
                return (
                  <label
                    key={src}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                      active
                        ? "border-amber-500/50 bg-amber-500/5"
                        : "border-zinc-800 hover:border-zinc-700"
                    )}
                  >
                    <Checkbox
                      checked={active}
                      onCheckedChange={() => toggleArray("sources", src)}
                    />
                    <span className="font-medium text-zinc-200">
                      {SOURCE_LABELS[src]}
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.sources && (
              <p className="text-sm text-red-400">{errors.sources.message}</p>
            )}
          </div>
        )}

        {/* Step 4: Notifications */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                How do you want to be notified?
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Email is always included. SMS requires Pro.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-zinc-800 p-4">
                <div>
                  <p className="font-medium text-zinc-200">Email</p>
                  <p className="text-xs text-zinc-500">
                    Always included on all plans
                  </p>
                </div>
                <Switch checked disabled />
              </div>

              <div
                className={cn(
                  "rounded-lg border p-4",
                  isPro ? "border-zinc-800" : "border-zinc-800 opacity-60"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-zinc-200">
                      SMS{" "}
                      {!isPro && (
                        <span className="ml-1 text-[10px] uppercase tracking-wide text-amber-500 font-bold">
                          Pro
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {isPro
                        ? "Text message within 5 min of listing"
                        : "Upgrade to Pro to enable SMS alerts"}
                    </p>
                  </div>
                  <Switch
                    checked={values.notify_sms}
                    onCheckedChange={(v) => setValue("notify_sms", v)}
                    disabled={!isPro}
                  />
                </div>
                {!isPro && (
                  <div className="mt-3 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                    <p className="text-xs text-amber-400">
                      SMS alerts are available on the Pro plan ($9.99/mo).
                      You&apos;ll be upgraded after checkout.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                Review & name your alert
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Give it a name you&apos;ll recognize in your list.
              </p>
            </div>

            <div>
              <Label htmlFor="name" className="mb-1.5 block">Alert name</Label>
              <Input
                id="name"
                placeholder="e.g. Air-cooled 911 under $80k"
                {...register("name")}
                autoFocus
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.name.message}
                </p>
              )}
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                Summary
              </h3>
              <div className="rounded-lg bg-zinc-900 p-4 space-y-2">
                {(values.make || values.model) && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Car</span>
                    <span className="text-zinc-200">
                      {[values.make, values.model].filter(Boolean).join(" ")}
                    </span>
                  </div>
                )}
                {(values.year_min || values.year_max) && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Years</span>
                    <span className="text-zinc-200">
                      {values.year_min ?? "Any"} – {values.year_max ?? "Any"}
                    </span>
                  </div>
                )}
                {values.mileage_max && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Max mileage</span>
                    <span className="text-zinc-200">
                      {values.mileage_max.toLocaleString()} mi
                    </span>
                  </div>
                )}
                {values.sources && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Sources</span>
                    <span className="text-zinc-200">
                      {(values.sources as Source[])
                        .map((s) => SOURCE_LABELS[s])
                        .join(", ")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-400">Notifications</span>
                  <span className="text-zinc-200">
                    {[
                      values.notify_email && "Email",
                      values.notify_sms && "SMS",
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
                {values.exclude_stories && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">No Stories</span>
                    <span className="text-green-400">Enabled</span>
                  </div>
                )}
              </div>
            </div>

            {/* Test button */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleTest}
                disabled={isTesting}
              >
                <TestTube2 className="mr-1.5 h-3.5 w-3.5" />
                {isTesting ? "Testing..." : "Test this alert"}
              </Button>
              {testResult && (
                <span className="text-sm text-zinc-300">
                  <span className="font-semibold text-amber-400">
                    {testResult.count}
                  </span>{" "}
                  current listing{testResult.count !== 1 ? "s" : ""} match
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-4">
        <Button
          variant="secondary"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 1}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>

        {step < 5 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : alertId
              ? "Update alert"
              : "Create alert"}
          </Button>
        )}
      </div>
    </div>
  );
}
