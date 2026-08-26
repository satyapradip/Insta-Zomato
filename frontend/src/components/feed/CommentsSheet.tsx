"use client";

import React, { useState } from "react";
import { X, Send, Heart, Sparkles, MessageCircle } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

interface Comment {
  id: string;
  userName: string;
  userAvatar?: string;
  text: string;
  timeAgo: string;
  likes: number;
  isLiked?: boolean;
}

interface CommentsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  dishTitle: string;
}

const SAMPLE_COMMENTS: Record<string, Comment[]> = {
  default: [
    {
      id: "c1",
      userName: "Pooja Hegde",
      text: "The cheese pull on this burger is absolutely insane! 🤤 Must try!",
      timeAgo: "2h ago",
      likes: 42,
      isLiked: false,
    },
    {
      id: "c2",
      userName: "Rohan Verma",
      text: "Ordered it yesterday with extra truffle mayo, 10/10 recommend! 🔥",
      timeAgo: "5h ago",
      likes: 18,
      isLiked: true,
    },
    {
      id: "c3",
      userName: "Ananya Dixit",
      text: "Is the portion size good for two people?",
      timeAgo: "1d ago",
      likes: 6,
      isLiked: false,
    },
  ],
};

/**
 * 💬 CommentsSheet Component
 * ----------------------------------------------------------------------
 * Allows users to read and submit live comments on any food reel!
 */
export function CommentsSheet({ isOpen, onClose, dishTitle }: CommentsSheetProps) {
  const user = useAuthStore((state) => state.user);
  const [comments, setComments] = useState<Comment[]>(SAMPLE_COMMENTS.default);
  const [inputText, setInputText] = useState("");

  if (!isOpen) return null;

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newComment: Comment = {
      id: `c-${Date.now()}`,
      userName: user?.name || "Food Explorer",
      text: inputText.trim(),
      timeAgo: "Just now",
      likes: 0,
      isLiked: false,
    };

    setComments([newComment, ...comments]);
    setInputText("");
    toast.success("Comment posted! 💬");
  };

  const handleToggleCommentLike = (id: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const isLiked = !c.isLiked;
          return {
            ...c,
            isLiked,
            likes: isLiked ? c.likes + 1 : c.likes - 1,
          };
        }
        return c;
      })
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl h-[70vh] sm:h-[600px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground truncate max-w-[260px]">
              Comments ({comments.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-card-elevated hover:bg-card-hover text-muted hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dish Subtitle */}
        <div className="px-5 py-2 bg-card-elevated/50 border-b border-border text-xs text-muted truncate">
          Reel: <span className="font-semibold text-foreground">{dishTitle}</span>
        </div>

        {/* Comments Scrollable List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center text-xs font-black shrink-0">
                  {comment.userName[0]}
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">{comment.userName}</span>
                    <span className="text-[10px] text-muted">{comment.timeAgo}</span>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed break-words">
                    {comment.text}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleToggleCommentLike(comment.id)}
                className="flex flex-col items-center gap-0.5 text-muted hover:text-rose-500 pt-1 shrink-0"
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    comment.isLiked ? "fill-rose-500 text-rose-500" : ""
                  }`}
                />
                <span className="text-[10px] font-semibold">{comment.likes}</span>
              </button>
            </div>
          ))}
        </div>

        {/* Input Footer */}
        <form onSubmit={handleAddComment} className="p-4 border-t border-border bg-card flex items-center gap-2">
          <input
            type="text"
            placeholder={user ? "Add a delicious thought..." : "Sign in to add a comment..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-card-elevated border border-border text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white transition-all disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
