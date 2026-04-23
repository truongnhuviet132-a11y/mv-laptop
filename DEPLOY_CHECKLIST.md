# Deploy checklist (Supabase Free + Vercel Hobby)

## Env cần cấu hình

- **Bắt buộc (local + production):** `DATABASE_URL`
- **Optional:** `DIRECT_URL` (khi cần kết nối direct)
- **Optional (chỉ khi bật auth):** `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- **Optional safety:** `ALLOW_PROD_SEED=true` (chỉ bật tạm khi cần seed production)
- `NODE_ENV`: Vercel tự set production, local để development

1. **Tạo Supabase project**
   - Vào Supabase → New project → chờ DB khởi tạo xong.

2. **Lấy `DATABASE_URL`**
   - Supabase → Project Settings → Database → Connection string.
   - Dùng chuỗi PostgreSQL (khuyên dùng pooler `:6543`).

3. **Cấu hình Vercel**
   - Push code lên GitHub.
   - Vercel → Add New Project → import repo.
   - Project Settings → Environment Variables → thêm `DATABASE_URL`.

4. **Deploy**
   - Bấm **Deploy** trên Vercel.

5. **Chạy migration production**
   - Tại máy local (trong project), set `DATABASE_URL` production rồi chạy:
   ```bash
   npm ci
   npm run ops:go-live -BaseUrl https://<your-vercel-domain>
   ```

   > Script sẽ tự chạy: db:generate -> db:deploy -> health check.

6. **Seed dữ liệu (nếu cần dữ liệu mẫu)**
   - Bật tạm env `ALLOW_PROD_SEED=true`
   ```bash
   npm run db:seed
   ```
   - Seed xong: **tắt lại** `ALLOW_PROD_SEED`.

7. **Test nhanh 5 flow chính**
   - Dashboard
   - Nhập hàng
   - Tồn hàng
   - Bán hàng
   - Đối soát COD / Báo cáo

> Xong: bản online sẵn sàng test thực tế.
