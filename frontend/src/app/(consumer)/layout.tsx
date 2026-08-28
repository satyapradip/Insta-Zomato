import React, { Suspense } from "react";
import { ConsumerSidebar } from "@/components/navigation/ConsumerSidebar";
import { ConsumerBottomNav } from "@/components/navigation/ConsumerBottomNav";
import { AccessDeniedToast } from "@/components/common/AccessDeniedToast";

export const metadata = {
  title: "Insta-Zomato | Gourmet Reels & Hyper-Local Delivery",
  description: "Discover food reels, explore trending cuisines, and order with 1-tap delivery.",
};

export default function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center pb-20 lg:pb-0">
      <Suspense fallback={null}>
        <AccessDeniedToast />
      </Suspense>
      <ConsumerSidebar />
      <main className="flex-1 lg:pl-64 w-full">{children}</main>
      <ConsumerBottomNav />
    </div>
  );
}
