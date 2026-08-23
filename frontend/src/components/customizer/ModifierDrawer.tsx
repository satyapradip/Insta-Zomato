"use client";

import React, { useState, useEffect } from "react";
import { Drawer } from "vaul";
import { motion } from "framer-motion";
import { Plus, Minus, X, Flame, Sparkles, Check } from "lucide-react";
import { FoodItem, Variant, AddOn } from "@/types";
import { DietaryBadge } from "@/components/common/DietaryBadge";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { toast } from "sonner";

interface ModifierDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  food: FoodItem | null;
  onSuccess?: () => void;
}

export function ModifierDrawer({
  isOpen,
  onClose,
  food,
  onSuccess,
}: ModifierDrawerProps) {
  const addItem = useCartStore((state) => state.addItem);

  const [selectedVariant, setSelectedVariant] = useState<Variant | undefined>(undefined);
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);
  const [spiceLevel, setSpiceLevel] = useState<"mild" | "medium" | "hot">("medium");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (food) {
      // Default to first variant if available
      if (food.variants && food.variants.length > 0) {
        setSelectedVariant(food.variants[0]);
      } else {
        setSelectedVariant(undefined);
      }
      setSelectedAddOns([]);
      setSpiceLevel(food.spiceLevel || "medium");
      setQuantity(1);
    }
  }, [food]);

  if (!food) return null;

  const basePrice = selectedVariant ? selectedVariant.price : food.price;
  const addOnsTotal = selectedAddOns.reduce((acc, a) => acc + a.price, 0);
  const unitPrice = basePrice + addOnsTotal;
  const grandTotal = unitPrice * quantity;

  const handleToggleAddOn = (addon: AddOn) => {
    setSelectedAddOns((prev) => {
      const exists = prev.find((a) => a.name === addon.name);
      if (exists) {
        return prev.filter((a) => a.name !== addon.name);
      } else {
        return [...prev, addon];
      }
    });
  };

  const handleAddToCart = () => {
    const success = addItem(food.partner._id, food.partner.restaurantName, {
      foodId: food._id,
      title: food.title,
      thumbnailUrl: food.thumbnailUrl,
      isVeg: food.isVeg,
      basePrice: food.price,
      selectedVariant,
      selectedAddOns,
      quantity,
    });

    if (success) {
      toast.success(`Added ${quantity}x ${food.title} to cart! 🛒`);
      onClose();
      onSuccess?.();
    }
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 transition-opacity" />
        <Drawer.Content className="bg-card border-t border-white/10 flex flex-col rounded-t-[28px] max-h-[90vh] fixed bottom-0 left-0 right-0 z-50 max-w-xl mx-auto overflow-hidden shadow-2xl">
          {/* Top Handle */}
          <div className="p-4 bg-card-elevated border-b border-white/5 flex items-center justify-between">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-white/20" />
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-1.5 rounded-full bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6">
            {/* Header / Dish Info */}
            <div className="flex gap-4 items-start">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <DietaryBadge isVeg={food.isVeg} showLabel />
                  <span className="text-xs text-muted">• {food.partner.restaurantName}</span>
                </div>
                <h3 className="text-xl font-bold text-foreground tracking-tight">{food.title}</h3>
                <p className="text-xs text-muted line-clamp-2">{food.description}</p>
                <div className="text-lg font-extrabold text-primary pt-1">
                  {formatPrice(basePrice)}
                </div>
              </div>
              <img
                src={food.thumbnailUrl}
                alt={food.title}
                className="w-20 h-20 rounded-xl object-cover border border-border shadow-xs"
              />
            </div>

            {/* 1. Portion Sizing (If variants exist) */}
            {food.variants && food.variants.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                    Select Portion Size
                  </h4>
                  <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold border border-primary/20">
                    Required
                  </span>
                </div>
                <div className="space-y-2">
                  {food.variants.map((variant) => {
                    const isSelected = selectedVariant?.name === variant.name;
                    return (
                      <div
                        key={variant.name}
                        onClick={() => setSelectedVariant(variant)}
                        className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all shadow-xs ${
                          isSelected
                            ? "bg-primary/10 border-primary text-primary font-bold"
                            : "bg-card-elevated border-border text-foreground hover:bg-card-hover"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? "border-primary" : "border-border"
                            }`}
                          >
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-primary" />
                            )}
                          </span>
                          <span className="text-sm font-medium">{variant.name}</span>
                        </div>
                        <span className="text-sm font-bold text-foreground">
                          {formatPrice(variant.price)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Spice Level Selector */}
            <div className="space-y-3 pt-2 border-t border-border">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-500" /> Spice Level
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "mild", label: "Mild 🟢", desc: "No chili" },
                  { id: "medium", label: "Medium 🟡", desc: "Balanced" },
                  { id: "hot", label: "Hot 🔥", desc: "Spicy treat" },
                ].map((level) => {
                  const isSelected = spiceLevel === level.id;
                  return (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setSpiceLevel(level.id as any)}
                      className={`py-2.5 px-3 rounded-xl border text-center transition-all shadow-xs cursor-pointer ${
                        isSelected
                          ? "bg-orange-500/15 border-orange-500 text-orange-600 dark:text-orange-400 font-bold"
                          : "bg-card-elevated border-border text-muted hover:bg-card-hover hover:text-foreground"
                      }`}
                    >
                      <div className="text-xs font-semibold">{level.label}</div>
                      <div className="text-[10px] text-muted mt-0.5">{level.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Extra Add-ons (If available) */}
            {food.addOns && food.addOns.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" /> Extra Add-ons
                  </h4>
                  <span className="text-[11px] text-muted">Optional</span>
                </div>
                <div className="space-y-2">
                  {food.addOns.map((addon) => {
                    const isChecked = selectedAddOns.some((a) => a.name === addon.name);
                    return (
                      <div
                        key={addon.name}
                        onClick={() => handleToggleAddOn(addon)}
                        className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all shadow-xs ${
                          isChecked
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-card-elevated border-border text-foreground hover:bg-card-hover"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                              isChecked ? "bg-primary border-primary text-white" : "border-border"
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-3" />}
                          </div>
                          <span className="text-sm font-medium">{addon.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-amber-500">
                          +{formatPrice(addon.price)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Bottom Actions */}
          <div className="p-4 bg-card-elevated border-t border-border flex items-center gap-4">
            {/* Quantity Stepper */}
            <div className="flex items-center gap-3 bg-card border border-border px-3 py-2 rounded-xl shadow-xs">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-1 text-muted hover:text-foreground transition-colors cursor-pointer"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-foreground min-w-4 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="p-1 text-muted hover:text-foreground transition-colors cursor-pointer"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Add to Cart CTA */}
            <button
              onClick={handleAddToCart}
              className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold py-3.5 px-6 rounded-xl shadow-md flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>Add to Cart</span>
              <span>{formatPrice(grandTotal)}</span>
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
