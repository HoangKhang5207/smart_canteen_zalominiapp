# Smart Canteen Mini App — Zalo Mini App (React 18 + TypeScript + ZaUI)

Sub-repository độc lập cho tầng Frontend khách hàng (**Phụ huynh & Học sinh**) của hệ thống **Smart Canteen & Căn tin Số**: React 18, TypeScript, ZaUI (`zmp-ui`), `zmp-sdk`, Jotai (in-memory state), TanStack Query v5 và Tailwind CSS.

---

## Bảng Chọn Nhanh 3 Chế độ Khởi chạy

| Chế độ | File `.env` mẫu | `VITE_API_BASE_URL` | `VITE_DEMO_PHONE_LOGIN` | Truy cập |
|---|---|---|---|---|
| **Mode 1: Thuần Local (Host)** | `.env.example` | `http://localhost:8000/api/v1` | `true` | Trình duyệt `http://localhost:3000` |
| **Mode 2: Docker / Docker Compose** | `.env.docker.example` | `http://localhost:8000/api/v1` | `true` | Trình duyệt `http://localhost:3000` |
| **Mode 3: Zalo Mobile (Testing)** | `.env.zalo.example` | `https://<domain-https>/api/v1` | `false` *(dùng SĐT Zalo thật)* | **Zalo Mobile** (QR Code / Deep Link) |

---

## Mode 1 — Khởi chạy Thuần Local trên Host (Không dùng Docker)

**Yêu cầu:** Node.js `24.x` (tối thiểu `20+`), npm `10+`, và Backend `api/` đang chạy ở `http://localhost:8000`.

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

- Mở trình duyệt tại **`http://localhost:3000`** (khuyến nghị bật DevTools khung di động `390×844`).
- Hỗ trợ nút đăng nhập nhanh **Phụ huynh Demo (`0901234567`)** và **Học sinh Demo (`0901234568`)**.

---

## Mode 2 — Khởi chạy bằng Docker / Docker Compose

**Yêu cầu:** Docker Engine 24+ & Docker Compose V2, và Backend `api/` đang chạy (Local hoặc Docker) tại cổng host `8000`.

### 2.1. Chế độ Development (Vite Dev Server `:3000`)
```powershell
Copy-Item .env.docker.example .env
docker compose up -d --build
```
- Truy cập **`http://localhost:3000`**.
- **Lưu ý quan trọng:** Trình duyệt chạy trên máy host nên `VITE_API_BASE_URL` phải là `http://localhost:8000/api/v1` (KHÔNG dùng tên container nội bộ `http://nginx:8080`).

### 2.2. Chế độ Production-like (Build static `www/` + Nginx Unprivileged)
```powershell
docker compose -f compose.yaml -f compose.prod.yaml up -d --build
```
- **App:** `http://localhost:3000` · **Healthcheck:** `http://localhost:3000/healthz`
- Mặc định `compose.prod.yaml` truyền `VITE_DEMO_PHONE_LOGIN=false` (có thể ghi đè qua biến môi trường nếu muốn test nút demo).

---

## Mode 3 — Khởi chạy & Kiểm thử trên Zalo Mobile (Development / Testing)

**Yêu cầu:**
1. Backend `api/` đã cấu hình theo `api/.env.zalo.example` và đang chạy qua **HTTPS công khai** (`https://<domain-https>`).
2. Tài khoản Zalo Developer đã tạo Mini App, lấy `APP_ID`, bật quyền `getPhoneNumber` và thêm SĐT người kiểm thử vào mục **Testers**.

```powershell
# 1. Tạo .env từ mẫu Zalo Mobile và điền VITE_API_BASE_URL (HTTPS) + APP_ID
Copy-Item .env.zalo.example .env

# 2. Kiểm tra typecheck, unit test và build bundle vào www/
npx tsc --noEmit
npm test
npm run build

# 3. Đăng nhập & đẩy bản Testing lên Zalo Mini App (hoặc dùng Zalo Mini App VS Code Extension)
npm run login
npm run deploy
```

- Hoặc chạy trình giả lập Zalo Mini App Studio cục bộ bằng: `npm run start` (`zmp start`).
- Sau khi `deploy`, quét **Mã QR Testing** bằng ứng dụng **Zalo trên điện thoại** để trải nghiệm luồng xác thực SĐT Zalo thật (`zmp-sdk getPhoneNumber()`).

---

## Kiểm thử & Cổng chất lượng (Quality Gates)

```powershell
npm test           # Vitest (11 test files / 44 unit tests)
npx tsc --noEmit   # TypeScript strict type-check
npm run build      # Vite production build -> www/
```

## GitHub Actions CI

Pipeline tự động tại [.github/workflows/ci.yml](.github/workflows/ci.yml) gồm 3 job: `quality-and-test` (`tsc`, Vitest, Vite build), `security-audit` (`npm audit --omit=dev --audit-level=high`) và `docker-build` (build Nginx non-root + smoke test `/healthz` và `/`).
