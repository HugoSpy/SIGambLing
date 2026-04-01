import path from "node:path";
import winston from "winston";

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
    new winston.transports.File({
      filename: path.resolve(process.cwd(), "combined.log"),
    }),
    new winston.transports.File({
      filename: path.resolve(process.cwd(), "error.log"),
      level: "error",
    }),
  ],
});
