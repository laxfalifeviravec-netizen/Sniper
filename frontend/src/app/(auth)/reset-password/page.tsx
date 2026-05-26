"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: "Passwords do not match", path: ["confirm"] });

type FormData = z.infer<typeof schema>;

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [done, setDone] = useState(false);
  const [apiError, setApiError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setApiError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });
      if (!res.ok) {
        const j = await res.json();
        setApiError(j.detail || "Reset failed");
        return;
      }
      setDone(true);
    } catch {
      setApiError("Network error. Please try again.");
    }
  };

  if (!token) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <p className="text-red-400">Invalid reset link.</p>
    </div>
  );


  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-2xl font-bold text-amber-500 mb-4">⊙ Sniper</p>
          <h1 className="text-2xl font-bold text-zinc-100">Set new password</h1>
        </div>

        {done ? (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-zinc-300 mb-6">Password updated. You can now sign in.</p>
            <Button onClick={() => router.push("/login")} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold w-full">
              Sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {apiError && <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">{apiError}</div>}
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" {...register("password")} className="bg-zinc-900 border-zinc-700" />
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" {...register("confirm")} className="bg-zinc-900 border-zinc-700" />
              {errors.confirm && <p className="text-xs text-red-400">{errors.confirm.message}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reset password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="w-8 h-8 text-amber-500 animate-spin" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
