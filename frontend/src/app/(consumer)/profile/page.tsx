"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  MapPin,
  Wallet,
  ShieldCheck,
  Flame,
  Tag,
  Clock,
  LogOut,
  ChevronRight,
  Plus,
  Sparkles,
  LogIn,
  Trash2,
  Navigation,
  CheckCircle2,
  Building,
} from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { AddressPickerModal, AddressData } from "@/components/location/AddressPickerModal";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [isVegOnly, setIsVegOnly] = useState(false);
  const [spicePreference, setSpicePreference] = useState<"mild" | "medium" | "hot">("medium");

  const [addresses, setAddresses] = useState<AddressData[]>([
    {
      id: "addr-1",
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
    },
    {
      id: "addr-2",
      label: "Work",
      recipientName: "Alex Foodie",
      contactPhone: "9876543210",
      flatNumber: "4th Floor",
      street: "WeWork Galaxy, 43 Residency Road",
      landmark: "Opposite Ritz Carlton",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560025",
      formattedAddress: "4th Floor, WeWork Galaxy, 43 Residency Road, Bengaluru, Karnataka - 560025",
      latitude: 12.9719,
      longitude: 77.607,
      isDefault: false,
    },
  ]);

  // Fetch addresses from backend API
  useEffect(() => {
    async function fetchAddresses() {
      if (!isAuthenticated) return;
      try {
        const res = await api.get("/users/addresses");
        const data = res.data?.data || res.data;
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((a: any) => ({
            id: a.id || a._id,
            label: a.label || "Home",
            recipientName: a.recipientName || "",
            contactPhone: a.contactPhone || "",
            street: a.street || "",
            landmark: a.landmark || "",
            city: a.city || "Bengaluru",
            state: a.state || "Karnataka",
            pincode: a.pincode || "560001",
            formattedAddress: a.street || `${a.city}, ${a.state}`,
            latitude: a.coordinates?.coordinates ? a.coordinates.coordinates[1] : a.latitude || 12.9716,
            longitude: a.coordinates?.coordinates ? a.coordinates.coordinates[0] : a.longitude || 77.5946,
            isDefault: Boolean(a.isDefault),
          }));
          setAddresses(mapped);
        }
      } catch {
        // Fallback to local default addresses
      }
    }

    fetchAddresses();
  }, [isAuthenticated]);

  const handleSaveAddress = (newAddr: AddressData) => {
    setAddresses((prev) => {
      const updated = newAddr.isDefault
        ? prev.map((a) => ({ ...a, isDefault: false }))
        : [...prev];
      return [newAddr, ...updated];
    });
  };

  const handleDeleteAddress = async (id?: string) => {
    if (!id) return;
    try {
      await api.delete(`/users/addresses/${id}`);
    } catch {
      // Local fallback
    }
    setAddresses(addresses.filter((a) => a.id !== id && a._id !== id));
    toast.info("Address removed from your address book 🗑️");
  };

  const handleSetDefaultAddress = async (id?: string) => {
    if (!id) return;
    try {
      await api.put(`/users/addresses/${id}/default`);
    } catch {
      // Local fallback
    }
    setAddresses(
      addresses.map((a) => ({
        ...a,
        isDefault: a.id === id || a._id === id,
      }))
    );
    toast.success("Default delivery address updated! 📍");
  };

  return (
    <div className="max-w-4xl w-full mx-auto p-4 md:p-8 space-y-6">
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
              My Profile & Preferences
            </h1>
            <p className="text-xs text-muted">Manage Google Maps delivery addresses and food preferences</p>
          </div>
        </div>
      </div>

      {/* User Card / Login Banner */}
      {mounted && isAuthenticated && user ? (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-linear-to-tr from-primary to-secondary flex items-center justify-center text-white text-2xl font-black shadow-md">
              {user.name?.[0] || "U"}
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-black text-foreground">{user.name}</h2>
              <p className="text-xs text-muted">{user.email}</p>
              <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-primary/20">
                <Sparkles className="w-3 h-3" />
                <span>Insta-Zomato Gold Member</span>
              </div>
            </div>
          </div>

          <div className="text-right space-y-2">
            <span className="text-xs text-muted block">In-App Wallet</span>
            <div className="text-xl font-black text-emerald-500">₹{user.walletBalance || 250}</div>
            <button
              onClick={() => logout()}
              className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 ml-auto cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-primary/30 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 bg-linear-to-r from-primary/5 via-card to-card">
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-lg font-black text-foreground">Sign In to Insta-Zomato</h2>
            <p className="text-xs text-muted">
              Log in or use instant 1-click test accounts to manage addresses and track orders
            </p>
          </div>
          <button
            onClick={() => setIsAuthOpen(true)}
            className="py-2.5 px-5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In / Quick Demo</span>
          </button>
        </div>
      )}

      {/* Dietary Preferences Section */}
      <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Dietary & Taste Preferences
        </h3>

        <div className="flex items-center justify-between p-4 rounded-2xl bg-card-elevated border border-border">
          <div className="space-y-0.5">
            <div className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Pure-Veg Mode</span>
            </div>
            <p className="text-xs text-muted">Show only 100% vegetarian food reels & dishes</p>
          </div>
          <button
            onClick={() => {
              setIsVegOnly(!isVegOnly);
              toast.success(`Pure Veg Mode ${!isVegOnly ? "Enabled" : "Disabled"}`);
            }}
            className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
              isVegOnly ? "bg-emerald-500" : "bg-muted/30"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                isVegOnly ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Spice Level Preference */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-semibold text-muted flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-500" /> Default Spice Preference
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(["mild", "medium", "hot"] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => {
                  setSpicePreference(lvl);
                  toast.success(`Spice preference updated to ${lvl}`);
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold capitalize transition-all cursor-pointer ${
                  spicePreference === lvl
                    ? "bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 font-extrabold shadow-xs"
                    : "bg-card-elevated border-border text-muted hover:text-foreground hover:bg-card-hover"
                }`}
              >
                {lvl} {lvl === "hot" ? "🔥" : lvl === "medium" ? "🟡" : "🟢"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Address Book with Google Maps */}
      <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <span>Saved Delivery Addresses</span>
              <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                Google Maps Powered
              </span>
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Exact doorstep coordinates saved for high-precision delivery dispatch
            </p>
          </div>

          <button
            onClick={() => setIsAddressModalOpen(true)}
            className="py-2 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add with Google Map 📍</span>
          </button>
        </div>

        <div className="space-y-3">
          {addresses.map((addr) => (
            <div
              key={addr.id || addr._id}
              className="p-4 rounded-2xl bg-card-elevated border border-border flex items-start justify-between gap-4 shadow-xs"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-foreground">{addr.label}</span>
                    {addr.isDefault && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        Default
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-muted bg-card px-2 py-0.5 rounded-md border border-border">
                      {addr.latitude.toFixed(4)}, {addr.longitude.toFixed(4)}
                    </span>
                  </div>

                  <p className="text-xs text-foreground font-medium leading-relaxed">
                    {addr.formattedAddress || `${addr.street}, ${addr.city}`}
                  </p>

                  {addr.recipientName && (
                    <p className="text-[11px] text-muted">
                      Recipient: <strong>{addr.recipientName}</strong> • {addr.contactPhone}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!addr.isDefault && (
                  <button
                    onClick={() => handleSetDefaultAddress(addr.id || addr._id)}
                    className="text-[11px] font-bold text-muted hover:text-primary hover:underline cursor-pointer"
                  >
                    Make Default
                  </button>
                )}
                <button
                  onClick={() => handleDeleteAddress(addr.id || addr._id)}
                  className="p-2 text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                  title="Delete address"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Google Maps Address Picker Modal */}
      <AddressPickerModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSaveAddress={handleSaveAddress}
      />

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}
