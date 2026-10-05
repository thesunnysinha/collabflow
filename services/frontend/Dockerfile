# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# --- development: hot-reloading dev server (used by docker-compose.dev.yml) ---
FROM base AS dev
RUN npm ci
COPY . .
ENV WATCHPACK_POLLING=true
CMD ["npm", "start"]

# --- build: static production bundle ---
FROM base AS build
RUN npm ci
COPY . .
# Same-origin by default (/api, /socket.io); override only if the API lives elsewhere.
ARG REACT_APP_API_URL
ARG REACT_APP_SOCKET_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL REACT_APP_SOCKET_URL=$REACT_APP_SOCKET_URL
RUN npm run build

# --- production: static files on unprivileged nginx ---
FROM nginxinc/nginx-unprivileged:1.27-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
