# Stage 1: build
# Refs: GUIA §9, issue #8
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (package.json + lock file only — no source yet)
COPY app/package.json app/package-lock.json ./
RUN npm ci --ignore-scripts

# Copy app source and build
COPY app/ .
RUN npm run build

# Stage 2: runtime (Nginx static — PP-6.1: SPA, no SSR)
FROM nginx:1.27-alpine AS runtime

# Remove default Nginx static content
RUN rm -rf /usr/share/nginx/html/*

# Copy Angular build output (outputPath in angular.json: dist/conduit-angular-21/browser)
COPY --from=builder /app/dist/conduit-angular-21/browser /usr/share/nginx/html

# Copy custom Nginx config
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
