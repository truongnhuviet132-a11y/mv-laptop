import { NextResponse } from "next/server";
import { ensureDefaultAdmin, getCurrentUser } from "@/lib/auth";

export async function GET() {
  await ensureDefaultAdmin();
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}
