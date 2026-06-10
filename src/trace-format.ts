import type { Span } from '@opentelemetry/api';

/**
 * Enriches a log object with the active span's trace correlation IDs.
 * Pure and side-effect free so it can be unit-tested without a live SDK:
 * returns the object unchanged when there is no active span, otherwise adds
 * trace_id / span_id / trace_flags from the span context.
 */
export function withTraceContext(
  object: Record<string, unknown>,
  span?: Span
): Record<string, unknown> {
  if (!span) return object;
  const sc = span.spanContext();
  return { ...object, trace_id: sc.traceId, span_id: sc.spanId, trace_flags: sc.traceFlags };
}
