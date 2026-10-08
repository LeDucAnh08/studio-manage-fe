# ── Stage 1: Build Vite/React app ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile

COPY . .

ARG VITE_CLIENT_PORTAL_ENABLED=true
ENV VITE_CLIENT_PORTAL_ENABLED=${VITE_CLIENT_PORTAL_ENABLED}
ARG VITE_CLIENT_RENTAL_ENABLED=false
ENV VITE_CLIENT_RENTAL_ENABLED=${VITE_CLIENT_RENTAL_ENABLED}

RUN yarn build

# ── Stage 2: Serve with nginx ───────────────────────────────────────────────────
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
