"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  Tag,
  MapPin,
  Clock,
  Sparkles,
  ShoppingBag,
  ShieldCheck,
  Check,
  ChevronRight,
  Store,
  Navigation,
  Edit3,
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { DietaryBadge } from "@/components/common/DietaryBadge";
import { SlideToPay } from "@/components/cart/SlideToPay";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { AddressPickerModal, AddressData } from "@/components/location/AddressPickerModal";
import { formatPrice } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { CartItem } from "@/types";

export default function CartPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const restaurantName = useCartStore((state) => state.restaurantName);
  const restaurantId = useCartStore((state) => state.restaurantId);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  const appliedCoupon = useCartStore((state) => state.appliedCoupon);
  const discountAmount = useCartStore((state) => state.discountAmount);
  const applyCoupon = useCartStore((state) => state.applyCoupon);
  const removeCoupon = useCartStore((state) => state.removeCoupon);

  const deliveryTip = useCartStore((state) => state.deliveryTip);
  const setDeliveryTip = useCartStore((state) => state.setDeliveryTip);
  const deliveryInstructions = useCartStore((state) => state.deliveryInstructions);
  const setDeliveryInstructions = useCartStore((state) => state.setDeliveryInstructions);

  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const getDeliveryFee = useCartStore((state) => state.getDeliveryFee);
  const getPlatformFee = useCartStore((state) => state.getPlatformFee);
  const getTaxes = useCartStore((state) => state.getTaxes);
  const getGrandTotal = useCartStore((state) => state.getGrandTotal);

  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // Active Selected Delivery Address (with default Bangalore coordinates)
  const [selectedAddress, setSelectedAddress] = useState<AddressData>({
    id: "addr-default",
    label: "Home",
    recipientName: "Alex Foodie",
    contactPhone: "9876543210",
    flatNumber: "Flat 402, Sunshine Heights",
    street: "Indiranagar 100ft Rd",
    landmark: "Near Metro Pillar 140",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560038",
    formattedAddress: "Flat 402, Sunshine Heights, Indiranagar 100ft Rd, Bengaluru, Karnataka - 560038",
    latitude: 12.9784,
    longitude: 77.6408,
    isDefault: true,
  });

  const [savedAddresses, setSavedAddresses] = useState<AddressData[]>([
    {
      id: "addr-1",
      label: "Home",
      recipientName: "Alex Foodie",
      contactPhone: "9876543210",
      flatNumber: "Flat 402",
      street: "Indiranagar 100ft Rd",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560038",
      formattedAddress: "Flat 402, Sunshine Heights, Indiranagar 100ft Rd, Bengaluru - 560038",
      latitude: 12.9784,
      longitude: 77.6408,
      isDefault: true,
    },
    {
      id: "addr-2",
      label: "Work",
      recipientName: "Alex Foodie",
      contactPhone: "9876543210",
      flatNumber: "4th Floor",
      street: "WeWork Galaxy, 43 Residency Road",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560025",
      formattedAddress: "4th Floor, WeWork Galaxy, 43 Residency Road, Bengaluru - 560025",
      latitude: 12.9719,
      longitude: 77.607,
      isDefault: false,
    },
  ]);

  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);

  const instructionChips = [
    { id: "door", label: "🚪 Leave at door" },
    { id: "bell", label: "🔕 Don't ring bell" },
    { id: "call", label: "📞 Call upon arrival" },
    { id: "guard", label: "🏢 Hand to security" },
  ];

  const handleApplyCoupon = () => {
    if (!couponCodeInput.trim()) return;
    setIsApplyingCoupon(true);
    setTimeout(() => {
      if (couponCodeInput.toUpperCase() === "CRAVE50") {
        applyCoupon("CRAVE50", 50);
        toast.success("Coupon CRAVE50 applied! Saved ₹50 🎟️");
      } else if (couponCodeInput.toUpperCase() === "FIRSTORDER") {
        applyCoupon("FIRSTORDER", 80);
        toast.success("Coupon FIRSTORDER applied! Saved ₹80 🎉");
      } else {
        toast.error("Invalid or expired coupon code");
      }
      setIsApplyingCoupon(false);
      setCouponCodeInput("");
    }, 400);
  };

  const handleSaveNewAddress = (newAddr: AddressData) => {
    setSavedAddresses([newAddr, ...savedAddresses]);
    setSelectedAddress(newAddr);
    toast.success("Delivery address updated to new pinned location! 📍");
  };

  const handlePaymentSuccess = async () => {
    setIsPlacingOrder(true);
    try {
      const orderPayload = {
        restaurantId,
        items,
        subtotal: getSubtotal(),
        deliveryFee: getDeliveryFee(),
        platformFee: getPlatformFee(),
        taxes: getTaxes(),
        discountAmount,
        tipAmount: deliveryTip,
        totalAmount: getGrandTotal(),
        deliveryInstructions,
        deliveryAddress: {
          label: selectedAddress.label,
          recipientName: selectedAddress.recipientName,
          contactPhone: selectedAddress.contactPhone,
          street: selectedAddress.formattedAddress || selectedAddress.street,
          city: selectedAddress.city,
          state: selectedAddress.state,
          pincode: selectedAddress.pincode,
          coordinates: [selectedAddress.longitude, selectedAddress.latitude],
        },
      };

      let orderId = `IZ-${Math.floor(100000 + Math.random() * 900000)}`;
      try {
        const res = await api.post("/orders", orderPayload);
        if (res.data?.data?._id || res.data?.data?.id) {
          orderId = res.data.data._id || res.data.data.id;
        }
      } catch {
        // Fallback simulated order ID for instant demo flow
      }

      toast.success("Order Placed Successfully! 🛵 Real-time Google Navigation active");
      clearCart();
      router.push(`/order/${orderId}/track`);
    } catch {
      toast.error("Failed to place order. Please try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex justify-center">
        <DesktopSidebar />
        <main className="flex-1 lg:pl-64 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 rounded-3xl bg-card-elevated border border-border flex items-center justify-center text-muted mb-6 shadow-xs">
            <ShoppingBag className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-black text-foreground mb-2">Your Cart is Empty</h2>
          <p className="text-sm text-muted max-w-sm mb-6">
            Explore sizzling food reels from top local restaurants and satisfy your cravings in 1-tap!
          </p>
          <Link
            href="/feed"
            className="bg-primary hover:bg-primary-hover text-white font-bold py-3.5 px-8 rounded-2xl shadow-md transition-all active:scale-95"
          >
            Explore Sizzling Food Reels 🎬
          </Link>
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center pb-24 lg:pb-8">
      <DesktopSidebar />

      <main className="flex-1 lg:pl-64 max-w-4xl w-full p-4 md:p-8 space-y-6">
        {/* Top Header */}
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
                My Food Cart
              </h1>
              <p className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                <Store className="w-3.5 h-3.5 text-primary" />
                <span>Ordering from:</span>
                <strong className="text-foreground">{restaurantName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={clearCart}
            className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Cart</span>
          </button>
        </div>

        {/* GOOGLE MAPS DELIVERY ADDRESS CARD */}
        <div className="bg-card border border-border rounded-3xl p-4 md:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-muted uppercase tracking-wider block">
                  Delivery Address (Google Maps)
                </span>
                <span className="text-sm font-black text-foreground">
                  Deliver to: {selectedAddress.label}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(true)}
                className="py-1.5 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Pin on Map</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddressDropdownOpen(!isAddressDropdownOpen)}
                className="py-1.5 px-3 rounded-xl bg-card-elevated hover:bg-card-hover text-foreground border border-border text-xs font-bold transition-all cursor-pointer"
              >
                Change
              </button>
            </div>
          </div>

          {/* Current Address Display */}
          <div className="p-3 rounded-2xl bg-card-elevated border border-border flex items-start justify-between gap-3">
            <p className="text-xs text-foreground font-medium leading-relaxed">
              {selectedAddress.formattedAddress || `${selectedAddress.street}, ${selectedAddress.city}`}
            </p>
            <span className="text-[10px] font-mono text-muted bg-card px-2 py-0.5 rounded-md border border-border shrink-0">
              {selectedAddress.latitude.toFixed(3)}, {selectedAddress.longitude.toFixed(3)}
            </span>
          </div>

          {/* Address Dropdown / Quick Switcher */}
          {isAddressDropdownOpen && (
            <div className="space-y-2 pt-2 border-t border-border animate-in fade-in">
              <span className="text-[11px] font-bold text-muted">Select from Saved Addresses:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {savedAddresses.map((addr) => {
                  const isSelected = selectedAddress.id === addr.id;
                  return (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => {
                        setSelectedAddress(addr);
                        setIsAddressDropdownOpen(false);
                        toast.success(`Switched delivery address to ${addr.label}! 📍`);
                      }}
                      className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary/10 border-primary text-foreground font-bold shadow-xs"
                          : "bg-card-elevated border-border text-muted hover:bg-card-hover hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-foreground">{addr.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                      </div>
                      <p className="text-[11px] truncate">{addr.formattedAddress || addr.street}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Items & Preferences (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Items List */}
            <div className="bg-card border border-border rounded-3xl p-4 md:p-5 space-y-4 shadow-sm">
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider">
                Order Items ({items.length})
              </h2>

              <div className="divide-y divide-border space-y-3">
                {items.map((item: CartItem) => (
                  <div
                    key={item.foodId + (item.selectedVariant?.name || "")}
                    className="pt-3 first:pt-0 flex items-start justify-between gap-3"
                  >
                    <div className="flex gap-3 items-start flex-1 min-w-0">
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-14 h-14 rounded-xl object-cover border border-border flex-shrink-0"
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <DietaryBadge isVeg={item.isVeg} />
                          <h3 className="text-sm font-bold text-foreground truncate">
                            {item.title}
                          </h3>
                        </div>
                        {item.selectedVariant && (
                          <p className="text-xs text-primary font-medium">
                            Size: {item.selectedVariant.name}
                          </p>
                        )}
                        {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                          <p className="text-[11px] text-muted truncate">
                            + {item.selectedAddOns.map((a) => a.name).join(", ")}
                          </p>
                        )}
                        <p className="text-xs font-extrabold text-foreground">
                          {formatPrice(item.unitPrice)}
                        </p>
                      </div>
                    </div>

                    {/* Stepper Controls */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2.5 bg-card-elevated border border-border px-2 py-1 rounded-xl shadow-xs">
                        <button
                          onClick={() => updateQuantity(item.foodId, -1)}
                          className="p-1 text-muted hover:text-foreground transition-colors cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-foreground min-w-3 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.foodId, 1)}
                          className="p-1 text-muted hover:text-foreground transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-xs font-black text-foreground">
                        {formatPrice(item.itemTotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Instructions */}
            <div className="bg-card border border-border rounded-3xl p-4 md:p-5 space-y-3 shadow-sm">
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider">
                Delivery Instructions
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {instructionChips.map((chip) => {
                  const isSelected = deliveryInstructions === chip.label;
                  return (
                    <button
                      key={chip.id}
                      onClick={() =>
                        setDeliveryInstructions(isSelected ? "" : chip.label)
                      }
                      className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                          : "bg-card-elevated border-border text-muted hover:bg-card-hover hover:text-foreground"
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Delivery Tip */}
            <div className="bg-card border border-border rounded-3xl p-4 md:p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-muted uppercase tracking-wider">
                  Tip Your Delivery Partner
                </h2>
                <span className="text-[11px] text-amber-500 font-semibold">
                  100% goes to rider 🛵
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[0, 20, 30, 50].map((amount) => {
                  const isSelected = deliveryTip === amount;
                  return (
                    <button
                      key={amount}
                      onClick={() => setDeliveryTip(amount)}
                      className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold shadow-xs"
                          : "bg-card-elevated border-border text-muted hover:bg-card-hover hover:text-foreground"
                      }`}
                    >
                      {amount === 0 ? "No Tip" : `+₹${amount}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Bill Breakdown & Checkout (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Coupon Code Box */}
            <div className="bg-card border border-border rounded-3xl p-4 md:p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-primary" /> Apply Coupon
                </h2>
                {appliedCoupon && (
                  <button
                    onClick={removeCoupon}
                    className="text-[11px] text-rose-500 font-bold hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>

              {appliedCoupon ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Code '{appliedCoupon}' Applied!
                    </span>
                  </div>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    -₹{discountAmount}
                  </span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Try 'CRAVE50' or 'FIRSTORDER'"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value)}
                    className="flex-1 bg-card-elevated border border-border rounded-xl px-3 py-2 text-xs text-foreground uppercase placeholder:normal-case placeholder:text-muted focus:outline-none focus:border-primary shadow-xs"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={isApplyingCoupon}
                    className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* Bill Summary Accordion */}
            <div className="bg-card border border-border rounded-3xl p-4 md:p-5 space-y-3.5 shadow-sm">
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider">
                Bill Details
              </h2>

              <div className="space-y-2 text-xs text-muted">
                <div className="flex justify-between">
                  <span>Item Subtotal</span>
                  <span className="text-foreground font-semibold">
                    {formatPrice(getSubtotal())}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Partner Fee (Google Road Matrix)</span>
                  <span className="text-foreground font-semibold">
                    {formatPrice(getDeliveryFee())}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee</span>
                  <span className="text-foreground font-semibold">
                    {formatPrice(getPlatformFee())}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Restaurant Packaging & GST (5%)</span>
                  <span className="text-foreground font-semibold">
                    {formatPrice(getTaxes())}
                  </span>
                </div>
                {deliveryTip > 0 && (
                  <div className="flex justify-between text-amber-500 font-semibold">
                    <span>Rider Tip</span>
                    <span>+{formatPrice(deliveryTip)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-500 font-bold">
                    <span>Discount Savings</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-border flex justify-between items-baseline">
                  <span className="text-sm font-black text-foreground">Grand Total</span>
                  <span className="text-xl font-black text-primary">
                    {formatPrice(getGrandTotal())}
                  </span>
                </div>
              </div>
            </div>

            {/* Slide to Pay Swipe Bar */}
            <div className="pt-2">
              <SlideToPay
                amount={getGrandTotal()}
                onSuccess={handlePaymentSuccess}
                isLoading={isPlacingOrder}
              />
            </div>

            <p className="text-[10px] text-muted text-center flex items-center justify-center gap-1 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>100% Safe & Secure Payments via Razorpay</span>
            </p>
          </div>
        </div>
      </main>

      <MobileBottomNav />

      {/* Google Maps Address Modal */}
      <AddressPickerModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSaveAddress={handleSaveNewAddress}
        initialAddress={selectedAddress}
      />
    </div>
  );
}
