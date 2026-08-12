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

// Matcher (dole) ograničava middleware isključivo na /admin/* i /login, pa je
// svaki request koji ovde stigne po definiciji admin ruta.
export async function middleware(req) {
  const { pathname } = req.nextUrl;

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

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
