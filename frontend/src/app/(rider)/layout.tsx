import React, { Suspense } from "react";
import type { Metadata } from "next";
import { RiderNavbar } from "@/components/navigation/RiderNavbar";
import { RiderPwaProvider } from "@/components/rider/RiderPwaProvider";
import { AccessDeniedToast } from "@/components/common/AccessDeniedToast";

export const metadata: Metadata = {
  title: "Rider Fleet App | Insta-Zomato GPS Dispatch",
  description: "Live GPS dispatch, turn-by-turn navigation, and OTP delivery verification.",
  manifest: "/rider-manifest.json",
};

export default function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RiderPwaProvider>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Suspense fallback={null}>
          <AccessDeniedToast />
        </Suspense>
        <RiderNavbar />
        <main className="flex-1 w-full pb-20 md:pb-6">{children}</main>
      </div>
    </RiderPwaProvider>
  );
}
