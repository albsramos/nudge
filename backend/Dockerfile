# Builds the API into a small image. Migrations are embedded and applied on start.
FROM golang:1.26 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/api ./cmd/api

FROM gcr.io/distroless/static-debian12
COPY --from=build /out/api /bin/api
ENV PORT=8080 MIGRATE_ON_START=true
EXPOSE 8080
ENTRYPOINT ["/bin/api"]
