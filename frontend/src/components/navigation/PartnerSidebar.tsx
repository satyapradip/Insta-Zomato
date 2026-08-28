"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Store,
  UploadCloud,
  Layers,
  ChefHat,
  Bell,
  BellOff,
  LogOut,
  Power,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { toast } from "sonner";

export function PartnerSidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { href: "/partner/orders", label: "Kitchen POS Orders", icon: Store, badge: "Live" },
    { href: "/partner/upload", label: "Upload Food Reel", icon: UploadCloud, badge: "New" },
    { href: "/partner/studio", label: "Menu & Reel Studio", icon: Layers },
  ];

  const toggleStoreStatus = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    toast.success(
      nextState
        ? "Kitchen is now OPEN for customer orders! 🍳"
        : "Kitchen set to CLOSED (Paused incoming orders) ⏸️"
    );
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-card border-r border-border p-5 z-40 justify-between shadow-xs overflow-y-auto hide-scrollbar">
      <div className="space-y-5">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-1">
          <Link href="/partner/orders" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-foreground flex items-center gap-1">
                Partner<span className="text-amber-500">POS</span>
              </h1>
              <p className="text-[10px] text-muted font-medium tracking-wide">
                KITCHEN WORKSPACE
              </p>
            </div>
          </Link>
          <ThemeToggle />
        </div>

        {/* Store Live Status Toggle */}
        <div className="p-3 rounded-2xl bg-card-elevated border border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              <span className="text-xs font-bold text-foreground">
                {isOpen ? "Kitchen Online" : "Kitchen Paused"}
              </span>
            </div>
            <button
              onClick={toggleStoreStatus}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isOpen
                  ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25"
                  : "bg-rose-500/15 text-rose-500 hover:bg-rose-500/25"
              }`}
              title="Toggle Store Status"
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-muted leading-tight">
            {isOpen ? "Accepting orders from feed" : "Paused on discovery feed"}
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1 pt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href === "/partner/orders" && pathname === "/partner");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  isActive
                    ? "bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-xs font-bold"
                    : "text-muted hover:text-foreground hover:bg-card-hover"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-amber-500" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-500">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Audio Alerts Setting */}
        <div className="pt-2">
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              toast.info(soundEnabled ? "Order chime muted" : "Order chime enabled 🔔");
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-muted hover:text-foreground hover:bg-card-hover transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              {soundEnabled ? (
                <Bell className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <BellOff className="w-3.5 h-3.5 text-muted" />
              )}
              <span>New Order Chime</span>
            </div>
            <span className="text-[10px] font-bold text-muted">
              {soundEnabled ? "ON" : "OFF"}
            </span>
          </button>
        </div>
      </div>

      {/* Partner User Footer */}
      <div className="pt-4 border-t border-border space-y-2">
        {mounted && user && (
          <div className="flex items-center justify-between p-2 rounded-2xl bg-card-elevated border border-border">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center justify-center font-black text-xs">
                {user.name?.[0] || "P"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate">{user.name}</p>
                <p className="text-[10px] text-amber-500 font-bold">Kitchen Partner</p>
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
