import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3000"),
  databaseUrl:
    process.env.DATABASE_URL || "postgresql://localhost:5432/analytics_db",
  nodeEnv: process.env.NODE_ENV || "development",
};
