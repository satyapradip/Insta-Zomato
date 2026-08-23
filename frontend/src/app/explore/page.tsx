"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Sparkles,
  Flame,
  ShoppingBag,
  Film,
  MapPin,
  Clock,
  ArrowRight,
  Utensils,
} from "lucide-react";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { DietaryBadge } from "@/components/common/DietaryBadge";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { toast } from "sonner";

const CUISINES = [
  {
    name: "Italian Delicacies",
    dishCount: "120+ Dishes",
    image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Gourmet Burgers",
    dishCount: "95+ Dishes",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Dum Biryani & Kebabs",
    dishCount: "85+ Dishes",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Japanese & Sushi",
    dishCount: "45+ Dishes",
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=400&q=80",
  },
];

const POPULAR_DISHES = [
  {
    id: "pop-1",
    title: "Smokey Truffle Beast Burger",
    restaurant: "The Gourmet Grill",
    price: 349,
    isVeg: false,
    rating: 4.8,
    prepTime: 18,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "pop-2",
    title: "Woodfired Burrata Margherita",
    restaurant: "Bistro Verde",
    price: 499,
    isVeg: true,
    rating: 4.9,
    prepTime: 22,
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "pop-3",
    title: "Awadhi Gosht Dum Biryani",
    restaurant: "Dawat-e-Khas",
    price: 420,
    isVeg: false,
    rating: 4.7,
    prepTime: 25,
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "pop-4",
    title: "Truffle Parmesan French Fries",
    restaurant: "The Gourmet Grill",
    price: 149,
    isVeg: true,
    rating: 4.9,
    prepTime: 12,
    image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=400&q=80",
  },
];

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const addItem = useCartStore((state) => state.addItem);

  const categories = ["All", "Burgers 🍔", "Pizza 🍕", "Biryani 🍲", "Pasta 🍝", "Desserts 🍰"];

  const handleQuickAdd = (dish: (typeof POPULAR_DISHES)[0]) => {
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

  const filteredDishes = POPULAR_DISHES.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.restaurant.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center pb-24 lg:pb-8">
      <DesktopSidebar />

      <main className="flex-1 lg:pl-64 max-w-5xl w-full p-4 md:p-8 space-y-6">
        {/* Search Header */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              placeholder="Search for burgers, truffle pizza, biryani, or restaurants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border rounded-2xl pl-12 pr-4 py-3.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-primary shadow-xs"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
            {categories.map((cat) => {
              const isSelected = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border shadow-xs cursor-pointer ${
                    isSelected
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-card border-border text-foreground/80 hover:text-foreground hover:bg-card-hover hover:border-primary/30"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Flash Offers Banner */}
        <div className="relative rounded-3xl p-6 md:p-8 bg-linear-to-r from-primary via-secondary to-amber-500 overflow-hidden shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2 z-10">
            <div className="inline-flex items-center gap-1 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>LIMITED FLASH DEAL</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Flat 50% OFF on Your Cravings!
            </h2>
            <p className="text-xs text-white/90 font-medium">
              Use code <strong className="bg-black/25 px-2 py-0.5 rounded font-mono">CRAVE50</strong> at checkout on your first 3 food reels.
            </p>
          </div>

          <Link
            href="/feed"
            className="z-10 bg-white text-zinc-900 font-black text-xs px-6 py-3.5 rounded-2xl hover:bg-white/90 shadow-md transition-all active:scale-[0.98] flex items-center gap-2"
          >
            <span>Watch Food Reels 🎬</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 2-Column Cuisines Grid */}
        <div className="space-y-3 pt-2">
          <h2 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
            <Utensils className="w-4 h-4 text-primary" />
            <span>Explore by Cuisine</span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CUISINES.map((cuisine) => (
              <div
                key={cuisine.name}
                className="group relative h-36 rounded-2xl overflow-hidden border border-border shadow-xs cursor-pointer"
              >
                <img
                  src={cuisine.image}
                  alt={cuisine.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/35 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 space-y-0.5">
                  <h3 className="text-xs font-bold text-white leading-tight drop-shadow-md">
                    {cuisine.name}
                  </h3>
                  <p className="text-[10px] text-white/70 font-mono">{cuisine.dishCount}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Dishes Catalog Grid */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>Trending Food Near You</span>
            </h2>
            <Link href="/feed" className="text-xs font-bold text-primary hover:underline">
              View All Reels ➔
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {filteredDishes.map((dish) => (
              <div
                key={dish.id}
                className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm hover:border-border-hover transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={dish.image}
                    alt={dish.title}
                    className="w-16 h-16 rounded-xl object-cover border border-border flex-shrink-0"
                  />
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <DietaryBadge isVeg={dish.isVeg} />
                      <h3 className="text-sm font-bold text-foreground truncate">{dish.title}</h3>
                    </div>
                    <p className="text-[11px] text-muted truncate">{dish.restaurant}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-extrabold text-foreground">{formatPrice(dish.price)}</span>
                      <span className="text-muted">•</span>
                      <span className="text-[11px] text-amber-500 font-semibold">⭐ {dish.rating}</span>
                      <span className="text-muted">•</span>
                      <span className="text-[11px] text-muted">{dish.prepTime}m</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleQuickAdd(dish)}
                    className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-1.5 px-3.5 rounded-full transition-all flex items-center gap-1.5 active:scale-95 shadow-xs cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>+ Add</span>
                  </button>
                  <Link
                    href="/feed"
                    className="text-[10px] text-primary font-semibold hover:underline flex items-center gap-0.5"
                  >
                    <Film className="w-3 h-3" />
                    <span>Watch Reel</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
