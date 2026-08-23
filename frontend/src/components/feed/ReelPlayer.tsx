"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Volume2, VolumeX, Play, Zap, ShoppingBag, MapPin, Clock } from "lucide-react";
import { FoodItem } from "@/types";
import { DietaryBadge } from "@/components/common/DietaryBadge";
import { ActionRail } from "@/components/feed/ActionRail";
import { formatPrice, formatDistance } from "@/lib/utils";

interface ReelPlayerProps {
  food: FoodItem;
  isActive: boolean;
  onOpenCustomizer: (food: FoodItem) => void;
  onBuyNow: (food: FoodItem) => void;
  onOpenComments: (food: FoodItem) => void;
  onToggleLike: (foodId: string) => void;
  onToggleSave: (foodId: string) => void;
}

export function ReelPlayer({
  food,
  isActive,
  onOpenCustomizer,
  onBuyNow,
  onOpenComments,
  onToggleLike,
  onToggleSave,
}: ReelPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [heartBurst, setHeartBurst] = useState<{ x: number; y: number } | null>(null);

  // Play/Pause based on active scroll state
  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {
          // Autoplay was blocked
        });
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    }
  }, [isActive]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleDoubleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHeartBurst({ x, y });
    onToggleLike(food._id);
    setTimeout(() => setHeartBurst(null), 900);
  };

  return (
    <div
      onDoubleClick={handleDoubleTap}
      className="relative w-full h-full max-w-[430px] mx-auto bg-black rounded-none md:rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center select-none"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={food.videoUrl}
        poster={food.thumbnailUrl}
        loop
        playsInline
        muted={isMuted}
        onClick={togglePlay}
        onError={() => {
          // Gracefully fallback to poster thumbnail if external sample video URL is blocked
        }}
        className="w-full h-full object-cover cursor-pointer"
      />

      {/* Top Gradient Overlay */}
      <div className="absolute top-0 inset-x-0 h-28 bg-linear-to-b from-black/80 via-black/30 to-transparent pointer-events-none z-10" />

      {/* Bottom Gradient Overlay */}
      <div className="absolute bottom-0 inset-x-0 h-80 bg-linear-to-t from-black/95 via-black/60 to-transparent pointer-events-none z-10" />

      {/* Play/Pause Center Indicator */}
      {!isPlaying && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 z-15 cursor-pointer"
        >
          <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl">
            <Play className="w-8 h-8 ml-1 fill-white" />
          </div>
        </div>
      )}

      {/* Double Tap Heart Burst Animation */}
      <AnimatePresence>
        {heartBurst && (
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: -20 }}
            animate={{ scale: [0, 1.4, 1.2], opacity: [0, 1, 0], rotate: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ left: heartBurst.x - 40, top: heartBurst.y - 40 }}
            className="absolute z-30 pointer-events-none"
          >
            <Heart className="w-20 h-20 fill-rose-500 text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.8)]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right Floating Action Rail */}
      <div className="absolute right-3.5 bottom-24 z-20">
        <ActionRail
          foodId={food._id}
          likesCount={food.likesCount}
          commentsCount={food.commentsCount}
          savesCount={food.savesCount}
          isLiked={food.isLiked}
          isSaved={food.isSaved}
          isMuted={isMuted}
          onToggleLike={() => onToggleLike(food._id)}
          onToggleSave={() => onToggleSave(food._id)}
          onOpenComments={() => onOpenComments(food)}
          onToggleSound={toggleMute}
        />
      </div>

      {/* Bottom Dish Information Overlay */}
      <div className="absolute bottom-4 left-4 right-20 z-20 space-y-2.5">
        {/* Badges Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <DietaryBadge isVeg={food.isVeg} showLabel />
          <div className="inline-flex items-center gap-1 bg-black/50 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 text-[11px] text-white/90 font-medium">
            <MapPin className="w-3 h-3 text-primary" />
            <span>{formatDistance(food.distanceKm || 1.8)}</span>
          </div>
          <div className="inline-flex items-center gap-1 bg-black/50 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 text-[11px] text-white/90 font-medium">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>{food.prepTimeMinutes || 20}m prep</span>
          </div>
        </div>

        {/* Dish Title & Restaurant */}
        <div>
          <h2 className="text-xl font-extrabold text-white leading-tight drop-shadow-md">
            {food.title}
          </h2>
          <p className="text-xs text-white/80 font-medium pt-0.5 flex items-center gap-1">
            <span className="text-white/60">by</span>
            <span className="text-amber-400 font-semibold">{food.partner.restaurantName}</span>
            <span>• ⭐ {food.partner.rating || 4.8}</span>
          </p>
        </div>

        {/* Price Tag & Discount */}
        <div className="flex items-baseline gap-2 pt-0.5">
          <span className="text-2xl font-black text-white drop-shadow-md">
            {formatPrice(food.price)}
          </span>
          {food.discountPrice && (
            <span className="text-sm text-white/50 line-through">
              {formatPrice(food.discountPrice)}
            </span>
          )}
          {food.variants && food.variants.length > 0 && (
            <span className="text-[11px] bg-white/15 backdrop-blur-md text-white/90 px-2 py-0.5 rounded-md font-semibold">
              {food.variants.length} Sizes
            </span>
          )}
        </div>

        {/* Dual Conversion Sticky Action Bar */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onOpenCustomizer(food)}
            className="flex-1 bg-white/15 hover:bg-white/25 backdrop-blur-md text-white font-bold py-2.5 px-3.5 rounded-xl border border-white/20 flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] text-xs shadow-lg"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>+ Add to Cart</span>
          </button>
          <button
            onClick={() => onBuyNow(food)}
            className="flex-1 bg-linear-to-r from-primary to-secondary hover:brightness-110 text-white font-bold py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] text-xs shadow-[0_0_20px_rgba(255,56,92,0.4)]"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>⚡ Buy Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}
