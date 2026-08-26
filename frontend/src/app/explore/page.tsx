"use client";

import React, { useState, useEffect } from "react";
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
  X,
  SlidersHorizontal,
} from "lucide-react";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { DietaryBadge } from "@/components/common/DietaryBadge";
import { ModifierDrawer } from "@/components/customizer/ModifierDrawer";
import { CartConflictModal } from "@/components/cart/CartConflictModal";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { FoodItem } from "@/types";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface SuggestionItem {
  text: string;
  type?: string;
  subtext?: string;
  icon?: string;
}

const POPULAR_DISHES_FALLBACK = [
  {
    id: "pop-1",
    title: "Smokey Truffle Beast Burger",
    restaurant: "The Gourmet Grill",
    partnerId: "partner-1",
    price: 349,
    isVeg: false,
    rating: 4.8,
    prepTime: 18,
    category: "Burgers",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-delicious-burger-42998-large.mp4",
  },
  {
    id: "pop-2",
    title: "Woodfired Burrata Margherita",
    restaurant: "Bistro Verde Ristorante",
    partnerId: "partner-2",
    price: 499,
    isVeg: true,
    rating: 4.9,
    prepTime: 22,
    category: "Pizza",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-taking-a-slice-of-pizza-with-cheese-pull-42997-large.mp4",
  },
  {
    id: "pop-3",
    title: "Awadhi Gosht Dum Biryani",
    restaurant: "Dawat-e-Khas",
    partnerId: "partner-3",
    price: 420,
    isVeg: false,
    rating: 4.7,
    prepTime: 25,
    category: "Biryani",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-serving-freshly-cooked-rice-43000-large.mp4",
  },
  {
    id: "pop-4",
    title: "Truffle Parmesan French Fries",
    restaurant: "The Gourmet Grill",
    partnerId: "partner-1",
    price: 149,
    isVeg: true,
    rating: 4.9,
    prepTime: 12,
    category: "Burgers",
    image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=400&q=80",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-delicious-burger-42998-large.mp4",
  },
];

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

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<(string | SuggestionItem)[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [isPureVeg, setIsPureVeg] = useState(false);
  const [selectedFoodForDrawer, setSelectedFoodForDrawer] = useState<FoodItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const addItem = useCartStore((state) => state.addItem);

  const categories = ["All", "Burgers", "Pizza", "Biryani", "Desserts"];

  // Fetch search suggestions from API when typing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/search/suggestions?q=${encodeURIComponent(searchQuery)}`);
        const items = res.data?.data?.suggestions || res.data?.data || [];
        if (Array.isArray(items)) {
          setSuggestions(items.slice(0, 5));
        }
      } catch {
        // Fallback local suggestions
        const matches = POPULAR_DISHES_FALLBACK.filter((d) =>
          d.title.toLowerCase().includes(searchQuery.toLowerCase())
        ).map((d) => ({ text: d.title, type: "dish" }));
        setSuggestions(matches);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleQuickAdd = (dish: (typeof POPULAR_DISHES_FALLBACK)[0]) => {
    addItem(dish.partnerId, dish.restaurant, {
      foodId: dish.id,
      title: dish.title,
      thumbnailUrl: dish.image,
      isVeg: dish.isVeg,
      basePrice: dish.price,
      quantity: 1,
    });
    toast.success(`Added ${dish.title} to cart! 🛒`);
  };

  const handleOpenCustomizer = (dish: (typeof POPULAR_DISHES_FALLBACK)[0]) => {
    const foodItem: FoodItem = {
      _id: dish.id,
      title: dish.title,
      description: "Freshly crafted with premium ingredients and authentic spices.",
      price: dish.price,
      videoUrl: dish.videoUrl,
      thumbnailUrl: dish.image,
      isVeg: dish.isVeg,
      category: dish.category,
      spiceLevel: "medium",
      prepTimeMinutes: dish.prepTime,
      isAvailable: true,
      variants: [
        { name: "Regular Portion", price: dish.price },
        { name: "Large Feast", price: dish.price + 99 },
      ],
      addOns: [
        { name: "Extra Dip / Sauce", price: 30 },
        { name: "Cheese Melt", price: 50 },
      ],
      likesCount: 1400,
      commentsCount: 92,
      savesCount: 310,
      partner: {
        _id: dish.partnerId,
        restaurantName: dish.restaurant,
        cuisineTypes: [dish.category],
        rating: dish.rating,
        ratingCount: 890,
        isOpen: true,
        location: {
          type: "Point",
          coordinates: [77.5946, 12.9716],
          address: "Indiranagar, Bangalore",
        },
      },
    };

    setSelectedFoodForDrawer(foodItem);
    setIsDrawerOpen(true);
  };

  const filteredDishes = POPULAR_DISHES_FALLBACK.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.restaurant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      activeCategory === "All" || d.category.toLowerCase() === activeCategory.toLowerCase();

    const matchesVeg = !isPureVeg || d.isVeg;

    return matchesSearch && matchesCategory && matchesVeg;
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center pb-24 lg:pb-8">
      <DesktopSidebar />

      <main className="flex-1 lg:pl-64 max-w-5xl w-full p-4 md:p-8 space-y-6">
        {/* Search Header */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
              Explore Cuisines & Trending Dishes
            </h1>
            <p className="text-xs text-muted">
              Search top restaurants, sizzling video reels, and best-sellers in your city
            </p>
          </div>

          <div className="relative">
            <div className="relative">
              <Search className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search dishes, burgers, biryani, or restaurants..."
                value={searchQuery}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3 rounded-2xl bg-card-elevated border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-primary shadow-xs transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full mt-1.5 inset-x-0 bg-card border border-border rounded-2xl shadow-2xl p-2 z-30 space-y-1">
                {suggestions.map((s, idx) => {
                  const itemText = typeof s === "string" ? s : s?.text || "";
                  const itemSubtext = typeof s === "object" ? s?.subtext : null;
                  const itemIcon = typeof s === "object" ? s?.icon : null;

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSearchQuery(itemText);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-card-hover flex items-center justify-between transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        {itemIcon ? (
                          <span className="text-sm">{itemIcon}</span>
                        ) : (
                          <Search className="w-3.5 h-3.5 text-muted" />
                        )}
                        <span>{itemText}</span>
                        {itemSubtext && (
                          <span className="text-[11px] text-muted font-normal">({itemSubtext})</span>
                        )}
                      </span>
                      <span className="text-[10px] text-muted uppercase font-bold">Search</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {/* Pure Veg Toggle */}
            <button
              onClick={() => setIsPureVeg(!isPureVeg)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 ${
                isPureVeg
                  ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/40"
                  : "bg-card-elevated text-muted border-border hover:text-foreground"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Veg Only</span>
            </button>

            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0 ${
                  activeCategory === cat
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-card-elevated text-muted border-border hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Featured Cuisines Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Popular Cuisines</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CUISINES.map((cuisine) => (
              <div
                key={cuisine.name}
                onClick={() => {
                  setSearchQuery(cuisine.name.split(" ")[0]);
                }}
                className="group relative h-32 rounded-2xl overflow-hidden border border-border cursor-pointer shadow-sm"
              >
                <img
                  src={cuisine.image}
                  alt={cuisine.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent p-3 flex flex-col justify-end">
                  <h3 className="text-xs font-bold text-white leading-tight">{cuisine.name}</h3>
                  <p className="text-[10px] text-white/70">{cuisine.dishCount}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Dishes List */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>Dishes You'll Love</span>
            </h2>
            <span className="text-xs text-muted">{filteredDishes.length} items found</span>
          </div>

          {filteredDishes.length === 0 ? (
            <div className="p-8 text-center bg-card-elevated border border-border rounded-3xl space-y-2">
              <p className="text-sm font-bold text-foreground">No matching dishes found</p>
              <p className="text-xs text-muted">Try clearing filters or searching for something else!</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("All");
                  setIsPureVeg(false);
                }}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredDishes.map((dish) => (
                <div
                  key={dish.id}
                  className="bg-card border border-border rounded-3xl p-4 flex items-center justify-between gap-4 shadow-sm hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={dish.image}
                      alt={dish.title}
                      className="w-18 h-18 rounded-2xl object-cover border border-border shrink-0 group-hover:scale-102 transition-transform"
                    />
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <DietaryBadge isVeg={dish.isVeg} />
                        <h3 className="text-sm font-bold text-foreground truncate">{dish.title}</h3>
                      </div>
                      <p className="text-xs text-muted truncate">{dish.restaurant}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-primary">
                          {formatPrice(dish.price)}
                        </span>
                        <span className="text-[10px] text-muted flex items-center gap-0.5">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>{dish.prepTime}m</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenCustomizer(dish)}
                      className="px-3 py-1.5 rounded-xl bg-card-elevated hover:bg-card-hover border border-border text-xs font-bold text-foreground transition-colors"
                    >
                      Custom
                    </button>
                    <button
                      onClick={() => handleQuickAdd(dish)}
                      className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>+ Cart</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Modifier Drawer for customizations */}
      <ModifierDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        food={selectedFoodForDrawer}
      />

      {/* Single-Restaurant Cart Conflict Modal */}
      <CartConflictModal />
    </div>
  );
}
