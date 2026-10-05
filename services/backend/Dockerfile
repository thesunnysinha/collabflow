# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# --- development: nodemon with source bind-mounted (docker-compose.dev.yml) ---
FROM base AS dev
ENV NODE_ENV=development
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npx", "nodemon", "index.js"]

# --- production dependencies ---
FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# --- production ---
FROM base AS production
COPY --from=deps --chown=10001:10001 /app/node_modules ./node_modules
COPY --chown=10001:10001 . .
# Numeric UID so Kubernetes can enforce runAsNonRoot.
USER 10001
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "index.js"]
