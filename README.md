# MV Laptop - Deploy (Vercel Hobby + Supabase Free)

Ứng dụng Next.js + Prisma + PostgreSQL.

## 1) Chuẩn bị môi trường

1. Copy env mẫu:

```bash
cp .env.example .env
```

2. Điền `DATABASE_URL` trong `.env`.

> Prisma schema đã dùng `env("DATABASE_URL")` tại `prisma/schema.prisma`.

---

## 2) Chạy local

```bash
npm install
npm run db:generate
npm run dev
```

Mở `http://localhost:3000`.

---

## 3) Migration + seed local

```bash
npm run db:migrate
npm run db:seed
```

- `db:migrate`: tạo/apply migration trong môi trường dev.
- `db:seed`: nạp dữ liệu mẫu.

---

## 4) Build production

```bash
npm run build
npm run start
```

Build phải pass trước khi deploy.

---

## 5) Cấu hình Supabase (Free)

1. Tạo project mới trên Supabase.
2. Vào **Project Settings → Database → Connection string**.
3. Lấy chuỗi kết nối PostgreSQL:
   - Khuyến nghị cho Vercel serverless: **Transaction pooler** (`:6543`) + `pgbouncer=true&connection_limit=1`.
4. Gán vào `DATABASE_URL`.

Ví dụ:

```env
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@<host>:6543/postgres?pgbouncer=true&connection_limit=1"
```

---

## 6) Deploy Vercel (Hobby)

1. Push source lên GitHub/GitLab/Bitbucket.
2. Import project vào Vercel.
3. Trong Vercel → **Project Settings → Environment Variables**:
   - thêm `DATABASE_URL`
4. Deploy.

### Bắt buộc sau deploy đầu tiên

Chạy migration lên database production (từ local hoặc CI):

```bash
npm ci
npm run db:deploy
```

Nếu cần dữ liệu mẫu trên production:

```bash
npm run db:seed
```

> Chỉ seed production khi thật sự muốn dữ liệu demo.

---

## 7) Script quan trọng

- `npm run build` → build production
- `npm run db:generate` → generate Prisma Client
- `npm run db:migrate` → migrate dev
- `npm run db:deploy` → apply migration cho production
- `npm run db:seed` → seed dữ liệu mẫu
- `npm run db:reset` → reset DB (dev)
- `npm run ops:health` → kiểm tra nhanh health API
- `npm run ops:go-live` → go-live check 1 lệnh (generate + deploy + health)

## 9) Health endpoint

- `GET /api/health`
- Trả JSON `ok: true/false` + trạng thái DB.

---

## 8) Ghi chú ổn định khi chạy online

- API chính đã dùng Prisma shared client (`src/lib/prisma.ts`).
- Các route DB nặng đã cố định runtime Node.js (`runtime = "nodejs"`) để tránh Edge runtime không hỗ trợ Prisma.
- Không hardcode thông tin DB trong code; dùng env hoàn toàn.
