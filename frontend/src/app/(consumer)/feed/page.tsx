"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin,
  Search,
  SlidersHorizontal,
  Flame,
  ChevronDown,
  Sparkles,
  ShoppingBag,
  Zap,
} from "lucide-react";
import { FoodItem, Variant, AddOn } from "@/types";
import { api } from "@/lib/api";
import { ReelPlayer } from "@/components/feed/ReelPlayer";
import { CommentsSheet } from "@/components/feed/CommentsSheet";
import { ModifierDrawer } from "@/components/customizer/ModifierDrawer";
import { CartConflictModal } from "@/components/cart/CartConflictModal";
import { DietaryBadge } from "@/components/common/DietaryBadge";
import { formatPrice, formatDistance } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { toast } from "sonner";
import Link from "next/link";

// ── High-Fidelity Demo Reels (Fallback if DB has 0 videos) ───────────────────
const DEMO_FOOD_REELS: FoodItem[] = [
  {
    _id: "demo-1",
    title: "Smokey Truffle Beast Burger",
    description: "Double smashed tender Angus beef patty, melted cheddar, truffle aioli on toasted brioche bun.",
    price: 349,
    discountPrice: 429,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-delicious-burger-42998-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    isVeg: false,
    category: "Burgers",
    spiceLevel: "medium",
    prepTimeMinutes: 18,
    calories: 780,
    isAvailable: true,
    variants: [
      { name: "Single Patty", price: 299 },
      { name: "Double Beast", price: 349 },
      { name: "Monster Triple with Fries", price: 449 },
    ],
    addOns: [
      { name: "Extra Truffle Mayo", price: 40 },
      { name: "Crispy Bacon Rashers", price: 70 },
      { name: "Melted Cheese Dip", price: 50 },
    ],
    likesCount: 14200,
    commentsCount: 842,
    savesCount: 3100,
    isLiked: false,
    isSaved: false,
    distanceKm: 1.8,
    partner: {
      _id: "p-1",
      restaurantName: "The Burger Loft",
      logoUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=200&q=80",
      rating: 4.8,
      ratingCount: 1240,
      isOpen: true,
      cuisineTypes: ["American", "Gourmet Burgers"],
      location: {
        type: "Point",
        coordinates: [77.6408, 12.9784],
        address: "100ft Road, Indiranagar, Bangalore",
      },
    },
  },
  {
    _id: "demo-2",
    title: "Neapolitan Wood-Fired Margherita",
    description: "San Marzano D.O.P tomatoes, fresh Fior di Latte mozzarella, fragrant sweet basil, extra virgin olive oil.",
    price: 499,
    discountPrice: 599,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-fresh-pizza-out-of-the-oven-43003-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80",
    isVeg: true,
    category: "Pizza",
    spiceLevel: "mild",
    prepTimeMinutes: 22,
    calories: 650,
    isAvailable: true,
    variants: [
      { name: "Regular 10 inch", price: 499 },
      { name: "Large 12 inch", price: 649 },
    ],
    addOns: [
      { name: "Burrata Ball Topping", price: 120 },
      { name: "Hot Honey Drizzle", price: 35 },
      { name: "Garlic Butter Crust", price: 45 },
    ],
    likesCount: 22800,
    commentsCount: 1290,
    savesCount: 5400,
    isLiked: true,
    isSaved: true,
    distanceKm: 2.4,
    partner: {
      _id: "p-2",
      restaurantName: "Toscano Artisan Crusts",
      logoUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=200&q=80",
      rating: 4.9,
      ratingCount: 3120,
      isOpen: true,
      cuisineTypes: ["Italian", "Wood-Fired Pizza"],
      location: {
        type: "Point",
        coordinates: [77.6012, 12.9716],
        address: "Lavelle Road, Bangalore",
      },
    },
  },
  {
    _id: "demo-3",
    title: "Old Delhi Special Butter Chicken",
    description: "Tandoori charred chicken chunks simmered in a velvety, satin-smooth tomato & cashew gravy with dollops of white butter.",
    price: 399,
    discountPrice: 480,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-top-shot-of-a-creamy-dish-served-in-a-plate-42994-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=800&q=80",
    isVeg: false,
    category: "North Indian",
    spiceLevel: "medium",
    prepTimeMinutes: 20,
    calories: 890,
    isAvailable: true,
    variants: [
      { name: "Half (2 Pcs + 1 Butter Naan)", price: 399 },
      { name: "Full Handi (4 Pcs + 2 Naans)", price: 649 },
    ],
    addOns: [
      { name: "Garlic Chur Chur Naan", price: 60 },
      { name: "Sirka Pyaz & Mint Chutney", price: 20 },
    ],
    likesCount: 31000,
    commentsCount: 2400,
    savesCount: 8900,
    isLiked: false,
    isSaved: false,
    distanceKm: 3.1,
    partner: {
      _id: "p-3",
      restaurantName: "Daryaganj Royal Kitchen",
      logoUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=200&q=80",
      rating: 4.7,
      ratingCount: 4890,
      isOpen: true,
      cuisineTypes: ["Mughlai", "North Indian"],
      location: {
        type: "Point",
        coordinates: [77.6245, 12.9352],
        address: "Koramangala 5th Block, Bangalore",
      },
    },
  },
];

