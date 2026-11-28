import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-session";

// Admin pages need a valid session; the API routes check it again on their own.
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/entrar") return NextResponse.next();

  if (await verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();

  const login = new URL("/admin/entrar", request.url);
  login.searchParams.set("volver", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
