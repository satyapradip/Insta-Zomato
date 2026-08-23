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
import { ModifierDrawer } from "@/components/customizer/ModifierDrawer";
import { CartConflictModal } from "@/components/cart/CartConflictModal";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { DietaryBadge } from "@/components/common/DietaryBadge";
import { formatPrice, formatDistance } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { toast } from "sonner";
import Link from "next/link";

// High-fidelity fallback/demo food reels if backend has no uploaded videos yet
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
      _id: "partner-1",
      restaurantName: "The Gourmet Grill",
      cuisineTypes: ["American", "Burgers", "Fast Food"],
      rating: 4.8,
      ratingCount: 1240,
      isOpen: true,
      location: {
        type: "Point",
        coordinates: [77.5946, 12.9716],
        address: "Indiranagar 100ft Road, Bangalore",
      },
    },
  },
  {
    _id: "demo-2",
    title: "Woodfired Truffle Burrata Margherita",
    description: "Crispy Neapolitan thin crust, San Marzano tomato sauce, fresh burrata ball, black truffle oil drizzle.",
    price: 499,
    discountPrice: 599,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-taking-a-slice-of-pizza-with-cheese-pull-42997-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
    isVeg: true,
    category: "Pizza",
    spiceLevel: "mild",
    prepTimeMinutes: 22,
    calories: 620,
    isAvailable: true,
    variants: [
      { name: "10 Inch Medium", price: 499 },
      { name: "12 Inch Large", price: 649 },
    ],
    addOns: [
      { name: "Extra Fresh Burrata", price: 90 },
      { name: "Chili Flakes in Olive Oil", price: 20 },
      { name: "Stuffed Cheese Crust", price: 80 },
    ],
    likesCount: 9800,
    commentsCount: 420,
    savesCount: 2200,
    isLiked: true,
    isSaved: true,
    distanceKm: 2.4,
    partner: {
      _id: "partner-2",
      restaurantName: "Bistro Verde Ristorante",
      cuisineTypes: ["Italian", "Pizza", "Pastas"],
      rating: 4.9,
      ratingCount: 2310,
      isOpen: true,
      location: {
        type: "Point",
        coordinates: [77.6413, 12.9784],
        address: "Koramangala 5th Block, Bangalore",
      },
    },
  },
  {
    _id: "demo-3",
    title: "Dum Gosht Awadhi Dum Biryani",
    description: "Slow-cooked saffron basmati rice with marinated tender mutton chunks, fried onions, and whole spices.",
    price: 420,
    discountPrice: 480,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-serving-freshly-cooked-rice-43000-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80",
    isVeg: false,
    category: "Biryani",
    spiceLevel: "hot",
    prepTimeMinutes: 25,
    calories: 850,
    isAvailable: true,
    variants: [
      { name: "Single Portion", price: 420 },
      { name: "Family Handi (with Salan)", price: 799 },
    ],
    addOns: [
      { name: "Extra Boiled Egg", price: 20 },
      { name: "Mint Burani Raita", price: 40 },
      { name: "Gulab Jamun (2 pcs)", price: 50 },
    ],
    likesCount: 18400,
    commentsCount: 1200,
    savesCount: 5400,
    isLiked: false,
    isSaved: false,
    distanceKm: 3.1,
    partner: {
      _id: "partner-3",
      restaurantName: "Dawat-e-Khas",
      cuisineTypes: ["Mughlai", "Biryani", "North Indian"],
      rating: 4.7,
      ratingCount: 3400,
      isOpen: true,
      location: {
        type: "Point",
        coordinates: [77.6101, 12.9352],
        address: "Frazer Town, Bangalore",
      },
    },
  },
];

