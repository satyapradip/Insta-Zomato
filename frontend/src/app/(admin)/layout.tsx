import React, { Suspense } from "react";
import { AdminSidebar } from "@/components/navigation/AdminSidebar";
import { AccessDeniedToast } from "@/components/common/AccessDeniedToast";

export const metadata = {
  title: "SuperAdmin Console | Insta-Zomato Core",
  description: "Platform GMV economics, partner/rider KYC verification, and content moderation.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center pb-12 lg:pb-0">
      <Suspense fallback={null}>
        <AccessDeniedToast />
      </Suspense>
      <AdminSidebar />
      <main className="flex-1 lg:pl-64 w-full">{children}</main>
    </div>
  );
}
