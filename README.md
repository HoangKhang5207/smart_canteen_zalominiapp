# Smart Canteen Mini App — Zalo Mini App (React 18 + TypeScript + ZaUI)

Sub-repository độc lập cho tầng Frontend khách hàng của hệ thống **Smart Canteen**: Zalo Mini App xây dựng bằng React 18, TypeScript, ZaUI (`zmp-ui`), Jotai, TanStack Query và Tailwind CSS.

## Yêu cầu môi trường

- **Khuyến nghị (Docker):** Docker Engine 24+ & Docker Compose V2.
- **Chạy thủ công trên host:** Node.js `24.x` (tối thiểu `20+`), npm `10+`.

## Khởi chạy nhanh với Docker

### Local / Dev (Vite Dev Server :3000)

```bash
cp .env.example .env
docker compose up -d --build
```

Truy cập `http://localhost:3000` (ứng dụng gọi API tại `VITE_API_BASE_URL`, mặc định `http://localhost:8000/api/v1`).

### Production-like Build (Nginx Unprivileged :8080 -> host :3000)

```bash
docker compose -f compose.yaml -f compose.prod.yaml up -d --build
```

- **App:** `http://localhost:3000`
- **Healthcheck:** `http://localhost:3000/healthz`

Production image được build multi-stage (`node:24-alpine` chạy `tsc --noEmit && npm run build`) và phục vụ static bundle `www/` qua `nginxinc/nginx-unprivileged:1.27-alpine` chạy non-root.

## Chạy thủ công trên Host & Kiểm thử

```bash
npm ci
npm run dev

# Cổng kiểm soát chất lượng (Quality Gates)
npx tsc --noEmit
npm test
npm run build
```

## Triển khai lên Zalo Mini App (Khi được cấp quyền)

```bash
zmp login
zmp deploy
```

## GitHub Actions CI

Pipeline tự động tại [.github/workflows/ci.yml](.github/workflows/ci.yml) chạy trên `push` và `pull_request` (`main`, `develop`):
1. `quality-and-test`: Node 24, `npm ci`, `npx tsc --noEmit`, Vitest (`npm test`), Vite build (`www/index.html`).
2. `security-audit`: `npm audit --omit=dev --audit-level=high`.
3. `docker-build`: Validate Compose, build production image và smoke test non-root UID + `GET /healthz` + `GET /`.

## Gắn Remote GitHub cho Sub-repo độc lập

```bash
git remote add origin https://github.com/<org-or-user>/smart-canteen-miniapp.git
# Sau khi review xong nhánh làm việc, merge vào main rồi push:
git checkout main
git merge --no-ff feat/docker-ci
git push -u origin main
```
