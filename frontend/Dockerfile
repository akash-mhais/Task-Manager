# Stage 1: Build React SPA
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

# Set dynamic API endpoints during compilation if needed (defaults to empty so runtime or host address is used)
ENV VITE_API_URL=/api
ENV VITE_SOCKET_URL=/

RUN npm run build

# Stage 2: Serve using Nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
