"use client";

import { useEffect } from "react";

/**
 * Registers the Rider Service Worker scoped strictly to `/rider`
 * Ensures customer and partner routes never trigger rider PWA prompts.
 */
export function RiderPwaProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      window.location.pathname.startsWith("/rider")
    ) {
      navigator.serviceWorker
        .register("/sw-rider.js", { scope: "/rider" })
        .then((reg) => {
          console.log("🛵 Rider Service Worker registered with scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("Rider Service Worker registration failed:", err);
        });
    }
  }, []);

  return <>{children}</>;
}
