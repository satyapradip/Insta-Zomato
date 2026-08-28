"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Compass, ShoppingBag, Clock, User } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { AuthModal } from "@/components/auth/AuthModal";

export function ConsumerBottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const itemCount = useCartStore((state) => state.getItemCount());
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { href: "/feed", label: "Feed", icon: Film },
    { href: "/explore", label: "Explore", icon: Compass },
    { href: "/cart", label: "Cart", icon: ShoppingBag, badge: mounted ? itemCount : 0 },
    { href: "/orders", label: "Orders", icon: Clock },
    { href: "/profile", label: "Profile", icon: User, requiresAuth: true },
  ];

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-card/90 backdrop-blur-xl border-t border-border px-4 py-2 z-40 flex items-center justify-around shadow-sm">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href === "/feed" && pathname === "/");

          if (item.requiresAuth && mounted && !isAuthenticated) {
            return (
              <button
                key={item.href}
                onClick={() => setIsAuthOpen(true)}
                className="relative flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all text-muted hover:text-foreground cursor-pointer"
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold tracking-tight">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                isActive ? "text-primary font-bold" : "text-muted hover:text-foreground"
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {mounted && item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-primary text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border border-card shadow-xs animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Auth Modal Trigger */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
