# Build stage
FROM node:20-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app
COPY package*.json ./
RUN npm install --production
# Force install sharp for Linux x64
RUN npm install --include=optional --platform=linux --arch=x64 sharp

COPY --from=builder /app/dist ./dist
# Create data directory explicitly
RUN mkdir -p data
# Copy data directory if needed for persistence (though volumes are better)
# COPY --from=builder /app/data ./data 

# Install font dependencies for Sharp if needed (Alpine specific)
# RUN apk add --no-cache vips-dev

CMD ["node", "dist/index.js"]
