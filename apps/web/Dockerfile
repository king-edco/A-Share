# Build stage: install dependencies and compile the static bundle.
FROM node:22-alpine AS build

WORKDIR /app

# Vite embeds VITE_* variables at build time. In the Compose stack this is
# set to "/api" so the browser calls stay same-origin and nginx proxies
# them to the api service.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage: serve the static bundle with nginx.
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
