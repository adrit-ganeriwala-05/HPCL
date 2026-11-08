# One image that serves both the API and the built React site from the same
# origin (the login cookie and the CSRF origin check need that).
# Used by render.yaml; also runs anywhere Docker does:
#   docker build -t hpcl . && docker run -p 10000:10000 -e DATABASE_URL=... -e JWT_SECRET=... -e OTP_PEPPER=... hpcl

# --- 1. Build the React site -------------------------------------------------
FROM node:22-alpine AS web
WORKDIR /client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
# Render passes the service's environment variables in as build args. This
# one is a public OAuth client ID (it ends up in browser JS by design), not
# a secret. Empty = the Google sign-in button hides itself.
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

# --- 2. Build the Go API (+ the admin seed tool) ----------------------------
FROM golang:1.26-alpine AS api
WORKDIR /src
COPY services/api/go.mod services/api/go.sum ./
RUN go mod download
COPY services/api/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server \
 && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/seed ./cmd/seed

# --- 3. Small runtime image --------------------------------------------------
FROM alpine:3.20
# ca-certificates: TLS to Gmail SMTP and Google; tzdata: time zone data.
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=api /out/server /out/seed ./
COPY --from=web /client/dist ./public
# STATIC_DIR makes the API serve the site (see internal/routes/static.go).
# Render sets PORT itself; 10000 is its default and the local fallback here.
ENV STATIC_DIR=/app/public \
    APP_ENV=production \
    GIN_MODE=release \
    PORT=10000
USER nobody
EXPOSE 10000
CMD ["/app/server"]
