FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite variables are injected at build time
ARG VITE_BASE44_APP_ID
ARG VITE_BASE44_APP_BASE_URL
ARG VITE_BASE44_FUNCTIONS_VERSION

ENV VITE_BASE44_APP_ID=$VITE_BASE44_APP_ID
ENV VITE_BASE44_APP_BASE_URL=$VITE_BASE44_APP_BASE_URL
ENV VITE_BASE44_FUNCTIONS_VERSION=$VITE_BASE44_FUNCTIONS_VERSION

RUN npm run build

FROM nginx:1.27-alpine AS runner

ARG VITE_BASE44_APP_BASE_URL
ENV BASE44_APP_BASE_URL=$VITE_BASE44_APP_BASE_URL

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80