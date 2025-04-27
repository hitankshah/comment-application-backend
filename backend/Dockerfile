# Build stage
FROM node:20-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

ENV NODE_ENV=production

WORKDIR /usr/src/app

# Install curl for healthcheck
RUN apk add --no-cache curl

COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/dist ./dist

RUN npm install --only=production

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
USER nestjs

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://0.0.0.0:3000/health || exit 1

# Ensure we're listening on all interfaces
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["node", "dist/main"]
