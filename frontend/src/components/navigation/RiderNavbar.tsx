"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bike,
  Navigation,
  Compass,
  DollarSign,
  Power,
  ShieldCheck,
  LogOut,
  MapPin,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { toast } from "sonner";

export function RiderNavbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { href: "/rider", label: "Fleet Radar", icon: Compass },
    { href: "/rider/navigate", label: "Turn-by-Turn GPS", icon: Navigation },
  ];

  const toggleDutyStatus = () => {
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
    toast.success(
      nextStatus
        ? "You are now ONLINE 🛵 Ready to receive nearby order dispatch offers!"
        : "You are now OFFLINE ⏸️ Order offers paused."
    );
  };

  return (
    <>
      {/* Top Header for Desktop & Mobile */}
      <header className="sticky top-0 inset-x-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border px-4 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/rider" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-primary to-orange-500 flex items-center justify-center text-white shadow-md">
                <Bike className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-foreground flex items-center gap-1">
                  Rider<span className="text-primary">Fleet</span>
                </h1>
                <p className="text-[9px] text-muted font-bold tracking-wide">
                  HYPERLOCAL DISPATCH
                </p>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-border">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href === "/rider" && pathname === "/rider/radar");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? "bg-primary/15 text-primary border border-primary/25"
                        : "text-muted hover:text-foreground hover:bg-card-hover"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Controls: Duty Status + Earnings + Theme + Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Online / Offline Duty Button */}
            <button
              onClick={toggleDutyStatus}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs ${
                isOnline
                  ? "bg-emerald-500 text-white hover:bg-emerald-600 animate-pulse"
                  : "bg-muted/20 text-muted hover:bg-muted/30"
              }`}
            >
              <Power className="w-3 h-3" />
              <span>{isOnline ? "ON DUTY" : "OFF DUTY"}</span>
            </button>

            {/* Daily Earnings Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-extrabold">
              <DollarSign className="w-3.5 h-3.5" />
              <span>₹840 Today</span>
            </div>

            <ThemeToggle />

            {mounted && user && (
              <button
                onClick={() => logout()}
                title="Log Out"
                className="p-1.5 text-muted hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card/90 backdrop-blur-xl border-t border-border px-6 py-2 z-40 flex items-center justify-around shadow-sm">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href === "/rider" && pathname === "/rider/radar");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                isActive ? "text-primary font-bold" : "text-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
