FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS collector
WORKDIR /app
RUN addgroup -S tracker && adduser -S tracker -G tracker && mkdir -p /app/market-data && chown tracker:tracker /app/market-data
COPY --chown=tracker:tracker collector ./collector
COPY --chown=tracker:tracker src/data/resources.json src/data/crafting-watchlist.json src/data/collector-policy.json ./src/data/
USER tracker
CMD ["node", "collector/run.mjs"]

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
RUN addgroup -S tracker && adduser -S tracker -G tracker && mkdir -p /app/market-data && chown tracker:tracker /app/market-data
COPY --from=builder --chown=tracker:tracker /app/.next/standalone ./
COPY --from=builder --chown=tracker:tracker /app/.next/static ./.next/static
USER tracker
EXPOSE 3000
CMD ["node", "server.js"]
