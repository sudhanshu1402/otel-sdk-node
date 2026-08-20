import { describe, it, expect } from 'vitest';
import { sdk, SHUTDOWN_TIMEOUT_MS } from '../src/telemetry';

// Reading the private resource back is the only proof of what the collector is told.
const attributes = (): Record<string, unknown> =>
  ((sdk as unknown as { _resource: { attributes: Record<string, unknown> } })._resource)
    .attributes;

describe('telemetry resource', () => {
  it('identifies the service', () => {
    expect(attributes()['service.name']).toBe('otel-sdk-node');
    expect(attributes()['service.version']).toBe('1.0.0');
  });

  // SDK 2.x dropped the provider-side merge, so a passed resource loses these.
  it('keeps the SDK defaults alongside them', () => {
    const keys = Object.keys(attributes());
    expect(keys).toContain('telemetry.sdk.language');
    expect(keys).toContain('telemetry.sdk.name');
    expect(keys).toContain('telemetry.sdk.version');
  });
});

describe('shutdown budget', () => {
  it('caps the drain rather than hanging on an unreachable collector', () => {
    expect(SHUTDOWN_TIMEOUT_MS).toBe(10_000);
  });
});
