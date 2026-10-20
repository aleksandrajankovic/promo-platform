import prisma from "@/lib/db";
export const runtime = "nodejs";

export async function GET() {
  try {
    const [weeklyCount, specialsCount] = await Promise.all([
      prisma.weeklyPlan.count(),
      prisma.specialPromotion.count(),
    ]);
    return Response.json({ ok: true, weeklyCount, specialsCount });
  } catch (err) {
    return Response.json(
      { ok: false, error: err?.message || "DB unreachable" },
      { status: 503 }
    );
  }
}
