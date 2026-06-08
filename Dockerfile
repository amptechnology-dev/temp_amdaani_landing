FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps


FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build


FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# COPY standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# COPY static files
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# THIS LINE IS MISSING IN YOUR DOCKERFILE
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 7010

ENV PORT=7010
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
