import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { AnalyticsController } from "./modules/analytics/analytics.controller";
import { AppError } from "./common/errors";

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// Controllers
const analyticsController = new AnalyticsController();

// Routes
app.get("/api/analytics/revenue", analyticsController.getRevenue);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
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

    console.error("Unexpected error:", error);
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
