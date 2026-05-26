"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Car,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Target,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const navItems = [
  {
    href: "/listings",
    label: "Live Listings",
    icon: Car,
  },
  {
    href: "/alerts",
    label: "My Alerts",
    icon: Bell,
  },
  {
    href: "/account",
    label: "Account",
    icon: CreditCard,
  },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-amber-500/10 text-amber-400"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

export function NavSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-zinc-800">
        <Target className="h-6 w-6 text-amber-500 shrink-0" />
        <span className="text-lg font-bold text-zinc-100 tracking-tight">
          Sniper
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            active={pathname.startsWith(item.href)}
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </nav>

      {/* User / plan */}
      <div className="border-t border-zinc-800 p-3 space-y-2">
        {user && (
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-zinc-300 truncate">
              {user.name ?? user.email}
            </p>
            <div className="mt-1 flex items-center gap-2">
              {user.plan === "pro" ? (
                <Badge className="text-[10px] py-0 px-1.5 bg-amber-500 text-black">
                  PRO
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                  FREE
                </Badge>
              )}
              <span className="text-[10px] text-zinc-500">
                {user.alert_count} alert{user.alert_count !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-[#0d0d0d] h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-zinc-800 bg-[#0d0d0d] px-4 py-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-amber-500" />
          <span className="font-bold text-zinc-100">Sniper</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen((o) => !o)}
          className="text-zinc-400"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-30 bg-black/70"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed top-0 left-0 bottom-0 z-40 w-64 bg-[#0d0d0d] border-r border-zinc-800">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
