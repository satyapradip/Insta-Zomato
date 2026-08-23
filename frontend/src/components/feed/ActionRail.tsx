"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Bookmark, Share2, Music2 } from "lucide-react";
import { toast } from "sonner";

interface ActionRailProps {
  foodId: string;
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  isMuted: boolean;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onOpenComments: () => void;
  onToggleSound: () => void;
}

export function ActionRail({
  foodId,
  likesCount,
  commentsCount,
  savesCount,
  isLiked = false,
  isSaved = false,
  isMuted,
  onToggleLike,
  onToggleSave,
  onOpenComments,
  onToggleSound,
}: ActionRailProps) {
  const [likeScale, setLikeScale] = useState(1);

  const handleLike = () => {
    setLikeScale(1.4);
    setTimeout(() => setLikeScale(1), 300);
    onToggleLike();
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Insta-Zomato Food Reel",
          text: "Check out this delicious dish on Insta-Zomato!",
          url: `${window.location.origin}/feed#${foodId}`,
        });
      } catch {
        // Ignored if user dismissed
      }
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/feed#${foodId}`);
      toast.success("Link copied to clipboard! 📋");
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <div className="flex flex-col items-center gap-5 z-20">
      {/* Like Button */}
      <button
        onClick={handleLike}
        className="group flex flex-col items-center gap-1 focus:outline-none"
        aria-label="Like Dish"
      >
        <motion.div
          animate={{ scale: likeScale }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md border transition-colors ${
            isLiked
              ? "bg-rose-500/25 border-rose-500/50 text-rose-500"
              : "bg-black/40 border-white/15 text-white group-hover:bg-white/10"
          }`}
        >
          <Heart
            className={`w-6 h-6 transition-all ${
              isLiked ? "fill-rose-500 text-rose-500" : "text-white"
            }`}
          />
        </motion.div>
        <span className="text-xs font-semibold text-white drop-shadow-md">
          {formatCount(likesCount)}
        </span>
      </button>

      {/* Comment Button */}
      <button
        onClick={onOpenComments}
        className="group flex flex-col items-center gap-1 focus:outline-none"
        aria-label="Comments"
      >
        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-md border border-white/15 text-white group-hover:bg-white/10 transition-colors">
          <MessageCircle className="w-6 h-6" />
        </div>
        <span className="text-xs font-semibold text-white drop-shadow-md">
          {formatCount(commentsCount)}
        </span>
      </button>

      {/* Bookmark / Save */}
      <button
        onClick={onToggleSave}
        className="group flex flex-col items-center gap-1 focus:outline-none"
        aria-label="Save to Wishlist"
      >
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md border transition-colors ${
            isSaved
              ? "bg-amber-500/25 border-amber-500/50 text-amber-400"
              : "bg-black/40 border-white/15 text-white group-hover:bg-white/10"
          }`}
        >
          <Bookmark
            className={`w-6 h-6 transition-all ${
              isSaved ? "fill-amber-400 text-amber-400" : "text-white"
            }`}
          />
        </div>
        <span className="text-xs font-semibold text-white drop-shadow-md">
          {formatCount(savesCount)}
        </span>
      </button>

      {/* Share Button */}
      <button
        onClick={handleShare}
        className="group flex flex-col items-center gap-1 focus:outline-none"
        aria-label="Share"
      >
        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-md border border-white/15 text-white group-hover:bg-white/10 transition-colors">
          <Share2 className="w-6 h-6" />
        </div>
        <span className="text-xs font-semibold text-white drop-shadow-md">Share</span>
      </button>

      {/* Rotating Audio Vinyl Disc */}
      <button
        onClick={onToggleSound}
        className="mt-2 relative flex items-center justify-center focus:outline-none"
        aria-label="Toggle Mute"
      >
        <motion.div
          animate={!isMuted ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="w-11 h-11 rounded-full bg-linear-to-tr from-zinc-900 to-zinc-700 border-2 border-white/30 flex items-center justify-center shadow-lg"
        >
          <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
          </div>
        </motion.div>
        {isMuted && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] text-white font-bold border border-black">
            ✕
          </span>
        )}
      </button>
    </div>
  );
}
