# syntax=docker/dockerfile:1

# Stage 1: Install workspace dependencies deterministically
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY web/package.json ./web/
RUN npm ci

# Stage 2: Build shared, web, and server workspaces
FROM deps AS build
WORKDIR /app
COPY tsconfig.base.json ./
COPY shared ./shared
COPY server ./server
COPY web ./web
RUN npm run build
RUN npm prune --omit=dev

# Stage 3: Minimal non-root production runtime
FROM node:22-slim AS runtime
WORKDIR /app
ARG GIT_COMMIT=unknown
ARG BUILD_TIME=unknown
ENV NODE_ENV=production
ENV PORT=8080
ENV GIT_COMMIT=${GIT_COMMIT}
ENV BUILD_TIME=${BUILD_TIME}

COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/shared/package.json ./shared/package.json
COPY --from=build --chown=node:node /app/shared/dist ./shared/dist
COPY --from=build --chown=node:node /app/server/package.json ./server/package.json
COPY --from=build --chown=node:node /app/server/dist ./server/dist
COPY --from=build --chown=node:node /app/web/dist ./web/dist
COPY --chown=node:node data ./data

USER node
EXPOSE 8080
CMD ["node", "server/dist/main.js"]
