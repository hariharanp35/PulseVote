FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod go.sum* ./
COPY . .
RUN go mod tidy && go build -o /pulsvote ./cmd/server
FROM alpine:3.20
COPY --from=build /pulsvote /pulsvote
EXPOSE 8080
CMD ["/pulsvote"]
