"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

export function AccessDeniedToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isDenied = searchParams.get("denied");
    const msg = searchParams.get("msg");

    if (isDenied === "1") {
      toast.error(msg || "Access restricted for your account role", {
        duration: 4500,
      });

      // Clean up search params from URL
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("denied");
      newParams.delete("msg");
      const cleanUrl = newParams.toString() ? `${pathname}?${newParams.toString()}` : pathname;
      router.replace(cleanUrl);
    }
  }, [searchParams, pathname, router]);

  return null;
}
