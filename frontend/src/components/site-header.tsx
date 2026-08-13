"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ShoppingCart, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/configurator", label: "Configurator" },
  { href: "/shop", label: "Shop" },
  { href: "/quotes", label: "Get Quotes" },
  { href: "/for-shops", label: "For Shops" },
];

export function SiteHeader() {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-[#0a0a0a]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0a0a0a]/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Wrench className="h-6 w-6 text-amber-500" />
          <span className="text-lg font-bold text-zinc-100 tracking-tight">
            RideForge
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "transition-colors hover:text-zinc-100",
                pathname === l.href && "text-zinc-100"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/cart"
            className="relative flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            aria-label="Cart"
          >
            <ShoppingCart className="h-4.5 w-4.5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black">
                {count}
              </span>
            )}
          </Link>
          {isAuthenticated ? (
            <Button asChild size="sm">
              <Link href="/builds">
                Dashboard
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Sign up free</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
