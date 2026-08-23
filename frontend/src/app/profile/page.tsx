"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  MapPin,
  Wallet,
  ShieldCheck,
  Flame,
  Tag,
  Clock,
  LogOut,
  ChevronRight,
  Plus,
  Sparkles,
} from "lucide-react";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [isVegOnly, setIsVegOnly] = useState(false);
  const [spicePreference, setSpicePreference] = useState<"mild" | "medium" | "hot">("medium");

  const addresses = [
    {
      id: "addr-1",
      label: "Home",
      address: "Flat 402, Sunshine Heights, Indiranagar 100ft Rd, Bangalore",
      isDefault: true,
    },
    {
      id: "addr-2",
      label: "Work",
      address: "WeWork Galaxy, 43 Residency Road, Bangalore",
      isDefault: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center pb-24 lg:pb-8">
      <DesktopSidebar />

      <main className="flex-1 lg:pl-64 max-w-4xl w-full p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Link
              href="/feed"
              className="p-2 rounded-xl bg-card-elevated hover:bg-card-hover text-foreground border border-border transition-colors shadow-xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
                My Profile & Preferences
              </h1>
              <p className="text-xs text-muted">Manage delivery addresses and dietary tags</p>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-linear-to-tr from-primary to-secondary flex items-center justify-center text-white text-2xl font-black shadow-md">
              {user?.name?.[0] || "U"}
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-black text-foreground">{user?.name || "Gourmet Foodie"}</h2>
              <p className="text-xs text-muted">{user?.email || "foodie@crave.com"}</p>
              <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-primary/20">
                <Sparkles className="w-3 h-3" />
                <span>Insta-Zomato Gold Member</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-muted">In-App Wallet</span>
            <div className="text-xl font-black text-emerald-500">₹{user?.walletBalance || 150}</div>
          </div>
        </div>

        {/* Dietary Preferences Section */}
        <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Dietary & Taste Preferences
          </h3>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-card-elevated border border-border">
            <div className="space-y-0.5">
              <div className="text-sm font-bold text-foreground flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Pure-Veg Mode</span>
              </div>
              <p className="text-xs text-muted">Show only 100% vegetarian food reels & dishes</p>
            </div>
            <button
              onClick={() => {
                setIsVegOnly(!isVegOnly);
                toast.success(`Pure Veg Mode ${!isVegOnly ? "Enabled" : "Disabled"}`);
              }}
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                isVegOnly ? "bg-emerald-500" : "bg-muted/30"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                  isVegOnly ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Spice Level Preference */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-muted flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500" /> Default Spice Preference
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(["mild", "medium", "hot"] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSpicePreference(lvl)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold capitalize transition-all ${
                    spicePreference === lvl
                      ? "bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 font-extrabold shadow-xs"
                      : "bg-card-elevated border-border text-muted hover:text-foreground hover:bg-card-hover"
                  }`}
                >
                  {lvl} {lvl === "hot" ? "🔥" : lvl === "medium" ? "🟡" : "🟢"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Address Book */}
        <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Saved Addresses
            </h3>
            <button
              onClick={() => toast.info("Address selector modal...")}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New</span>
            </button>
          </div>

          <div className="space-y-3">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="p-4 rounded-2xl bg-card-elevated border border-border flex items-start justify-between gap-4 shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{addr.label}</span>
                    {addr.isDefault && (
                      <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full border border-primary/20">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted">{addr.address}</p>
                </div>
                <button className="text-xs text-muted hover:text-foreground font-semibold">
                  Edit
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Account Links & Logout */}
        <div className="bg-card border border-border rounded-3xl p-4 divide-y divide-border shadow-sm text-xs font-semibold">
          <Link
            href="/orders"
            className="flex items-center justify-between p-3 text-foreground hover:bg-card-hover rounded-xl transition-colors"
          >
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Order History & Receipts</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted" />
          </Link>

          <button
            onClick={() => {
              logout();
              toast.success("Logged out successfully");
            }}
            className="w-full flex items-center justify-between p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-4 h-4" />
              <span>Log Out Account</span>
            </div>
            <ChevronRight className="w-4 h-4 text-red-500/40" />
          </button>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
