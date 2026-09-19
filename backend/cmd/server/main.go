package main

import (
	"context"
	"log"
	"os"

	"github.com/joho/godotenv"
	"pulsvote/backend/internal/app"
)

func main() {
	_ = godotenv.Load()
	ctx := context.Background()
	server, cleanup, err := app.New(ctx)
	if err != nil { log.Fatal(err) }
	defer cleanup()
	port := os.Getenv("PORT")
	if port == "" { port = "8080" }
	log.Printf("PulseVote API listening on :%s", port)
	if err := server.Run(":" + port); err != nil { log.Fatal(err) }
}
