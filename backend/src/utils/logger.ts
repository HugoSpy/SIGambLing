import fs from "fs";
import winston from "winston";
import "winston-daily-rotate-file";

fs.mkdirSync("logs", { recursive: true });

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === "production"
          ? logFormat
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp(),
              winston.format.printf(
                ({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`,
              ),
            ),
    }),
    new winston.transports.DailyRotateFile({
      filename: "logs/combined-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "14d",
      maxSize: "50m",
      zippedArchive: true,
    }),
    new winston.transports.DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxFiles: "30d",
      maxSize: "20m",
      zippedArchive: true,
    }),
  ],
});
