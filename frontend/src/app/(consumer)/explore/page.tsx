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
    <div className="max-w-5xl w-full mx-auto p-4 md:p-8 space-y-6">
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
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search gourmet burgers, neapolitan pizza, biryani, or restaurant..."
              className="w-full pl-11 pr-10 py-3 rounded-2xl bg-card border border-border text-sm text-foreground placeholder:text-muted focus:outline-hidden focus:border-primary/50 shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="p-1 text-muted hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full inset-x-0 mt-2 p-2 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-xl z-30 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
              {suggestions.map((item, idx) => {
                const text = typeof item === "string" ? item : item.text;
                const type = typeof item === "string" ? "dish" : item.type || "dish";
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSearchQuery(text);
                      setShowSuggestions(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-card-hover text-left text-xs font-semibold text-foreground transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Search className="w-3.5 h-3.5 text-primary" />
                      <span>{text}</span>
                    </div>
                    <span className="text-[10px] text-muted uppercase font-bold tracking-wider">
                      {type}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Categories Pill List & Veg Switcher */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto hide-scrollbar pt-1">
          <div className="flex items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeCategory === cat
                    ? "bg-primary text-white shadow-md shadow-primary/25"
                    : "bg-card hover:bg-card-hover text-muted hover:text-foreground border border-border"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsPureVeg(!isPureVeg)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all shrink-0 cursor-pointer ${
              isPureVeg
                ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/40 shadow-xs"
                : "bg-card text-muted border-border hover:text-foreground hover:bg-card-hover"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Pure Veg</span>
          </button>
        </div>
      </div>

      {/* Featured Cuisines Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
            <span>Explore by Cuisine</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {CUISINES.map((c) => (
            <div
              key={c.name}
              onClick={() => {
                setSearchQuery(c.name.split(" ")[0]);
              }}
              className="group relative h-28 sm:h-32 rounded-2xl overflow-hidden border border-border shadow-xs hover:border-primary/50 transition-all cursor-pointer"
            >
              <img
                src={c.image}
                alt={c.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent p-3 flex flex-col justify-end">
                <h3 className="text-xs sm:text-sm font-black text-white leading-tight">
                  {c.name}
                </h3>
                <p className="text-[10px] text-white/70 font-medium">{c.dishCount}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Popular Dishes List / Search Results */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
            <span>{searchQuery ? `Search Results (${filteredDishes.length})` : "Trending Dishes"}</span>
            <Flame className="w-4 h-4 text-primary" />
          </h2>
          <span className="text-xs text-muted">Real-time availability</span>
        </div>

        {filteredDishes.length === 0 ? (
          <div className="p-12 text-center bg-card rounded-3xl border border-border space-y-3">
            <Utensils className="w-10 h-10 text-muted mx-auto" />
            <h3 className="text-base font-bold text-foreground">No matching dishes found</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Try searching for something else like "pizza", "burger", or clear active filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDishes.map((dish) => (
              <div
                key={dish.id}
                className="p-4 rounded-3xl bg-card border border-border hover:border-border-hover shadow-xs hover:shadow-md transition-all flex gap-4 items-center justify-between group"
              >
                <div className="flex gap-3.5 items-center min-w-0 flex-1">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-muted">
                    <img
                      src={dish.image}
                      alt={dish.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <Link
                      href="/feed"
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      title="Watch Reel"
                    >
                      <Film className="w-6 h-6" />
                    </Link>
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <DietaryBadge isVeg={dish.isVeg} />
                      <span className="text-[10px] text-muted font-bold truncate">
                        {dish.restaurant}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-foreground truncate">
                      {dish.title}
                    </h3>

                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-sm font-black text-primary">
                        {formatPrice(dish.price)}
                      </span>
                      <span className="text-[10px] text-muted flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{dish.prepTime}m</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenCustomizer(dish)}
                    className="py-1.5 px-3 rounded-xl bg-card-elevated hover:bg-card-hover border border-border text-foreground font-bold text-xs transition-colors cursor-pointer"
                  >
                    Customize
                  </button>
                  <button
                    onClick={() => handleQuickAdd(dish)}
                    className="py-1.5 px-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
