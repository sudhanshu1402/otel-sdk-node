import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import * as dotenv from 'dotenv';

dotenv.config();

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
});

const metricExporter = new OTLPMetricExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
});

const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 10000,
});

// Identify this service on every span/metric. Without a resource the collector
// labels everything `unknown_service`, so traces from different services are
// indistinguishable. Env-overridable for multiple deploys off one image.
const resource = new Resource({
  [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'otel-sdk-node',
  [ATTR_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || '1.0.0',
});

export const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader,
  instrumentations: [getNodeAutoInstrumentations()],
});

export const initializeTelemetry = () => {
  sdk.start();
  console.log('🚀 OpenTelemetry SDK Initialized');

  // Flush and shut down cleanly on either termination signal. SIGTERM covers
  // orchestrators (Docker/Kubernetes stop); SIGINT covers a local Ctrl-C. Both
  // must drain buffered spans/metrics before exit or the last batch is lost.
  const shutdown = () => {
    sdk.shutdown()
      .then(() => console.log('OpenTelemetry SDK gracefully shut down'))
      .catch((error) => console.log('Error shutting down OpenTelemetry SDK', error))
      .finally(() => process.exit(0));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
};