export default function FeedPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPureVegFilter, setIsPureVegFilter] = useState(false);
  const [activeTab, setActiveTab] = useState<"for_you" | "nearby" | "trending">("for_you");
  const [selectedFoodForDrawer, setSelectedFoodForDrawer] = useState<FoodItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const addItem = useCartStore((state) => state.addItem);
  const cartSubtotal = useCartStore((state) => state.getSubtotal());
  const cartItemsCount = useCartStore((state) => state.getItemCount());

  // Fetch live reels from backend API with fallback
  const { data: apiReels } = useQuery({
    queryKey: ["feed", activeTab],
    queryFn: async () => {
      try {
        const res = await api.get(`/feed?sort=${activeTab}&limit=10`);
        return res.data?.data?.items || [];
      } catch {
        return [];
      }
    },
  });

  const rawReels = apiReels && apiReels.length > 0 ? apiReels : DEMO_FOOD_REELS;
  const filteredReels = isPureVegFilter ? rawReels.filter((r: FoodItem) => r.isVeg) : rawReels;
  const currentFood = filteredReels[activeIndex] || filteredReels[0] || DEMO_FOOD_REELS[0];

  // Intersection observer / scroll snap listener
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, clientHeight } = containerRef.current;
      const index = Math.round(scrollTop / clientHeight);
      if (index !== activeIndex && index >= 0 && index < filteredReels.length) {
        setActiveIndex(index);
      }
    }
  };

  // Keyboard navigation for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") {
        setActiveIndex((prev) => Math.min(filteredReels.length - 1, prev + 1));
      } else if (e.key === "ArrowUp" || e.key === "k") {
        setActiveIndex((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredReels.length]);

  const handleOpenCustomizer = (food: FoodItem) => {
    setSelectedFoodForDrawer(food);
    setIsDrawerOpen(true);
  };

  const handleBuyNow = (food: FoodItem) => {
    addItem(food.partner._id, food.partner.restaurantName, {
      foodId: food._id,
      title: food.title,
      thumbnailUrl: food.thumbnailUrl,
      isVeg: food.isVeg,
      basePrice: food.price,
      quantity: 1,
    });
    toast.success("Ready for checkout! ⚡");
  };

  const handleToggleLike = (foodId: string) => {
    toast.success("Added to your Liked Dishes! ❤️");
  };

  const handleToggleSave = (foodId: string) => {
    toast.success("Saved to your Food Wishlist! ⭐");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center">
      {/* Desktop Left Sidebar (Fixed 260px) */}
      <DesktopSidebar />

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-64 flex flex-col xl:flex-row h-screen overflow-hidden">
        {/* CENTER COLUMN: 9:16 Cinema Reel Player */}
        <div className="flex-1 h-full flex flex-col items-center justify-between relative bg-black/40">
          {/* Top Floating Glass Header */}
          <header className="absolute top-0 inset-x-0 z-30 px-4 py-3 bg-linear-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between">
            {/* Location Selector */}
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-semibold text-white/90">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="truncate max-w-[140px]">Indiranagar, Bangalore</span>
              <ChevronDown className="w-3 h-3 text-white/60" />
            </div>

            {/* Segmented Feed Switcher */}
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/10 text-xs font-bold">
              <button
                onClick={() => setActiveTab("for_you")}
                className={`px-3 py-1 rounded-full transition-all ${
                  activeTab === "for_you" ? "bg-primary text-white shadow-md" : "text-white/60 hover:text-white"
                }`}
              >
                For You
              </button>
              <button
                onClick={() => setActiveTab("nearby")}
                className={`px-3 py-1 rounded-full transition-all ${
                  activeTab === "nearby" ? "bg-primary text-white shadow-md" : "text-white/60 hover:text-white"
                }`}
              >
                Nearby
              </button>
            </div>

            {/* Pure Veg Toggle */}
            <button
              onClick={() => setIsPureVegFilter(!isPureVegFilter)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
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
                className="w-full h-full snap-start flex-shrink-0 flex items-center justify-center p-0 md:py-6"
              >
                <ReelPlayer
                  food={food}
                  isActive={idx === activeIndex}
                  onOpenCustomizer={handleOpenCustomizer}
                  onBuyNow={handleBuyNow}
                  onOpenComments={() => toast.info("Opening comments thread... 💬")}
                  onToggleLike={handleToggleLike}
                  onToggleSave={handleToggleSave}
                />
              </div>
            ))}
          </div>

          {/* Mobile Bottom Navigation (Hidden on PC) */}
          <MobileBottomNav />
        </div>

        {/* RIGHT COLUMN (PC Only - 380px Dishly-Style Customization & Cart Panel) */}
        {currentFood && (
          <aside className="hidden xl:flex flex-col w-96 h-screen bg-card border-l border-border p-6 overflow-y-auto space-y-6 justify-between shadow-sm">
            <div className="space-y-6">
              {/* Dish Spotlight Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <DietaryBadge isVeg={currentFood.isVeg} showLabel />
                  <span className="text-xs text-muted flex items-center gap-1 font-medium">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    <span>Trending #1 in City</span>
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

              {/* Restaurant Info Card */}
              <div className="p-4 rounded-2xl bg-card-elevated border border-border space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    {currentFood.partner.restaurantName}
                  </span>
                  <span className="text-xs font-bold text-amber-500">
                    ⭐ {currentFood.partner.rating}
                  </span>
                </div>
                <p className="text-[11px] text-muted">
                  {currentFood.partner.cuisineTypes.join(" • ")} • {formatDistance(currentFood.distanceKm || 1.8)}
                </p>
              </div>

              {/* Quick Customization Options */}
              {currentFood.variants && currentFood.variants.length > 0 && (
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Portion Sizes Available
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {currentFood.variants.map((v: Variant) => (
                      <div
                        key={v.name}
                        className="p-3 rounded-xl bg-card-elevated border border-border text-xs text-foreground font-medium flex justify-between items-center shadow-xs"
                      >
                        <span>{v.name}</span>
                        <span className="font-bold text-primary">{formatPrice(v.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extra Add-ons */}
              {currentFood.addOns && currentFood.addOns.length > 0 && (
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Popular Pairings</span>
                  </div>
                  <div className="space-y-1.5">
                    {currentFood.addOns.map((a: AddOn) => (
                      <div
                        key={a.name}
                        className="p-2.5 rounded-xl bg-card-elevated border border-border text-xs text-foreground flex justify-between items-center shadow-xs"
                      >
                        <span>{a.name}</span>
                        <span className="font-semibold text-amber-500">+{formatPrice(a.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Order Action Box */}
            <div className="pt-4 border-t border-border space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenCustomizer(currentFood)}
                  className="flex-1 bg-card-elevated hover:bg-card-hover text-foreground font-bold py-3 px-4 rounded-xl border border-border text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <ShoppingBag className="w-4 h-4 text-primary" />
                  <span>Customise & Add</span>
                </button>
                <button
                  onClick={() => handleBuyNow(currentFood)}
                  className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>⚡ 1-Tap Buy</span>
                </button>
              </div>

              {/* Mini Cart Ledger Preview */}
              {cartItemsCount > 0 && (
                <Link
                  href="/cart"
                  className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs font-bold text-primary hover:bg-primary/15 transition-all shadow-xs"
                >
                  <span>🛒 Active Cart ({cartItemsCount} items)</span>
                  <span>{formatPrice(cartSubtotal)} ➔</span>
                </Link>
              )}
            </div>
          </aside>
        )}
      </main>

      {/* Flipkart-Style Modifier Bottom Sheet Drawer */}
      <ModifierDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        food={selectedFoodForDrawer}
      />

      {/* Single-Restaurant Conflict Protection Modal */}
      <CartConflictModal />
    </div>
  );
}
