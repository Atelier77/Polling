FROM node:18-alpine AS builder

WORKDIR /app
COPY src/frontend/package*.json ./
RUN npm install

COPY src/frontend/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY src/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]