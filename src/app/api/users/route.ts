import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ensureDefaultAdmin, getCurrentUser } from "@/lib/auth";
import { UserRole } from "@prisma/client";

async function requireAdminUser() {
  await ensureDefaultAdmin();
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 }) };
  if (user.role !== "OWNER") return { error: NextResponse.json({ error: "Chỉ Admin mới được quản lý tài khoản." }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const auth = await requireAdminUser();
  if (auth.error) return auth.error;
  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
    select: { id: true, username: true, fullName: true, role: true, isActive: true, createdAt: true },
  });
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const auth = await requireAdminUser();
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || "").trim().toLowerCase();
  const fullName = String(body.fullName || "").trim() || username;
  const password = String(body.password || "");
  const role = String(body.role || "SALES") as UserRole;

  if (!username || !/^[a-z0-9_.-]{3,32}$/.test(username)) {
    return NextResponse.json({ error: "Username phải 3-32 ký tự, chỉ gồm chữ thường/số/._-" }, { status: 400 });
  }
  if (!password || password.length < 4) {
    return NextResponse.json({ error: "Mật khẩu tối thiểu 4 ký tự." }, { status: 400 });
  }
  if (!Object.values(UserRole).includes(role)) {
    return NextResponse.json({ error: "Quyền không hợp lệ." }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({
      data: { username, fullName, passwordHash: await bcrypt.hash(password, 10), role, isActive: true },
      select: { id: true, username: true, fullName: true, role: true, isActive: true, createdAt: true },
    });
    return NextResponse.json({ ok: true, user });
  } catch (err: unknown) {
    const code = typeof err === "object" && err && "code" in err ? (err as { code?: string }).code : "";
    if (code === "P2002") return NextResponse.json({ error: "Username đã tồn tại." }, { status: 400 });
    throw err;
  }
}
