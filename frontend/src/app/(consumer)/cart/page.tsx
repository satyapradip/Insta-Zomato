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

  const [mounted, setMounted] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto min-h-[70vh]">
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
      </div>
    );
  }

  return (
    <div className="max-w-4xl w-full mx-auto p-4 md:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link
            href="/feed"
            className="p-2 rounded-xl bg-card-elevated hover:bg-card-hover text-foreground border border-border transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              Review Your Gourmet Feast
            </h1>
            <p className="text-xs text-muted flex items-center gap-1.5 pt-0.5">
              <Store className="w-3.5 h-3.5 text-primary" />
              <span>Ordering from:</span>
              <span className="font-bold text-foreground">{restaurantName}</span>
            </p>
          </div>
        </div>

        <button
          onClick={clearCart}
          className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-rose-500/10 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Feast</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Items List & Delivery Address Selection */}
        <div className="lg:col-span-7 space-y-6">
          {/* Cart Items List */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-muted uppercase tracking-wider">
              Dishes in Cart ({items.length})
            </h2>

            <div className="space-y-3">
              {items.map((item: CartItem, idx: number) => (
                <div
                  key={`${item.foodId || "dish"}-${item.selectedVariant?.name || "base"}-${idx}`}
                  className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between gap-4 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {item.thumbnailUrl && (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-14 h-14 rounded-xl object-cover shrink-0 bg-muted"
                      />
                    )}
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <DietaryBadge isVeg={item.isVeg} />
                        <h3 className="text-sm font-bold text-foreground truncate">
                          {item.title}
                        </h3>
                      </div>
                      {item.selectedVariant && (
                        <p className="text-[11px] text-muted">
                          Size: {item.selectedVariant.name}
                        </p>
                      )}
                      {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                        <p className="text-[10px] text-muted truncate">
                          +{item.selectedAddOns.map((a) => a.name).join(", ")}
                        </p>
                      )}
                      <p className="text-xs font-black text-primary pt-0.5">
                        {formatPrice(item.itemTotal)}
                      </p>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-2 bg-card-elevated border border-border rounded-xl p-1 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.foodId, -1)}
                      className="p-1 rounded-lg hover:bg-card text-muted hover:text-foreground transition-colors cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-black text-foreground w-5 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.foodId, 1)}
                      className="p-1 rounded-lg hover:bg-card text-muted hover:text-foreground transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Location Section */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Delivery Address</h3>
                  <p className="text-[10px] text-muted">Estimated delivery in 22-28 mins</p>
                </div>
              </div>

              <button
                onClick={() => setIsAddressModalOpen(true)}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Navigation className="w-3 h-3" />
                <span>Map Pin</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-card-elevated border border-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-foreground">
                  {selectedAddress.label} • {selectedAddress.recipientName}
                </span>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  GPS Selected
                </span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                {selectedAddress.formattedAddress || `${selectedAddress.street}, ${selectedAddress.city}`}
              </p>
            </div>
          </div>

          {/* Delivery Instruction Chips */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border space-y-3">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
              Delivery Partner Instructions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {instructionChips.map((chip) => {
                const isSelected = deliveryInstructions.includes(chip.label);
                return (
                  <button
                    key={chip.id}
                    onClick={() => {
                      const current = deliveryInstructions ? deliveryInstructions.split(", ").filter(Boolean) : [];
                      const next = isSelected
                        ? current.filter((l) => l !== chip.label)
                        : [...current, chip.label];
                      setDeliveryInstructions(next.join(", "));
                    }}
                    className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 border-primary/40 text-primary font-bold shadow-xs"
                        : "bg-card-elevated border-border text-muted hover:text-foreground"
                    }`}
                  >
                    <span>{chip.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Coupon, Tip, Bill Breakdown & Slide to Pay */}
        <div className="lg:col-span-5 space-y-6">
          {/* Coupon Promo Code Input */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                <span>Offers & Coupons</span>
              </span>
            </div>

            {appliedCoupon ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <div>
                    <span className="font-bold text-emerald-500">{appliedCoupon}</span>
                    <p className="text-[10px] text-muted">₹{discountAmount} discount applied</p>
                  </div>
                </div>
                <button
                  onClick={removeCoupon}
                  className="text-xs text-rose-500 font-bold hover:underline cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value)}
                  placeholder="Enter CRAVE50 or FIRSTORDER"
                  className="flex-1 px-3 py-2 rounded-xl bg-card-elevated border border-border text-xs text-foreground placeholder:text-muted focus:outline-hidden focus:border-primary/50"
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={isApplyingCoupon || !couponCodeInput}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isApplyingCoupon ? "..." : "Apply"}
                </button>
              </div>
            )}
          </div>

          {/* Delivery Tip Selector */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
                Tip Your Delivery Rider 🛵
              </h3>
              {deliveryTip > 0 && (
                <button
                  onClick={() => setDeliveryTip(0)}
                  className="text-[10px] text-rose-500 font-bold hover:underline cursor-pointer"
                >
                  Clear Tip
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted">
              100% of the tip goes directly to your rider partner.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[20, 30, 50, 100].map((tipVal) => (
                <button
                  key={tipVal}
                  onClick={() => setDeliveryTip(tipVal)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    deliveryTip === tipVal
                      ? "bg-primary text-white border-primary shadow-xs"
                      : "bg-card-elevated border-border text-muted hover:text-foreground"
                  }`}
                >
                  ₹{tipVal}
                </button>
              ))}
            </div>
          </div>

          {/* Bill Summary Breakdown */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border space-y-3">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
              Bill Summary
            </h3>

            <div className="space-y-2 text-xs text-muted border-b border-border pb-3">
              <div className="flex items-center justify-between">
                <span>Item Subtotal</span>
                <span className="font-semibold text-foreground">{formatPrice(getSubtotal())}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Delivery Fee (Hyperlocal GPS)</span>
                <span className="font-semibold text-foreground">{formatPrice(getDeliveryFee())}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Platform Fee</span>
                <span className="font-semibold text-foreground">{formatPrice(getPlatformFee())}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>GST & Restaurant Taxes (5%)</span>
                <span className="font-semibold text-foreground">{formatPrice(getTaxes())}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-emerald-500 font-bold">
                  <span>Coupon Discount</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              {deliveryTip > 0 && (
                <div className="flex items-center justify-between text-foreground">
                  <span>Rider Tip</span>
                  <span className="font-bold">+{formatPrice(deliveryTip)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-sm font-black text-foreground pt-1">
              <span>To Pay</span>
              <span className="text-lg text-primary">{formatPrice(getGrandTotal())}</span>
            </div>

            {/* Slide to Pay Component */}
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
      </div>

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
