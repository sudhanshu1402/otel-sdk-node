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

// An unreachable collector makes sdk.shutdown() hang, so the drain is capped.
// The spans are lost either way; hanging until SIGKILL also drops the HTTP
// server's in-flight requests.
export const SHUTDOWN_TIMEOUT_MS = 10_000;

const preShutdownHooks: Array<() => Promise<void>> = [];

// Register work that must finish before spans are flushed — closing the HTTP
// listener, so no new request starts a span the exporter will never send.
export const onBeforeShutdown = (hook: () => Promise<void>) => {
  preShutdownHooks.push(hook);
};

const withTimeout = async (work: Promise<unknown>, label: string): Promise<void> => {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} did not settle in ${SHUTDOWN_TIMEOUT_MS}ms`)),
          SHUTDOWN_TIMEOUT_MS
        );
        timer.unref?.();
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export const initializeTelemetry = () => {
  sdk.start();
  console.log('🚀 OpenTelemetry SDK Initialized');

  // Flush and shut down cleanly on either termination signal. SIGTERM covers
  // orchestrators (Docker/Kubernetes stop); SIGINT covers a local Ctrl-C. Both
  // must drain buffered spans/metrics before exit or the last batch is lost.
  const shutdown = async () => {
    let code = 0;
    for (const hook of preShutdownHooks) {
      try {
        await withTimeout(hook(), 'pre-shutdown hook');
      } catch (error) {
        console.error('Pre-shutdown hook failed', error);
        code = 1;
      }
    }
    try {
      await withTimeout(sdk.shutdown(), 'sdk.shutdown()');
      console.log('OpenTelemetry SDK gracefully shut down');
    } catch (error) {
      console.error('Error shutting down OpenTelemetry SDK', error);
      code = 1;
    }
    process.exit(code);
  };
  process.once('SIGTERM', () => void shutdown());
  process.once('SIGINT', () => void shutdown());
};
