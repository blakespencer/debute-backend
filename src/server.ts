import app from "./app";
import { config } from "./common/config";

const startServer = () => {
  try {
    app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(
        `📊 Analytics API available at http://localhost:${config.port}/api/analytics/revenue`
      );
      console.log(`💚 Health check at http://localhost:${config.port}/health`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
