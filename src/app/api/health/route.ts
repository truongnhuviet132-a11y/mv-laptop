import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const startedAt = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - startedAt;

    return NextResponse.json({
      ok: true,
      status: "OK",
      service: "mv-laptop",
      db: "OK",
      dbLatencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Health check failed";
    return NextResponse.json(
      {
        ok: false,
        status: "ERROR",
        service: "mv-laptop",
        db: "ERROR",
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
