FROM node:20-alpine AS web-builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /src

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/react/package.json packages/react/package.json

RUN pnpm install --frozen-lockfile

COPY apps/web/scripts/build-client.mjs apps/web/scripts/build-client.mjs
COPY apps/web/src/lib/client.js apps/web/src/lib/client.js
COPY packages/core packages/core

RUN pnpm core:build && pnpm --dir apps/web exec node ./scripts/build-client.mjs

FROM golang:1.22-alpine AS api-builder

WORKDIR /src/apps/api

COPY apps/api/go.mod apps/api/go.sum ./
COPY apps/api/main.go ./main.go
COPY apps/api/internal ./internal

RUN CGO_ENABLED=0 GOOS=linux go build -o /out/vercount-api .

FROM alpine:3.21

RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY --from=api-builder /out/vercount-api /app/vercount-api
COPY --from=web-builder /src/apps/web/public/js/client.min.js /app/public/js/client.min.js

ENV PORT=8080

EXPOSE 8080

CMD ["/app/vercount-api"]
