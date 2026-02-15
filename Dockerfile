# Build stage
FROM node:18-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:18-slim

WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY --from=builder /app/dist ./dist
# Copy data directory if needed for persistence (though volumes are better)
# COPY --from=builder /app/data ./data 

# Install font dependencies for Sharp if needed (Alpine specific)
# RUN apk add --no-cache vips-dev

CMD ["node", "dist/index.js"]
