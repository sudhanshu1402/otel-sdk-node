# Design notes

## Boot order

`initializeTelemetry()` runs at the very top of `src/index.ts`, before Express or anything instrumented gets imported. Auto-instrumentation patches modules on `require`, so anything imported before `sdk.start()` is never patched and its spans silently vanish. This is the bug people spend an afternoon on.

## Correlation is a pure function

Pino's `formatters.log` hook reads the active span context and adds `trace_id`, `span_id`, and `trace_flags` to every log object. The extraction lives in `withTraceContext` (`src/trace-format.ts`) so it's unit-testable without a live SDK, and the logic runs offline in `npm run assets` to produce `assets/demo.svg`.

## Shutdown flushes

`SIGTERM` and `SIGINT` both call `sdk.shutdown()`, so the last batch of spans survives a deploy instead of dying with the process. An unreachable collector would otherwise make `sdk.shutdown()` hang forever, so the drain is capped at `SHUTDOWN_TIMEOUT_MS` (10 seconds, `src/telemetry.ts`) before the process exits anyway; the buffered spans are lost either way, but the HTTP server's in-flight requests aren't held hostage waiting on a dead collector.

## What the tests pin down

- `tests/trace-format.test.ts` covers `withTraceContext`: passthrough with no active span, id injection, immutability, empty ids, and overwriting stale trace fields.
- `tests/swagger.test.ts` pins the OpenAPI doc to the routes actually served in `src/index.ts`, so documenting an endpoint that doesn't exist fails the build.
- `tests/telemetry.test.ts` reads the resource back off the constructed SDK and asserts `telemetry.sdk.*` survives alongside `service.name`, which is the thing SDK 2.x drops silently if you hand it a bare resource.

All three run on Node 20 and 22 in CI, and none of them need a collector running.
