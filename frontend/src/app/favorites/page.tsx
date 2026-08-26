"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, ShoppingBag, Film } from "lucide-react";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { DietaryBadge } from "@/components/common/DietaryBadge";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { toast } from "sonner";

const SAVED_DISHES = [
  {
    id: "fav-1",
    title: "Woodfired Truffle Burrata Margherita",
    restaurant: "Bistro Verde Ristorante",
    price: 499,
    isVeg: true,
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "fav-2",
    title: "Smokey Truffle Beast Burger",
    restaurant: "The Gourmet Grill",
    price: 349,
    isVeg: false,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80",
  },
];

export default function FavoritesPage() {
  const addItem = useCartStore((state) => state.addItem);

  const handleQuickAdd = (dish: (typeof SAVED_DISHES)[0]) => {
    addItem("partner-1", dish.restaurant, {
      foodId: dish.id,
      title: dish.title,
      thumbnailUrl: dish.image,
      isVeg: dish.isVeg,
      basePrice: dish.price,
      quantity: 1,
    });
    toast.success(`Added ${dish.title} to cart! 🛒`);
  };

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
                Saved Wishlist
              </h1>
              <p className="text-xs text-muted">Your bookmarked dishes and collections</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SAVED_DISHES.map((dish) => (
            <div
              key={dish.id}
              className="bg-card border border-border rounded-3xl p-4 flex items-center justify-between gap-4 shadow-sm hover:border-primary/30 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={dish.image}
                  alt={dish.title}
                  className="w-16 h-16 rounded-2xl object-cover border border-border shrink-0"
                />
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <DietaryBadge isVeg={dish.isVeg} />
                    <h3 className="text-sm font-bold text-foreground truncate">{dish.title}</h3>
                  </div>
                  <p className="text-[11px] text-muted truncate">{dish.restaurant}</p>
                  <p className="text-xs font-extrabold text-primary">{formatPrice(dish.price)}</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <button
                  onClick={() => handleQuickAdd(dish)}
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-1.5 px-3 rounded-xl transition-colors flex items-center gap-1 shadow-xs"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Order</span>
                </button>
                <Link
                  href="/feed"
                  className="text-[10px] text-muted hover:text-foreground flex items-center gap-0.5"
                >
                  <Film className="w-3 h-3" />
                  <span>Reel</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
