# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Docusaurus bakes these into the static output at build time
ARG SITE_URL=http://localhost:3000
ARG BASE_URL=/
ENV SITE_URL=${SITE_URL} \
    BASE_URL=${BASE_URL}

RUN npm run build

# ---- Runtime stage ----
FROM nginx:1.27-alpine
ARG BASE_URL=/
ENV BASE_URL=${BASE_URL}

COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/build /usr/share/nginx/html${BASE_URL}

EXPOSE 80
