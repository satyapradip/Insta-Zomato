"use client";

import React from "react";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  Users,
  Store,
  Bike,
  Film,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default function AdminAnalyticsPage() {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <span>Platform Economics & GMV</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 font-extrabold">
              SUPERADMIN
            </span>
          </h1>
          <p className="text-xs text-muted">
            Financial unit economics, live platform order fulfillment, and infrastructure health
          </p>
        </div>

        <Link
          href="/admin/moderation"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>KYC Moderation Queue ➔</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-card border border-border space-y-1 shadow-xs">
          <span className="text-xs font-bold text-muted">Gross Merchandise Value</span>
          <div className="text-2xl font-black text-foreground">₹24,85,400</div>
          <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" /> +18.4% this week
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-card border border-border space-y-1 shadow-xs">
          <span className="text-xs font-bold text-muted">Platform Commission</span>
          <div className="text-2xl font-black text-emerald-500">₹3,72,810</div>
          <span className="text-[10px] text-muted">15% Take Rate</span>
        </div>

        <div className="p-5 rounded-3xl bg-card border border-border space-y-1 shadow-xs">
          <span className="text-xs font-bold text-muted">Completed Orders</span>
          <div className="text-2xl font-black text-foreground">3,892</div>
          <span className="text-[10px] text-emerald-500 font-bold">99.4% Fulfillment</span>
        </div>

        <div className="p-5 rounded-3xl bg-card border border-border space-y-1 shadow-xs">
          <span className="text-xs font-bold text-muted">Active Fleet Online</span>
          <div className="text-2xl font-black text-primary">148 Riders</div>
          <span className="text-[10px] text-emerald-500 font-bold">● High Availability</span>
        </div>
      </div>

      {/* Platform Health & System Latency */}
      <div className="p-6 rounded-3xl bg-card border border-border space-y-3 shadow-xs">
        <h3 className="text-sm font-bold text-foreground">Platform Health & Core Services</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-card-elevated border border-border">
            <span className="text-muted block">Cache Hit Rate</span>
            <strong className="text-emerald-500 text-sm font-black">94.2% (Sub-5ms Redis)</strong>
          </div>
          <div className="p-3.5 rounded-2xl bg-card-elevated border border-border">
            <span className="text-muted block">WebSocket Redis Adapter</span>
            <strong className="text-foreground text-sm font-black">Multi-Instance Active</strong>
          </div>
          <div className="p-3.5 rounded-2xl bg-card-elevated border border-border">
            <span className="text-muted block">Neon Postgres Database</span>
            <strong className="text-emerald-500 text-sm font-black">Scale-to-Zero Pooled</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
