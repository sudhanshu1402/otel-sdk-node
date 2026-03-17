"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const api_1 = require("@opentelemetry/api");
const isProduction = process.env.NODE_ENV === 'production';
exports.logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info',
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
            // Inject OpenTelemetry Trace info if available
            const span = api_1.trace.getSpan(api_1.context.active());
            if (span) {
                const spanContext = span.spanContext();
                return {
                    ...object,
                    trace_id: spanContext.traceId,
                    span_id: spanContext.spanId,
                    trace_flags: spanContext.traceFlags,
                };
            }
            return object;
        },
    },
});
//# sourceMappingURL=logger.js.map