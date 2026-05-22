import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const { pathname } = req.nextUrl;

  // Paths that require authentication
  const isProtectedRoute = pathname.startsWith("/admin") || pathname.startsWith("/pos");
  // Login route
  const isLoginRoute = pathname.startsWith("/login");

  if (!token) {
    if (isProtectedRoute) {
      // Redirect to login if trying to access protected page without token
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Helper to decode token payload in edge environment (no Node crypto)
  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) {
      throw new Error("Invalid token format");
    }
    const decodedPayload = JSON.parse(
      Buffer.from(payloadBase64, "base64").toString("utf-8")
    );

    const isExpired = decodedPayload.exp * 1000 < Date.now();
    if (isExpired) {
      if (isProtectedRoute) {
        const response = NextResponse.redirect(new URL("/login", req.url));
        response.cookies.delete("token");
        return response;
      }
      return NextResponse.next();
    }

    // User is logged in and token is valid
    if (isLoginRoute) {
      // Redirect logged-in users away from login page
      const redirectUrl = decodedPayload.role === "admin" ? "/admin" : "/pos";
      return NextResponse.redirect(new URL(redirectUrl, req.url));
    }

    if (pathname.startsWith("/admin") && decodedPayload.role !== "admin") {
      // Non-admins cannot access admin dashboard
      return NextResponse.redirect(new URL("/pos", req.url));
    }
  } catch (error) {
    console.error("Middleware token error:", error);
    if (isProtectedRoute) {
      const response = NextResponse.redirect(new URL("/login", req.url));
      response.cookies.delete("token");
      return response;
    }
  }

  return NextResponse.next();
}

// Config to specify matching routes
export const config = {
  matcher: ["/admin/:path*", "/pos/:path*", "/login"],
};
