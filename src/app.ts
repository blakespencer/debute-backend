import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createAnalyticsRouter } from "./modules/analytics";
import { createShopifyRouter } from "./modules/shopify";
import { createSwapRouter } from "./modules/swap";
import { AppError } from "./common/errors";
import { prisma } from "./common/database";
import { logger } from "./common/logger";

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// Routes
app.use("/analytics", createAnalyticsRouter(prisma));
app.use("/shopify", createShopifyRouter(prisma));
app.use("/swap", createSwapRouter(prisma));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Debug routes for error handling testing (remove in production)
app.get("/debug/test-unhandled-rejection", async (req, res) => {
  // This will trigger an unhandled promise rejection to test our error handlers
  logger.info("🧪 Triggering unhandled promise rejection for testing", {
    module: "debug",
    operation: "test-unhandled-rejection",
  });

  // Create a promise that rejects without being caught
  Promise.reject(
    new Error(
      "Test unhandled promise rejection from /debug/test-unhandled-rejection endpoint"
    )
  );

  res.json({
    message:
      "Unhandled rejection triggered - check server logs for enhanced error details",
  });
});

app.get("/debug/test-uncaught-exception", async (req, res) => {
  // This will trigger an uncaught exception
  logger.info("🧪 Triggering uncaught exception for testing", {
    module: "debug",
    operation: "test-uncaught-exception",
  });

  // Send response first, then throw
  res.json({ message: "Uncaught exception triggered - check server logs" });

  // Trigger uncaught exception after response
  setTimeout(() => {
    throw new Error(
      "Test uncaught exception from /debug/test-uncaught-exception endpoint"
    );
  }, 100);
});

// Error handling
app.use(
  (
    error: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    logger.errorWithUnknown("Unexpected error in Express middleware", error, {
      module: "express",
      operation: "error-handler",
    });
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

export default app;
