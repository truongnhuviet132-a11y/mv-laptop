import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ensureDefaultAdmin, SESSION_COOKIE, signSession } from "@/lib/auth";

export async function POST(req: Request) {
  await ensureDefaultAdmin();
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!username || !password) {
    return NextResponse.json({ error: "Thiếu tài khoản hoặc mật khẩu." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({ where: { username, isActive: true } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Sai tài khoản hoặc mật khẩu." }, { status: 401 });
  }

  const token = await signSession({ userId: user.id, username: user.username, role: user.role });
  const res = NextResponse.json({ ok: true, user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role } });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
