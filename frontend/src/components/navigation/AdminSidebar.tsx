"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  Users,
  Film,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export function AdminSidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { href: "/admin", label: "Admin Console", icon: ShieldCheck },
    { href: "/admin/moderation", label: "KYC & Moderation", icon: CheckCircle2, badge: "2 New" },
    { href: "/admin/analytics", label: "Financial GMV", icon: TrendingUp },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-card border-r border-border p-5 z-40 justify-between shadow-xs overflow-y-auto hide-scrollbar">
      <div className="space-y-5">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-1">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-foreground flex items-center gap-1">
                Admin<span className="text-rose-500">Core</span>
              </h1>
              <p className="text-[10px] text-muted font-medium tracking-wide">
                SUPERADMIN PORTAL
              </p>
            </div>
          </Link>
          <ThemeToggle />
        </div>

        {/* Security Badge */}
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1">
          <div className="flex items-center gap-2 text-rose-500 font-bold text-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Root Authority</span>
          </div>
          <p className="text-[10px] text-muted leading-tight">
            Encrypted RBAC Security Session Active
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1 pt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  isActive
                    ? "bg-rose-500/15 text-rose-500 border border-rose-500/30 shadow-xs font-bold"
                    : "text-muted hover:text-foreground hover:bg-card-hover"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-rose-500" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-500">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Admin User Footer */}
      <div className="pt-4 border-t border-border space-y-2">
        {mounted && user && (
          <div className="flex items-center justify-between p-2 rounded-2xl bg-card-elevated border border-border">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-500 border border-rose-500/30 flex items-center justify-center font-black text-xs">
                {user.name?.[0] || "A"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate">{user.name}</p>
                <p className="text-[10px] text-rose-500 font-bold">SuperAdmin</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Log Out"
              className="p-1.5 text-muted hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
