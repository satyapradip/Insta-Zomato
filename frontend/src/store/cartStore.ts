import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem, Variant, AddOn } from "@/types";

interface CartState {
  restaurantId: string | null;
  restaurantName: string | null;
  items: CartItem[];
  appliedCoupon: string | null;
  discountAmount: number;
  deliveryTip: number;
  deliveryInstructions: string;
  isConflictModalOpen: boolean;
  pendingConflictItem: {
    restaurantId: string;
    restaurantName: string;
    item: CartItem;
  } | null;

  // Actions
  addItem: (
    restaurantId: string,
    restaurantName: string,
    item: {
      foodId: string;
      title: string;
      thumbnailUrl: string;
      isVeg: boolean;
      basePrice: number;
      selectedVariant?: Variant;
      selectedAddOns?: AddOn[];
      quantity?: number;
    }
  ) => boolean; // returns true if added, false if conflict triggered

  resolveConflict: (replace: boolean) => void;
  updateQuantity: (foodId: string, delta: number) => void;
  removeItem: (foodId: string) => void;
  clearCart: () => void;
  applyCoupon: (code: string, discount: number) => void;
  removeCoupon: () => void;
  setDeliveryTip: (amount: number) => void;
  setDeliveryInstructions: (instructions: string) => void;

  // Computed Selectors
  getSubtotal: () => number;
  getDeliveryFee: () => number;
  getPlatformFee: () => number;
  getTaxes: () => number;
  getGrandTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      restaurantName: null,
      items: [],
      appliedCoupon: null,
      discountAmount: 0,
      deliveryTip: 0,
      deliveryInstructions: "",
      isConflictModalOpen: false,
      pendingConflictItem: null,

      addItem: (restaurantId, restaurantName, itemData) => {
        const state = get();
        const unitPrice =
          (itemData.selectedVariant
            ? itemData.selectedVariant.price
            : itemData.basePrice) +
          (itemData.selectedAddOns?.reduce((acc, a) => acc + a.price, 0) || 0);

        const newItem: CartItem = {
          foodId: itemData.foodId,
          title: itemData.title,
          thumbnailUrl: itemData.thumbnailUrl,
          isVeg: itemData.isVeg,
          quantity: itemData.quantity || 1,
          selectedVariant: itemData.selectedVariant,
          selectedAddOns: itemData.selectedAddOns || [],
          unitPrice,
          itemTotal: unitPrice * (itemData.quantity || 1),
        };

        // Single-restaurant enforcement check
        if (state.restaurantId && state.restaurantId !== restaurantId && state.items.length > 0) {
          set({
            isConflictModalOpen: true,
            pendingConflictItem: {
              restaurantId,
              restaurantName,
              item: newItem,
            },
          });
          return false;
        }

        // Add or update existing item
        const existingIndex = state.items.findIndex(
          (i) =>
            i.foodId === newItem.foodId &&
            i.selectedVariant?.name === newItem.selectedVariant?.name &&
            JSON.stringify(i.selectedAddOns) === JSON.stringify(newItem.selectedAddOns)
        );

        let updatedItems: CartItem[];
        if (existingIndex > -1) {
          updatedItems = [...state.items];
          const exist = updatedItems[existingIndex];
          const newQty = exist.quantity + newItem.quantity;
          updatedItems[existingIndex] = {
            ...exist,
            quantity: newQty,
            itemTotal: exist.unitPrice * newQty,
          };
        } else {
          updatedItems = [...state.items, newItem];
        }

        set({
          restaurantId,
          restaurantName,
          items: updatedItems,
        });

        return true;
      },

      resolveConflict: (replace: boolean) => {
        const state = get();
        if (replace && state.pendingConflictItem) {
          set({
            restaurantId: state.pendingConflictItem.restaurantId,
            restaurantName: state.pendingConflictItem.restaurantName,
            items: [state.pendingConflictItem.item],
            appliedCoupon: null,
            discountAmount: 0,
            isConflictModalOpen: false,
            pendingConflictItem: null,
          });
        } else {
          set({
            isConflictModalOpen: false,
            pendingConflictItem: null,
          });
        }
      },

      updateQuantity: (foodId, delta) => {
        const state = get();
        const updated = state.items
          .map((item) => {
            if (item.foodId === foodId) {
              const newQty = item.quantity + delta;
              return newQty > 0
                ? { ...item, quantity: newQty, itemTotal: item.unitPrice * newQty }
                : null;
            }
            return item;
          })
          .filter(Boolean) as CartItem[];

        set({
          items: updated,
          restaurantId: updated.length === 0 ? null : state.restaurantId,
          restaurantName: updated.length === 0 ? null : state.restaurantName,
        });
      },

      removeItem: (foodId) => {
        const state = get();
        const updated = state.items.filter((i) => i.foodId !== foodId);
        set({
          items: updated,
          restaurantId: updated.length === 0 ? null : state.restaurantId,
          restaurantName: updated.length === 0 ? null : state.restaurantName,
        });
      },

      clearCart: () => {
        set({
          restaurantId: null,
          restaurantName: null,
          items: [],
          appliedCoupon: null,
          discountAmount: 0,
          deliveryTip: 0,
          isConflictModalOpen: false,
          pendingConflictItem: null,
        });
      },

      applyCoupon: (code, discount) => set({ appliedCoupon: code, discountAmount: discount }),
      removeCoupon: () => set({ appliedCoupon: null, discountAmount: 0 }),
      setDeliveryTip: (amount) => set({ deliveryTip: amount }),
      setDeliveryInstructions: (instructions) => set({ deliveryInstructions: instructions }),

      getSubtotal: () => get().items.reduce((acc, item) => acc + item.itemTotal, 0),
      getDeliveryFee: () => (get().items.length > 0 ? 30 : 0),
      getPlatformFee: () => (get().items.length > 0 ? 5 : 0),
      getTaxes: () => {
        const sub = get().getSubtotal();
        return Math.round(sub * 0.05 * 100) / 100;
      },
      getGrandTotal: () => {
        const state = get();
        if (state.items.length === 0) return 0;
        const total =
          state.getSubtotal() +
          state.getDeliveryFee() +
          state.getPlatformFee() +
          state.getTaxes() +
          state.deliveryTip -
          state.discountAmount;
        return Math.max(0, Math.round(total * 100) / 100);
      },
      getItemCount: () => get().items.reduce((acc, i) => acc + i.quantity, 0),
    }),
    {
      name: "insta-zomato-cart",
    }
  )
);
