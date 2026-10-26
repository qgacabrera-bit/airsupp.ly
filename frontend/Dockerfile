# ==============================================================
# Stage 1: Build Vite PWA with Node.js
# ==============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci || npm install

# Copy application source code
COPY . .

# Build production assets (including sw.js and manifest.webmanifest)
RUN npm run build

# ==============================================================
# Stage 2: Serve with Nginx Alpine and Reverse Proxy /api/
# ==============================================================
FROM nginx:alpine

# Remove default nginx static files
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled PWA assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
