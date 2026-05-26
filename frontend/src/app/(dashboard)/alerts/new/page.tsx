import { Metadata } from "next";
import { AlertForm } from "@/components/alert-form";

export const metadata: Metadata = {
  title: "New Alert",
};

export default function NewAlertPage() {
  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-100">Create alert</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Define what you&apos;re hunting and we&apos;ll watch 24/7.
        </p>
      </div>
      <AlertForm />
    </div>
  );
}
