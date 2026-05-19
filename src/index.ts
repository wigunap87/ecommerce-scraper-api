import { createServer } from "./interface/server";
import { env } from "./config/environment";

const app = createServer();

const server = app.listen(env.PORT, () => {
  console.log(`[SERVER] Shopee Scraper API running on port ${env.PORT}`);
  console.log(`[SERVER] Environment: ${env.NODE_ENV}`);
  console.log(`[SERVER] Base URL: http://localhost:${env.PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
  });
});
