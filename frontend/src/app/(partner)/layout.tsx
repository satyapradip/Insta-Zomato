import React, { Suspense } from "react";
import { PartnerSidebar } from "@/components/navigation/PartnerSidebar";
import { AccessDeniedToast } from "@/components/common/AccessDeniedToast";

export const metadata = {
  title: "Partner Kitchen Console | Insta-Zomato",
  description: "Live Kitchen POS order management, food reel uploader, and menu studio.",
};

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center pb-12 lg:pb-0">
      <Suspense fallback={null}>
        <AccessDeniedToast />
      </Suspense>
      <PartnerSidebar />
      <main className="flex-1 lg:pl-64 w-full">{children}</main>
    </div>
  );
}
