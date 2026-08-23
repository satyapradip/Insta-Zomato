import React from "react";
import { cn } from "@/lib/utils";

interface DietaryBadgeProps {
  isVeg: boolean;
  className?: string;
  showLabel?: boolean;
}

export function DietaryBadge({
  isVeg,
  className,
  showLabel = false,
}: DietaryBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold backdrop-blur-md",
        isVeg
          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          : "bg-red-500/15 text-red-400 border border-red-500/30",
        className
      )}
    >
      {/* Square with circle / triangle */}
      <span
        className={cn(
          "w-3.5 h-3.5 flex items-center justify-center border rounded-xs",
          isVeg ? "border-emerald-500" : "border-red-500"
        )}
      >
        {isVeg ? (
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
        ) : (
          <span className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-red-500" />
        )}
      </span>
      {showLabel && (
        <span className="text-[11px] tracking-wide uppercase">
          {isVeg ? "Pure Veg" : "Non-Veg"}
        </span>
      )}
    </div>
  );
}
