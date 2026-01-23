package main

import (
	"fmt"
	"log"
	"os"

	"graphql/server"
)

func main() {
	// Get port from environment variable or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8001"
	}

	// Print startup message
	fmt.Println("╔═══════════════════════════════════════╗")
	fmt.Println("║   GraphQL Profile Dashboard Server   ║")
	fmt.Println("╚═══════════════════════════════════════╝")
	fmt.Printf("\n🚀 Server starting on port %s...\n", port)
	fmt.Printf("📂 Serving files from: ./static\n")
	fmt.Printf("🌐 Open your browser at: http://localhost:%s\n\n", port)
	fmt.Println("Press Ctrl+C to stop the server")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	// Start the server
	if err := server.Start(port); err != nil {
		log.Fatalf("❌ Failed to start server: %v", err)
	}
}
