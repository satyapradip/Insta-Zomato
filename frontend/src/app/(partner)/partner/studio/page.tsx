"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Film,
  Plus,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  Edit,
  UploadCloud,
  CheckCircle2,
  TrendingUp,
  Store,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";

const PUBLISHED_REELS = [
  {
    id: "reel-1",
    title: "Smokey Truffle Beast Burger",
    views: "24.5K",
    likes: "3.2K",
    orders: 412,
    revenue: 143788,
    status: "ACTIVE",
    thumbnail: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "reel-2",
    title: "Truffle Parmesan French Fries",
    views: "18.2K",
    likes: "2.1K",
    orders: 289,
    revenue: 43061,
    status: "ACTIVE",
    thumbnail: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "reel-3",
    title: "Woodfired Truffle Burrata Margherita",
    views: "31.0K",
    likes: "4.8K",
    orders: 520,
    revenue: 259480,
    status: "ACTIVE",
    thumbnail: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80",
  },
];

export default function PartnerStudioPage() {
  const [reels, setReels] = useState(PUBLISHED_REELS);

  const handleDelete = (id: string) => {
    setReels(reels.filter((r) => r.id !== id));
    toast.info("Reel removed from feed");
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <span>Reel Studio & Menu Analytics</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-extrabold">
              3 ACTIVE
            </span>
          </h1>
          <p className="text-xs text-muted">
            Monitor conversion from video views to direct 1-tap cart checkouts
          </p>
        </div>

        <Link
          href="/partner/upload"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload New Reel</span>
        </Link>
      </div>

      {/* Studio Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border space-y-1 shadow-xs">
          <span className="text-xs text-muted font-semibold flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-primary" /> Total Reel Impressions
          </span>
          <div className="text-2xl font-black text-foreground">73.7K</div>
          <span className="text-[10px] text-emerald-500 font-bold">+18.4% this week</span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border space-y-1 shadow-xs">
          <span className="text-xs text-muted font-semibold flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> Direct Reel Orders
          </span>
          <div className="text-2xl font-black text-foreground">1,221</div>
          <span className="text-[10px] text-emerald-500 font-bold">14.2% Reel-to-Cart Conversion</span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border space-y-1 shadow-xs">
          <span className="text-xs text-muted font-semibold flex items-center gap-1.5">
            <Store className="w-4 h-4 text-amber-500" /> Video-Driven Revenue
          </span>
          <div className="text-2xl font-black text-primary">{formatPrice(446329)}</div>
          <span className="text-[10px] text-emerald-500 font-bold">Settled via Razorpay Route</span>
        </div>
      </div>

      {/* Published Reels Table / Cards */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-muted uppercase tracking-wider">
          Published Video Reels
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reels.map((reel) => (
            <div
              key={reel.id}
              className="p-4 rounded-3xl bg-card border border-border shadow-xs hover:border-border-hover transition-all space-y-3"
            >
              <div className="relative aspect-9/14 rounded-2xl overflow-hidden bg-muted">
                <img
                  src={reel.thumbnail}
                  alt={reel.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/30 p-3 flex flex-col justify-between text-white">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/80">
                      LIVE
                    </span>
                    <button
                      onClick={() => handleDelete(reel.id)}
                      className="p-1 rounded-lg bg-black/50 hover:bg-rose-500 text-white transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold leading-tight">{reel.title}</h3>
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-white/80">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {reel.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-rose-400" /> {reel.likes}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                <span className="text-muted font-medium">Reel Sales:</span>
                <span className="font-black text-primary">{formatPrice(reel.revenue)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
