"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Film,
  Flame,
  ShoppingBag,
  Clock,
  Bookmark,
  Store,
  Bike,
  ShieldCheck,
  UploadCloud,
  User as UserIcon,
  UtensilsCrossed,
  LogIn,
  LogOut,
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { AuthModal } from "@/components/auth/AuthModal";

export function DesktopSidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const itemCount = useCartStore((state) => state.getItemCount());
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { href: "/feed", label: "For You Reels", icon: Film },
    { href: "/explore", label: "Explore & Cuisines", icon: Compass },
    { href: "/cart", label: "My Cart", icon: ShoppingBag, badge: mounted ? itemCount : 0 },
    { href: "/orders", label: "Live Orders", icon: Clock },
    { href: "/favorites", label: "Saved Wishlist", icon: Bookmark },
  ];

  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-card border-r border-border p-5 z-40 justify-between shadow-sm overflow-y-auto hide-scrollbar">
        <div className="space-y-5">
          {/* Brand Logo & Theme Switcher */}
          <div className="flex items-center justify-between px-1">
            <Link href="/feed" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-md">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-foreground flex items-center gap-1">
                  Insta<span className="text-primary">-Zomato</span>
                </h1>
                <p className="text-[10px] text-muted font-medium tracking-wide">
                  SIZZLING FOOD COMMERCE
                </p>
              </div>
            </Link>
            <ThemeToggle />
          </div>

          {/* Primary Navigation Links */}
          <nav className="space-y-1 pt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href === "/feed" && pathname === "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/25 shadow-xs font-bold"
                      : "text-muted hover:text-foreground hover:bg-card-hover"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {mounted && item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary text-white shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Specialized Role Consoles */}
          <div className="pt-3 border-t border-border space-y-1.5">
            <div className="text-[11px] font-bold text-muted uppercase tracking-wider px-3">
              Role Workspaces
            </div>

            <Link
              href="/partner/upload"
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                pathname === "/partner/upload"
                  ? "bg-amber-500/15 text-amber-500 font-bold border border-amber-500/30"
                  : "text-muted hover:text-foreground hover:bg-card-hover"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <UploadCloud className="w-3.5 h-3.5 text-amber-500" />
                <span>Upload Food Reel</span>
              </div>
              <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-md font-bold">Chef</span>
            </Link>

            <Link
              href="/partner/orders"
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                pathname === "/partner/orders"
                  ? "bg-amber-500/15 text-amber-500 font-bold border border-amber-500/30"
                  : "text-muted hover:text-foreground hover:bg-card-hover"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Store className="w-3.5 h-3.5 text-amber-500" />
                <span>Kitchen POS</span>
              </div>
              <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-md font-bold">Orders</span>
            </Link>

            <Link
              href="/rider"
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                pathname === "/rider"
                  ? "bg-primary/15 text-primary font-bold border border-primary/30"
                  : "text-muted hover:text-foreground hover:bg-card-hover"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bike className="w-3.5 h-3.5 text-primary" />
                <span>Rider Fleet App</span>
              </div>
              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-bold">GPS</span>
            </Link>

            <Link
              href="/admin"
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                pathname === "/admin"
                  ? "bg-rose-500/15 text-rose-500 font-bold border border-rose-500/30"
                  : "text-muted hover:text-foreground hover:bg-card-hover"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
                <span>SuperAdmin Portal</span>
              </div>
              <span className="text-[9px] bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded-md font-bold">Admin</span>
            </Link>
          </div>
        </div>

        {/* User Footer */}
        <div className="pt-4 border-t border-border space-y-2">
          {mounted && user ? (
            <div className="flex items-center justify-between p-2 rounded-2xl bg-card-elevated border border-border">
              <Link href="/profile" className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-black text-xs">
                  {user.name?.[0] || "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground truncate">{user.name}</p>
                  <p className="text-[10px] text-emerald-500 font-bold">
                    ₹{user.walletBalance || 0} Wallet
                  </p>
                </div>
              </Link>
              <button
                onClick={() => logout()}
                title="Log Out"
                className="p-1.5 text-muted hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In / Demo Login</span>
            </button>
          )}
        </div>
      </aside>

      {/* Auth Modal Popup */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
