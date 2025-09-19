import app from "./app";
import { config } from "./common/config";
import { logger } from "./common/logger";

// Process-level error handlers to catch silent crashes
process.on('unhandledRejection', (reason, promise) => {
  logger.error('🔥 UNHANDLED PROMISE REJECTION DETECTED', {
    module: 'process',
    operation: 'unhandled-rejection',
    error: reason instanceof Error ? reason : new Error(String(reason)),
    promise: String(promise),
    reason: reason,
    guidance: 'Add try/catch blocks or .catch() handlers to the function that created this promise'
  });

  // Don't exit in development, but log the full error
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  logger.error('💥 UNCAUGHT EXCEPTION DETECTED', {
    module: 'process',
    operation: 'uncaught-exception',
    error: error,
    severity: 'CRITICAL',
    fileLine: error.stack?.split('\n')[1]?.trim(),
    guidance: 'Add try/catch blocks around the problematic code - this is more serious than unhandled rejections'
  });

  // Give the server a chance to respond to pending requests
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});


// Verify required environment variables
const requiredEnvVars = ['SWAP_STORE_ID', 'SWAP_API_KEY', 'DATABASE_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  logger.error('❌ Missing required environment variables', {
    module: 'startup',
    operation: 'env-validation',
    missingVariables: missingVars
  });
  process.exit(1);
}

const startServer = () => {
  try {
    app.listen(config.port, () => {
      logger.info('🚀 Server started successfully', {
        module: 'startup',
        operation: 'server-start',
        port: config.port,
        environment: process.env.NODE_ENV || 'development'
      });
    });
  } catch (error) {
    logger.errorWithUnknown("Failed to start server", error, { module: 'startup', operation: 'server-start' });
    process.exit(1);
  }
};

startServer();
