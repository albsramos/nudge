# The reminder server (backend/), built from the repository root so hosts like Railway find it with no settings.
# Migrations are embedded and applied on start.
FROM golang:1.24 AS build
WORKDIR /src
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
RUN CGO_ENABLED=0 go build -o /out/api ./cmd/api

FROM gcr.io/distroless/static-debian12
COPY --from=build /out/api /bin/api
ENV PORT=8080 MIGRATE_ON_START=true
EXPOSE 8080
ENTRYPOINT ["/bin/api"]
