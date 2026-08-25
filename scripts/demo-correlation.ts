import type { Span } from '@opentelemetry/api';
import { withTraceContext } from '../src/trace-format';

const span = {
  spanContext: () => ({
    traceId: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    spanId: '1234567890abcdef',
    traceFlags: 1,
  }),
} as unknown as Span;

const log = withTraceContext({ level: 30, msg: 'Processing work inside span' }, span);
console.log(JSON.stringify(log, null, 2));
