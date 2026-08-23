"use client";

import React from "react";
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
  User,
  UtensilsCrossed,
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export function DesktopSidebar() {
  const pathname = usePathname();
  const itemCount = useCartStore((state) => state.getItemCount());
  const user = useAuthStore((state) => state.user);

  const navItems = [
    { href: "/feed", label: "For You Reels", icon: Film },
    { href: "/explore", label: "Explore & Cuisines", icon: Compass },
    { href: "/trending", label: "Trending Food", icon: Flame },
    { href: "/cart", label: "My Cart", icon: ShoppingBag, badge: itemCount },
    { href: "/orders", label: "Live Orders", icon: Clock },
    { href: "/favorites", label: "Saved Wishlist", icon: Bookmark },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-card border-r border-border p-5 z-40 justify-between shadow-sm">
      <div className="space-y-6">
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
        <nav className="space-y-1.5 pt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href === "/feed" && pathname === "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl font-semibold text-sm transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/25 shadow-xs font-bold"
                    : "text-muted hover:text-foreground hover:bg-card-hover"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary text-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quick Food Categories */}
        <div className="pt-4 border-t border-border space-y-2">
          <div className="text-[11px] font-bold text-muted uppercase tracking-wider px-3">
            Popular Categories
          </div>
          <div className="space-y-1">
            {[
              { name: "Gourmet Burgers", count: 34, icon: "🍔" },
              { name: "Artisanal Pizza", count: 52, icon: "🍕" },
              { name: "Authentic Biryani", count: 28, icon: "🍲" },
              { name: "Desserts & Sweets", count: 19, icon: "🍰" },
            ].map((cat) => (
              <Link
                key={cat.name}
                href={`/explore?category=${encodeURIComponent(cat.name)}`}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-muted hover:text-foreground hover:bg-card-hover transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span>{cat.icon}</span>
                  <span className="font-medium">{cat.name}</span>
                </span>
                <span className="text-[10px] text-muted font-mono">{cat.count}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* User / Partner Studio Footer */}
      <div className="pt-4 border-t border-border space-y-3">
        <Link
          href="/partner/orders"
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-card-elevated hover:bg-card-hover text-amber-500 border border-amber-500/20 text-xs font-semibold transition-all shadow-xs"
        >
          <Store className="w-4 h-4" />
          <span>Restaurant Partner Studio</span>
        </Link>

        <div className="flex items-center gap-3 px-2 pt-1">
          <div className="w-9 h-9 rounded-full bg-card-elevated border border-border flex items-center justify-center text-foreground shadow-xs">
            <User className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{user?.name || "Guest Foodie"}</p>
            <p className="text-[10px] text-muted truncate">
              {user ? `₹${user.walletBalance || 0} Wallet` : "Sign In for Offers"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
