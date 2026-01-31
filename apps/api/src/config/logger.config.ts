import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

const logDir = process.env.LOG_DIR || 'logs';

/**
 * Winston logger configuration for Torre Tempo API
 * Features:
 * - Daily log rotation with 30-day retention
 * - JSON format for production (easy parsing)
 * - Colored console output for development
 * - Separate files for errors and general logs
 */
export const loggerConfig: WinstonModuleOptions = {
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  ),
  defaultMeta: {
    service: 'torre-tempo-api',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console output (always enabled)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf((info: winston.Logform.TransformableInfo) => {
          const { timestamp, level, message, context, ...meta } = info;
          const contextStr = context ? `[${String(context)}]` : '';
          const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
          return `${String(timestamp)} ${String(level)} ${contextStr} ${String(message)} ${metaStr}`;
        }),
      ),
    }),

    // Application logs - daily rotation, keep 30 days
    new winston.transports.DailyRotateFile({
      dirname: logDir,
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      maxSize: '20m',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),

    // Error logs - separate file for easier monitoring
    new winston.transports.DailyRotateFile({
      dirname: logDir,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      maxSize: '20m',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),

    // Audit logs - keep for 5 years for Spanish labor law compliance
    new winston.transports.DailyRotateFile({
      dirname: `${logDir}/audit`,
      filename: 'audit-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '1825d', // 5 years
      maxSize: '50m',
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
  exceptionHandlers: [
    new winston.transports.DailyRotateFile({
      dirname: logDir,
      filename: 'exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
    }),
  ],
  rejectionHandlers: [
    new winston.transports.DailyRotateFile({
      dirname: logDir,
      filename: 'rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
    }),
  ],
};