export default function FeedPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"for_you" | "trending">("for_you");
  const [isPureVegFilter, setIsPureVegFilter] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Modifier Drawer State
  const [selectedFoodForDrawer, setSelectedFoodForDrawer] = useState<FoodItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Comments Sheet State
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentDishTitle, setCommentDishTitle] = useState("");

  const addItem = useCartStore((state) => state.addItem);
  const cartItemsCount = useCartStore((state) => state.getItemCount());
  const cartSubtotal = useCartStore((state) => state.getSubtotal());

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch real feeds from backend API, fall back to high-res demo reels
  const { data: serverFoods = [] } = useQuery<FoodItem[]>({
    queryKey: ["feed-reels", activeTab],
    queryFn: async () => {
      try {
        const res = await api.get("/food/feed");
        const list = res.data?.data || res.data || [];
        return list.length > 0 ? list : DEMO_FOOD_REELS;
      } catch (err) {
        return DEMO_FOOD_REELS;
      }
    },
    initialData: DEMO_FOOD_REELS,
  });

  const reels = serverFoods.length > 0 ? serverFoods : DEMO_FOOD_REELS;

  // Filter pure veg if active
  const filteredReels = isPureVegFilter ? reels.filter((r) => r.isVeg) : reels;
  const currentFood = filteredReels[activeIndex] || filteredReels[0];

  // Snapping scroll handler to update active index
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight } = containerRef.current;
    const index = Math.round(scrollTop / clientHeight);
    if (index !== activeIndex && index >= 0 && index < filteredReels.length) {
      setActiveIndex(index);
    }
  };

  const handleOpenCustomizer = (food: FoodItem) => {
    setSelectedFoodForDrawer(food);
    setIsDrawerOpen(true);
  };

  const handleBuyNow = (food: FoodItem) => {
    addItem(food.partner._id, food.partner.restaurantName, {
      foodId: food._id,
      title: food.title,
      basePrice: food.price,
      quantity: 1,
      thumbnailUrl: food.thumbnailUrl || food.videoUrl,
      isVeg: food.isVeg,
    });
    toast.success(`Added 1x ${food.title} to cart! 🛒`);
  };

  const handleToggleLike = (foodId: string) => {
    toast.success("Added to your Liked Dishes! ❤️");
  };

  const handleToggleSave = (foodId: string) => {
    toast.success("Saved to your Food Wishlist! ⭐");
  };

  const handleOpenComments = (food: FoodItem) => {
    setCommentDishTitle(food.title);
    setIsCommentsOpen(true);
  };

  return (
    <div className="flex flex-col xl:flex-row h-screen overflow-hidden w-full">
      {/* CENTER COLUMN: 9:16 Cinema Reel Player */}
      <div className="flex-1 h-full flex flex-col items-center justify-between relative bg-black/40">
        {/* Top Floating Glass Header */}
        <header className="absolute top-0 inset-x-0 z-30 px-4 py-3 bg-linear-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between">
          {/* Location Selector */}
          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-semibold text-white/90">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="truncate max-w-35">Indiranagar, Bangalore</span>
            <ChevronDown className="w-3 h-3 text-white/60" />
          </div>

          {/* Segmented Feed Switcher */}
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/10 text-xs font-bold">
            <button
              onClick={() => setActiveTab("for_you")}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                activeTab === "for_you" ? "bg-primary text-white shadow-md" : "text-white/60 hover:text-white"
              }`}
            >
              For You
            </button>
            <button
              onClick={() => setActiveTab("trending")}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                activeTab === "trending" ? "bg-primary text-white shadow-md" : "text-white/60 hover:text-white"
              }`}
            >
              Trending
            </button>
          </div>

          {/* Pure Veg Toggle */}
          <button
            onClick={() => setIsPureVegFilter(!isPureVegFilter)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
              isPureVegFilter
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                : "bg-black/50 text-white/70 border-white/10 hover:text-white"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Veg Only</span>
          </button>
        </header>

        {/* Vertical 9:16 Snapping Video Container */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="w-full h-full snap-y-mandatory overflow-y-scroll hide-scrollbar flex flex-col items-center"
        >
          {filteredReels.map((food: FoodItem, idx: number) => (
            <div
              key={food._id}
              className="w-full h-full snap-start shrink-0 flex items-center justify-center p-0 md:py-6"
            >
              <ReelPlayer
                food={food}
                isActive={idx === activeIndex}
                onOpenCustomizer={handleOpenCustomizer}
                onBuyNow={handleBuyNow}
                onOpenComments={handleOpenComments}
                onToggleLike={handleToggleLike}
                onToggleSave={handleToggleSave}
              />
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN (PC Only - 380px Dishly-Style Customization & Cart Panel) */}
      {currentFood && (
        <aside className="hidden xl:flex flex-col w-96 h-screen bg-card border-l border-border p-6 overflow-y-auto space-y-6 justify-between shadow-xs">
          <div className="space-y-6">
            {/* Dish Spotlight Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <DietaryBadge isVeg={currentFood.isVeg} showLabel />
                <span className="text-xs text-muted flex items-center gap-1 font-medium">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span>Trending #1 in Bangalore</span>
                </span>
              </div>
              <h3 className="text-2xl font-black text-foreground tracking-tight">
                {currentFood.title}
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                {currentFood.description}
              </p>
              <div className="flex items-baseline gap-3 pt-2">
                <span className="text-2xl font-black text-primary">
                  {formatPrice(currentFood.price)}
                </span>
                {currentFood.discountPrice && (
                  <span className="text-sm text-muted line-through">
                    {formatPrice(currentFood.discountPrice)}
                  </span>
                )}
              </div>
            </div>

            {/* Restaurant Information Card */}
            <div className="p-4 rounded-2xl bg-card-elevated border border-border space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground">
                  {currentFood.partner.restaurantName}
                </h4>
                <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-md text-xs font-bold border border-emerald-500/20">
                  <span>★</span>
                  <span>{currentFood.partner.rating}</span>
                </div>
              </div>
              <p className="text-xs text-muted">
                {currentFood.partner.cuisineTypes?.join(", ") || "Fast Food"}
              </p>
              <div className="flex items-center gap-3 pt-1 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>{formatDistance(currentFood.distanceKm || 2.5)}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>{currentFood.prepTimeMinutes || 20} mins prep</span>
                </span>
              </div>
            </div>

            {/* Portion Options Quick View */}
            {currentFood.variants && currentFood.variants.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider">
                  Portion Sizes Available
                </h4>
                <div className="space-y-2">
                  {currentFood.variants.map((v: Variant) => (
                    <div
                      key={v.name}
                      className="flex items-center justify-between p-3 rounded-xl bg-card-elevated border border-border text-xs"
                    >
                      <span className="font-semibold text-foreground">{v.name}</span>
                      <span className="font-bold text-primary">{formatPrice(v.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Actions & Cart Preview */}
          <div className="pt-4 border-t border-border space-y-3">
            {isMounted && cartItemsCount > 0 && (
              <div className="flex items-center justify-between px-1 text-xs text-muted">
                <span>Cart Items ({cartItemsCount}):</span>
                <span className="font-extrabold text-foreground">{formatPrice(cartSubtotal)}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleOpenCustomizer(currentFood)}
                className="py-3 px-4 rounded-xl bg-card-elevated hover:bg-card-hover border border-border text-foreground font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-primary" />
                <span>Customize</span>
              </button>
              <Link
                href="/cart"
                className="py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>View Cart {isMounted && cartItemsCount > 0 ? `(${cartItemsCount})` : ""}</span>
              </Link>
            </div>
          </div>
        </aside>
      )}

      {/* Vaul Bottom Sheet Modifier Drawer */}
      <ModifierDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        food={selectedFoodForDrawer}
      />

      {/* Interactive Comments Sheet */}
      <CommentsSheet
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        dishTitle={commentDishTitle}
      />

      {/* Single-Restaurant Cart Conflict Modal */}
      <CartConflictModal />
    </div>
  );
}
