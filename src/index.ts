import { initializeTelemetry } from './telemetry';
// Initialize telemetry before anything else!
initializeTelemetry();

import express from 'express';
import pinoHttp from 'pino-http';
import { logger } from './logger';
import { trace } from '@opentelemetry/api';

const app = express();
const port = process.env.PORT || 3000;

app.use(pinoHttp({ logger }));

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

app.get('/', async (req, res) => {
  req.log.info('Handling root request');
  
  // Custom span example
  const tracer = trace.getTracer('orchestration-api-tracer');
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
  logger.info(`Server listening on port ${port}`);
});
