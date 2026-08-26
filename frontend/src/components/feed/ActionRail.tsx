"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Bookmark, Share2, Volume2, VolumeX } from "lucide-react";
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
  const [saveScale, setSaveScale] = useState(1);

  const handleLike = () => {
    setLikeScale(1.4);
    setTimeout(() => setLikeScale(1), 300);
    onToggleLike();
  };

  const handleSave = () => {
    setSaveScale(1.3);
    setTimeout(() => setSaveScale(1), 300);
    onToggleSave();
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
        // Dismissed share modal
      }
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/feed#${foodId}`);
      toast.success("Reel link copied to clipboard! 📋");
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <div className="flex flex-col items-center gap-4 z-20">
      {/* Sound Mute/Unmute Button */}
      <button
        onClick={onToggleSound}
        className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md bg-black/40 border border-white/15 text-white hover:bg-white/10 transition-colors"
        aria-label="Toggle Sound"
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
      </button>

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
        <div className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md bg-black/40 border border-white/15 text-white group-hover:bg-white/10 transition-colors">
          <MessageCircle className="w-6 h-6" />
        </div>
        <span className="text-xs font-semibold text-white drop-shadow-md">
          {formatCount(commentsCount)}
        </span>
      </button>

      {/* Save to Wishlist Button */}
      <button
        onClick={handleSave}
        className="group flex flex-col items-center gap-1 focus:outline-none"
        aria-label="Bookmark"
      >
        <motion.div
          animate={{ scale: saveScale }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
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
        </motion.div>
        <span className="text-xs font-semibold text-white drop-shadow-md">
          {formatCount(savesCount)}
        </span>
      </button>

      {/* Share Button */}
      <button
        onClick={handleShare}
        className="group flex flex-col items-center gap-1 focus:outline-none"
        aria-label="Share Reel"
      >
        <div className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md bg-black/40 border border-white/15 text-white group-hover:bg-white/10 transition-colors">
          <Share2 className="w-5 h-5" />
        </div>
        <span className="text-xs font-semibold text-white drop-shadow-md">Share</span>
      </button>
    </div>
  );
}
