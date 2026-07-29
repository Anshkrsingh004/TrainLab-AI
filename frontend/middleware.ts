import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Optimistic guard: redirect to /login when the session cookie is absent.
// The backend still validates the token on every API request; this only keeps
// unauthenticated users out of protected pages. Keep the name in sync with
// SESSION_COOKIE_NAME in the backend settings.
const SESSION_COOKIE = "trainlab_session";

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (hasSession) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Protected routes. Add new protected paths here as milestones land.
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/datasets/:path*",
    "/training/:path*",
    "/experiments/:path*",
    "/models/:path*",
  ],
};
