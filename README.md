<div align="center">

<img src="https://raw.githubusercontent.com/sudhanshu1402/otel-sdk-node/main/assets/hero.svg" width="100%" alt="otel-sdk-node as a trace waterfall: GET /checkout with child spans for auth, a Postgres query and a payments API call. A Redis span is missing because the module was imported before sdk.start() and never patched. Every Pino log line is stamped with trace_id and span_id." />

[![CI](https://github.com/sudhanshu1402/otel-sdk-node/actions/workflows/ci.yml/badge.svg)](https://github.com/sudhanshu1402/otel-sdk-node/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

OpenTelemetry wiring for Node services: OTLP/gRPC traces, Pino logs stamped with the trace they happened in, periodic metrics, and a shutdown that actually flushes. Ships with a small Express app that exercises all of it.

It's a thin configuration layer over the official `@opentelemetry/sdk-node`, not a reimplementation. The value is the wiring, which is the part that's easy to get subtly wrong.

## The problem

One request crosses five services. Without trace propagation and correlated logs, debugging it means grepping containers and hoping timestamps line up.

This initializes OpenTelemetry at process boot, auto-instruments HTTP/DB/queue calls, and injects `trace_id` and `span_id` into every log line. One trace ID reconstructs the whole request path, and any log line links back to its span.

## Architecture

```mermaid
graph TB
    App[Node.js App] -->|auto-instrumented spans| SDK[OTel SDK wrapper]
    App -->|structured logs| Logger[Pino logger]
    Logger -->|inject trace_id / span_id| Out[stdout JSON logs]
    SDK -->|OTLP gRPC :4317| Collector[OTel Collector]
    Collector -->|debug exporter| Stdout[Collector stdout]
    Collector -.->|pre-wired, needs API keys| Vendors[Axiom / New Relic / Sentry]

    subgraph "Application process"
        App
        SDK
        Logger
    end

    style SDK fill:#2d3748,color:#fff
    style Collector fill:#4f46e5,color:#fff
```

## Three decisions worth reading

Boot order, why correlation is a pure function, and how shutdown avoids hanging on a dead collector: [docs/DECISIONS.md](docs/DECISIONS.md).

## Run it

```bash
docker-compose up -d     # collector on :4317
npm install
npm run dev
```

```bash
curl http://localhost:3000/
docker-compose logs otel-collector    # spans and metrics land here
```

Routes: `/` opens a custom span, `/ping` echoes the active trace ID, `/error` returns a 500, `/api-docs` serves Swagger UI. Config is environment variables, listed in `.env.example`.

## Proof it runs

![terminal showing the correlation formatter injecting trace_id, span_id and trace_flags into a log line, then npm test passing 23 of 23 with no collector running](https://raw.githubusercontent.com/sudhanshu1402/otel-sdk-node/main/assets/demo.svg)

Both blocks above are captured output, not typed text: `npm run assets` runs `scripts/demo-correlation.ts` and the suite, then writes back what those two commands printed. Run the same command yourself and you get the same lines. No collector or network needed for either.

## Tests

```bash
npm test
```

23 tests across three files: the correlation formatter, the OpenAPI doc pinned to the routes actually served, and the SDK resource attributes. Breakdown in [docs/DECISIONS.md](docs/DECISIONS.md). CI runs all three on Node 20 and 22.

## What it doesn't do

- Exports 100% of spans. Real throughput needs tail-based sampling in the collector.
- One collector container. No HA, no DaemonSet or sidecar topology.
- Axiom, New Relic, and Sentry exporters exist in `otel-collector-config.yaml` but aren't in the active pipelines. Add keys and a pipeline to ship somewhere real.
- No baggage propagation, so tenant id and feature flags don't cross service boundaries yet.

## Related

Drops into any Node service. Wiring it into [distributed-queue-engine](https://github.com/sudhanshu1402/distributed-queue-engine) gives end-to-end traces from API request through enqueue to worker. Longer write-up on the [System Design Portal](https://sudhanshu1402.github.io/system-design-portal/tracing-sdk).

---

<sub>Part of [sudhanshu1402](https://github.com/sudhanshu1402)'s work: [keel](https://github.com/sudhanshu1402/keel) · [nocap](https://github.com/sudhanshu1402/nocap) · [receipts](https://github.com/sudhanshu1402/receipts) · [enterprise-auth-stack](https://github.com/sudhanshu1402/enterprise-auth-stack) · [distributed-queue-engine](https://github.com/sudhanshu1402/distributed-queue-engine) · [multi-region-mongo-patterns](https://github.com/sudhanshu1402/multi-region-mongo-patterns) · **otel-sdk-node** · [llm-assessment-pipeline](https://github.com/sudhanshu1402/llm-assessment-pipeline). Write-ups on the [System Design Portal](https://sudhanshu1402.github.io/system-design-portal/).</sub>

## License

MIT
