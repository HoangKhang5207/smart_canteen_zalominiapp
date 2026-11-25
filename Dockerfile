# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# -----------------------------------------------------------------------------
# Stage: dev (Vite dev server running as non-root node user)
# -----------------------------------------------------------------------------
FROM deps AS dev

COPY --chown=node:node . .
RUN chown -R node:node /app

USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

# -----------------------------------------------------------------------------
# Stage: builder (TypeScript type-check + Vite production bundle -> /app/www)
# -----------------------------------------------------------------------------
FROM deps AS builder

ARG VITE_API_BASE_URL=http://localhost:8000/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY . .
RUN npx tsc --noEmit && npm run build

# -----------------------------------------------------------------------------
# Stage: production (immutable non-root Nginx serving static bundle)
# -----------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS production

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder --chown=nginx:nginx /app/www /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null 2>&1 || exit 1
