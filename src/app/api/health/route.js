// GET /api/health — za Docker HEALTHCHECK i monitoring: 200 ako baza odgovara,
// 503 ako ne. Javno je, pa ne otkriva detalje (poruku greške, broj zapisa);
// greška se samo loguje na serveru.
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Health check failed:", err);
    return Response.json({ ok: false }, { status: 503 });
  }
}
