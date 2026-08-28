import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

interface DecodedJwt {
  id?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

/**
 * Lightweight Base64Url JWT Payload decoder for Edge Runtime.
 */
function decodeJwtPayload(token: string): DecodedJwt | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Maps system roles to their dedicated home route.
 */
function getRoleHomeRoute(role?: string): string {
  switch (role) {
    case "foodpartner":
    case "partner":
      return "/partner/orders";
    case "deliverypartner":
    case "rider":
      return "/rider/radar";
    case "admin":
      return "/admin/analytics";
    case "customer":
    case "user":
    default:
      return "/feed";
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Retrieve auth token from cookies
  const token =
    request.cookies.get("accessToken")?.value ||
    request.cookies.get("token")?.value;

  const payload = token ? decodeJwtPayload(token) : null;
  const role = payload?.role;

  // ── 1. Root "/" Home Routing ──────────────────────────────────────────────
  if (pathname === "/") {
    const targetRoute = role ? getRoleHomeRoute(role) : "/feed";
    return NextResponse.redirect(new URL(targetRoute, request.url));
  }

  // ── 2. UX Role Boundaries Guard (Redirect to home with message) ───────────
  if (role) {
    const isRiderRole = role === "rider" || role === "deliverypartner";
    const isPartnerRole = role === "partner" || role === "foodpartner";
    const isCustomerRole = role === "customer" || role === "user";
    const isAdminRole = role === "admin";

    // 2a. Rider navigating into /partner/* or /admin/*
    if (isRiderRole && (pathname.startsWith("/partner") || pathname.startsWith("/admin"))) {
      const redirectUrl = new URL("/rider/radar", request.url);
      redirectUrl.searchParams.set("denied", "1");
      redirectUrl.searchParams.set(
        "msg",
        "Riders do not have access to kitchen partner or admin portals"
      );
      return NextResponse.redirect(redirectUrl);
    }

    // 2b. Partner navigating into /admin/* or /rider/*
    if (isPartnerRole && (pathname.startsWith("/admin") || pathname.startsWith("/rider"))) {
      const redirectUrl = new URL("/partner/orders", request.url);
      redirectUrl.searchParams.set("denied", "1");
      redirectUrl.searchParams.set(
        "msg",
        "Access restricted to restaurant kitchen workspace"
      );
      return NextResponse.redirect(redirectUrl);
    }

    // 2c. Customer navigating into /partner/*, /admin/*, or /rider/*
    if (isCustomerRole && (pathname.startsWith("/partner") || pathname.startsWith("/admin") || pathname.startsWith("/rider"))) {
      const redirectUrl = new URL("/feed", request.url);
      redirectUrl.searchParams.set("denied", "1");
      redirectUrl.searchParams.set(
        "msg",
        "Please log in with a partner or rider account to access this portal"
      );
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/feed/:path*",
    "/explore/:path*",
    "/cart/:path*",
    "/orders/:path*",
    "/order/:path*",
    "/favorites/:path*",
    "/profile/:path*",
    "/partner/:path*",
    "/rider/:path*",
    "/admin/:path*",
  ],
};
