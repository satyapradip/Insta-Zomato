"use client";

import React from "react";
import { useCartStore } from "@/store/cartStore";
import { AlertTriangle } from "lucide-react";

export function CartConflictModal() {
  const isConflictModalOpen = useCartStore((state) => state.isConflictModalOpen);
  const currentRestaurantName = useCartStore((state) => state.restaurantName);
  const pendingConflictItem = useCartStore((state) => state.pendingConflictItem);
  const resolveConflict = useCartStore((state) => state.resolveConflict);

  if (!isConflictModalOpen || !pendingConflictItem) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-white/15 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-3 text-amber-400">
          <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Replace Cart Items?</h3>
        </div>

        <p className="text-sm text-white/70 leading-relaxed">
          Your cart currently contains dishes from{" "}
          <strong className="text-white">"{currentRestaurantName}"</strong>.
          Adding dishes from{" "}
          <strong className="text-primary">
            "{pendingConflictItem.restaurantName}"
          </strong>{" "}
          will discard your current items.
        </p>

        <div className="flex flex-col gap-2.5 pt-2">
          <button
            onClick={() => resolveConflict(true)}
            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all"
          >
            Discard & Start Fresh
          </button>
          <button
            onClick={() => resolveConflict(false)}
            className="w-full bg-white/10 hover:bg-white/15 text-white/80 hover:text-white font-semibold py-3 px-4 rounded-xl border border-white/10 transition-all"
          >
            Keep Existing Cart
          </button>
        </div>
      </div>
    </div>
  );
}
