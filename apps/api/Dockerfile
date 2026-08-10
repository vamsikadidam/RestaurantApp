# syntax=docker/dockerfile:1

# ---- Base ----
FROM node:26-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# ---- Development ----
FROM base AS development
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages ./packages
RUN npm install --workspace=apps/api --include-workspace-root
COPY apps/api ./apps/api
WORKDIR /app/apps/api
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# ---- Build ----
FROM base AS build
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages ./packages
RUN npm install --workspace=apps/api --include-workspace-root
COPY apps/api ./apps/api
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

# ---- Production ----
FROM base AS production
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/package.json
RUN npm install --workspace=apps/api --include-workspace-root --omit=dev
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
WORKDIR /app/apps/api
EXPOSE 3000
# Belt-and-suspenders with render.yaml preDeployCommand: always apply
# pending migrations before serving traffic.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
