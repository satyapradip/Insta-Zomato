"use client";

import React, { useState, useRef } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { ChevronRight, CheckCircle2, Lock } from "lucide-react";
import confetti from "canvas-confetti";

interface SlideToPayProps {
  amount: number;
  onSuccess: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function SlideToPay({ amount, onSuccess, disabled = false, isLoading = false }: SlideToPayProps) {
  const [isSuccess, setIsSuccess] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);

  // Background color interpolation based on drag progress
  const background = useTransform(
    x,
    [0, 220],
    ["rgba(255, 56, 92, 0.15)", "rgba(16, 185, 129, 0.35)"]
  );

  const handleDragEnd = (_: any, info: any) => {
    if (disabled || isSuccess) return;

    if (info.offset.x > 180) {
      setIsSuccess(true);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.8 },
        colors: ["#ff385c", "#ff6433", "#ffa116", "#10b981"],
      });
      setTimeout(() => {
        onSuccess();
      }, 600);
    } else {
      x.set(0);
    }
  };

  return (
    <div className="w-full select-none">
      <motion.div
        ref={containerRef}
        style={{ background }}
        className={`relative h-14 rounded-2xl border flex items-center px-1.5 overflow-hidden transition-all shadow-lg ${
          disabled
            ? "opacity-50 cursor-not-allowed border-white/10"
            : isSuccess
            ? "border-emerald-500 bg-emerald-500/20"
            : "border-primary/40 hover:border-primary"
        }`}
      >
        {/* Track Text Prompt */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {isSuccess ? (
            <span className="text-emerald-400 font-bold text-sm flex items-center gap-2 animate-in zoom-in">
              <CheckCircle2 className="w-5 h-5" /> Payment Initiated!
            </span>
          ) : (
            <span className="text-white/80 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-primary" /> Slide to Pay ₹{amount}
            </span>
          )}
        </div>

        {/* Draggable Slider Thumb */}
        {!isSuccess && !disabled && (
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 220 }}
            dragElastic={0.05}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            style={{ x }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-11 h-11 rounded-xl bg-linear-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,56,92,0.5)] cursor-grab active:cursor-grabbing z-10"
          >
            <ChevronRight className="w-6 h-6 animate-pulse" />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
