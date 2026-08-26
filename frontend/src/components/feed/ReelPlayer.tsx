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
          // Gracefully fallback to poster thumbnail if sample video URL is blocked
        }}
        className="w-full h-full object-cover cursor-pointer"
      />

      {/* Top Gradient Overlay */}
      <div className="absolute top-0 inset-x-0 h-28 bg-linear-to-b from-black/80 via-black/30 to-transparent pointer-events-none z-10" />

      {/* Bottom Gradient Overlay */}
      <div className="absolute bottom-0 inset-x-0 h-72 bg-linear-to-t from-black/95 via-black/60 to-transparent pointer-events-none z-10" />

      {/* Double Tap Heart Particle Animation */}
      <AnimatePresence>
        {heartBurst && (
          <motion.div
            initial={{ scale: 0, opacity: 1, rotate: -20 }}
            animate={{ scale: 1.6, opacity: 1, rotate: 0 }}
            exit={{ scale: 2.2, opacity: 0, y: -40 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{ left: heartBurst.x - 36, top: heartBurst.y - 36 }}
            className="absolute z-40 pointer-events-none"
          >
            <Heart className="w-18 h-18 text-rose-500 fill-rose-500 drop-shadow-[0_0_25px_rgba(244,63,94,0.8)]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play/Pause Center Indicator (When Paused) */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute z-20 w-16 h-16 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:scale-110 transition-transform"
        >
          <Play className="w-8 h-8 fill-white translate-x-0.5" />
        </button>
      )}

      {/* Right Floating Social Action Rail */}
      <div className="absolute right-3.5 bottom-28 z-20">
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

      {/* Bottom Overlay: Dish Details & Sticky Conversion Buttons */}
      <div className="absolute bottom-0 inset-x-0 p-4 pb-20 md:pb-6 z-20 space-y-3.5 pointer-events-auto">
        {/* Restaurant Badge & Distance */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-bold text-white flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="truncate max-w-[150px]">{food.partner.restaurantName}</span>
          </span>
          {food.distanceKm !== undefined && (
            <span className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-white/80 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-primary" />
              <span>{formatDistance(food.distanceKm)}</span>
            </span>
          )}
          {food.prepTimeMinutes && (
            <span className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-white/80 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>{food.prepTimeMinutes}m</span>
            </span>
          )}
        </div>

        {/* Title, Veg Badge & Description */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <DietaryBadge isVeg={food.isVeg} />
            <h2 className="text-lg font-black text-white leading-tight drop-shadow-md truncate">
              {food.title}
            </h2>
          </div>
          <p className="text-xs text-white/80 line-clamp-2 leading-relaxed drop-shadow-sm font-medium">
            {food.description}
          </p>
        </div>

        {/* Price & Primary Conversion CTA Bar */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white drop-shadow-md">
              {formatPrice(food.price)}
            </span>
            {food.discountPrice && (
              <span className="text-xs text-white/50 line-through">
                {formatPrice(food.discountPrice)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Customizer / Add to Cart Drawer Trigger */}
            <button
              onClick={() => onOpenCustomizer(food)}
              className="px-3.5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg active:scale-95"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>+ Cart</span>
            </button>

            {/* Instant 1-Tap Buy Now Button */}
            <button
              onClick={() => onBuyNow(food)}
              className="px-4 py-2.5 rounded-2xl bg-linear-to-r from-primary to-orange-500 hover:from-primary-hover hover:to-orange-600 text-white text-xs font-black shadow-[0_0_20px_rgba(255,46,77,0.5)] transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Buy Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
