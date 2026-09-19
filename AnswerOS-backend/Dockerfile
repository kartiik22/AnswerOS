# ==========================================
# Backend: Express Server & Kafka RAG Worker
# ==========================================
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies needed for native modules / alpine builds
RUN apk add --no-cache python3 make g++

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Expose standard Express port
EXPOSE 8080

# Environment variables default
ENV PORT=8080
ENV NODE_ENV=production

# Start Express Server
CMD ["node", "server.js"]