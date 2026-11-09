# ── Nowhere Esports Intranet Sensor Dockerfile ──
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package.json ./
RUN npm install

# Copy application source & configs
COPY tsconfig.json ./
COPY src/ ./src/
COPY public/ ./public/
COPY scripts/ ./scripts/

# Copy honeypot rules config so builder can reference it
COPY configs/ /configs/

# Build TypeScript & copy view/public assets
RUN npm run build

# ── Production Runner ──
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV RULES_PATH=/configs/honeypot-rules.yaml

# Copy dependencies
COPY package.json ./
RUN npm install --omit=dev

# Copy compiled artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /configs /configs

EXPOSE 3000

CMD ["node", "dist/server.js"]

