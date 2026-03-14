import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login"];
const authPaths = ["/api/auth/login", "/api/auth/logout"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isAuthApi = authPaths.some((p) => pathname.startsWith(p));

  if (isAuthApi) return NextResponse.next();
  if (pathname.startsWith("/api/") && !isAuthApi) {
    return NextResponse.next();
  }
  if (isPublic) return NextResponse.next();
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
