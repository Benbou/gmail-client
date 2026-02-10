# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ ./

ARG VITE_API_URL=""
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

# Stage 2: Build server
FROM node:20-alpine AS server-build
WORKDIR /app/server

COPY server/package.json server/package-lock.json* ./
RUN npm ci

COPY server/ ./
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app

# Copy server dist
COPY --from=server-build /app/server/dist ./dist
COPY --from=server-build /app/server/package.json ./
COPY --from=server-build /app/server/package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy frontend build into public/ (served by Express)
COPY --from=frontend-build /app/frontend/dist ./public

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

CMD ["node", "dist/index.js"]
