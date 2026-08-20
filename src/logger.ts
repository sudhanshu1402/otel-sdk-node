import pino from 'pino';
import { trace, context } from '@opentelemetry/api';
import { withTraceContext } from './trace-format';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',

  // pino-http's default serializers keep the whole header bag, so without this
  // every request logs Authorization and Cookie at info level.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["proxy-authorization"]',
      'req.headers["x-api-key"]',
      'res.headers["set-cookie"]',
    ],
    censor: '[redacted]',
  },

  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
          },
        },
      }),

  formatters: {
    log(object) {
      // Inject OpenTelemetry trace correlation IDs if a span is active.
      return withTraceContext(object, trace.getSpan(context.active()));
    },
  },
});
