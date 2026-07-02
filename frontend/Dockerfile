FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Inject OIDC env vars at build time so Vite bakes them into the bundle
ARG VITE_OIDC_AUTHORITY=http://localhost/realms/ai-ui
ARG VITE_OIDC_CLIENT_ID=ai-ui-frontend
ARG VITE_OIDC_REDIRECT_URI=http://localhost/auth/callback
ARG VITE_BFF_BASE_URL=http://localhost
ARG VITE_API_URL=http://localhost
ENV VITE_OIDC_AUTHORITY=$VITE_OIDC_AUTHORITY
ENV VITE_OIDC_CLIENT_ID=$VITE_OIDC_CLIENT_ID
ENV VITE_OIDC_REDIRECT_URI=$VITE_OIDC_REDIRECT_URI
ENV VITE_BFF_BASE_URL=$VITE_BFF_BASE_URL
ENV VITE_API_URL=$VITE_API_URL

EXPOSE 5173
HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=15s \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5173 || exit 1
RUN node_modules/.bin/vite build
CMD ["npm", "run", "preview"]
