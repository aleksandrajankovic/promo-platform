// middleware.js
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Edge runtime — bez DB pristupa ovde namerno (Prisma nije edge-compatible
// bez posebnog adaptera). Market po hostname-u se rešava dole, u samim
// stranicama/rutama (Node.js runtime), ne ovde.
function isAdminHost(req) {
  const host = req.headers.get("host") || "";
  const adminHost = process.env.ADMIN_HOST || "";
  return adminHost && host === adminHost;
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Admin/login putanje — nepromenjena logika od ranije, samo sada eksplicitno
  // izdvojena granom umesto da matcher radi tu selekciju.
  if (pathname.startsWith("/admin") || pathname.startsWith("/login")) {
    if (!isAdminHost(req)) {
      // Javni kalendar domen — admin/login ovde ne postoji, preusmeri na admin host.
      if (process.env.ADMIN_HOST) {
        const url = new URL(`https://${process.env.ADMIN_HOST}/login`, req.url);
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    if (pathname.startsWith("/login")) {
      return NextResponse.next();
    }

    const token = req.cookies.get("admin_auth")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch {
      // Token nevažeći ili istekao — obriši cookie i preusmeri
      const res = NextResponse.redirect(new URL("/login", req.url));
      res.cookies.delete("admin_auth");
      return res;
    }
  }

  // Javne kalendar putanje — root layout (src/app/layout.js) mora da zna
  // stvarni jezik trenutne stranice da bi ispravno postavio <html lang>, ali
  // App Router root layout nema pristup route params-ima. Prosleđujemo prvi
  // path segment kroz header; layout ga proverava protiv market.locales pre
  // upotrebe (ovde se ništa ne validira niti dotiče baza — Edge runtime).
  const firstSegment = pathname.split("/").filter(Boolean)[0] || "";
  const res = NextResponse.next();
  res.headers.set("x-first-segment", firstSegment);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|img/|uploads/).*)"],
};
