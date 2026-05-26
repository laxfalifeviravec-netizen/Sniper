"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft } from "lucide-react";
import { AlertForm } from "@/components/alert-form";
import { alertsApi } from "@/lib/api";

export default function EditAlertPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: alert, isLoading, error } = useSWR(
    ["alert", id],
    () => alertsApi.get(id)
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-6 w-24 bg-zinc-800 rounded animate-pulse mb-6" />
        <div className="h-96 bg-[#111111] border border-[#1a1a1a] rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error || !alert) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          Failed to load alert.
        </div>
      </div>
    );
  }

  const defaultValues = {
    name: alert.name,
    make: alert.filters.make,
    model: alert.filters.model,
    year_min: alert.filters.year_min,
    year_max: alert.filters.year_max,
    mileage_max: alert.filters.mileage_max,
    price_min: alert.filters.price_min,
    price_max: alert.filters.price_max,
    colors: alert.filters.colors ?? [],
    transmissions: alert.filters.transmissions ?? [],
    sources: alert.filters.sources ?? [],
    exclude_stories: alert.filters.exclude_stories,
    required_options: alert.filters.required_options ?? [],
    notify_email: alert.notify_email,
    notify_sms: alert.notify_sms,
  };

  return (
    <div className="p-4 lg:p-6">
      <Link
        href={`/alerts/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to alert
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-100">Edit alert</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Update &ldquo;{alert.name}&rdquo;
        </p>
      </div>

      <AlertForm
        defaultValues={defaultValues}
        alertId={id}
      />
    </div>
  );
}
