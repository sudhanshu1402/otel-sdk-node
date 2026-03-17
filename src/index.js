"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const telemetry_1 = require("./telemetry");
// Initialize telemetry before anything else!
(0, telemetry_1.initializeTelemetry)();
const express_1 = __importDefault(require("express"));
const pino_http_1 = __importDefault(require("pino-http"));
const logger_1 = require("./logger");
const api_1 = require("@opentelemetry/api");
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use((0, pino_http_1.default)({ logger: logger_1.logger }));
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
app.get('/', async (req, res) => {
    req.log.info('Handling root request');
    // Custom span example
    const tracer = api_1.trace.getTracer('orchestration-api-tracer');
    await tracer.startActiveSpan('process-root-request', async (span) => {
        span.setAttribute('custom_attribute', 'hello_world');
        // Simulate some work
        await delay(100);
        req.log.info('Processing work inside span...');
        span.addEvent('work_completed', { timestamp: Date.now() });
        span.end();
    });
    res.json({ message: 'Hello from otel-instrumented API!' });
});
app.get('/error', (req, res) => {
    req.log.error('Handling error request');
    res.status(500).json({ error: 'Internal Server Error' });
});
app.listen(port, () => {
    logger_1.logger.info(`Server listening on port ${port}`);
});
//# sourceMappingURL=index.js.map