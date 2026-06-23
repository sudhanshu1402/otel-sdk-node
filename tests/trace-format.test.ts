import { describe, it, expect } from 'vitest';
import type { Span, SpanContext } from '@opentelemetry/api';
import { withTraceContext } from '../src/trace-format';

// Builds a minimal fake Span exposing only spanContext(), which is all
// withTraceContext consumes. Avoids needing a live OpenTelemetry SDK.
const fakeSpan = (sc: Partial<SpanContext>): Span =>
  ({ spanContext: () => sc as SpanContext }) as unknown as Span;

describe('withTraceContext', () => {
  describe('no active span', () => {
    it('returns the same object reference when span is undefined', () => {
      const obj = { level: 30, msg: 'hello' };
      const out = withTraceContext(obj);
      expect(out).toBe(obj);
    });

    it('returns the same object reference when span is omitted (empty object)', () => {
      const obj = {};
      expect(withTraceContext(obj)).toBe(obj);
    });

    it('does not add any trace fields when there is no span', () => {
      const out = withTraceContext({ msg: 'x' });
      expect(out).not.toHaveProperty('trace_id');
      expect(out).not.toHaveProperty('span_id');
      expect(out).not.toHaveProperty('trace_flags');
    });
  });

  describe('with an active span', () => {
    it('injects trace_id / span_id / trace_flags from the span context', () => {
      const out = withTraceContext(
        { msg: 'hi' },
        fakeSpan({ traceId: 'aaaa', spanId: 'bbbb', traceFlags: 1 })
      );
      expect(out).toEqual({
        msg: 'hi',
        trace_id: 'aaaa',
        span_id: 'bbbb',
        trace_flags: 1,
      });
    });

    it('preserves all pre-existing keys on the object', () => {
      const out = withTraceContext(
        { level: 50, msg: 'boom', nested: { a: 1 }, count: 0 },
        fakeSpan({ traceId: 't1', spanId: 's1', traceFlags: 1 })
      );
      expect(out).toMatchObject({ level: 50, msg: 'boom', nested: { a: 1 }, count: 0 });
    });

    it('returns a new object rather than mutating the input', () => {
      const obj = { msg: 'x' };
      const out = withTraceContext(obj, fakeSpan({ traceId: 't', spanId: 's', traceFlags: 0 }));
      expect(out).not.toBe(obj);
      expect(obj).toEqual({ msg: 'x' });
    });

    it('handles a full-length real-world 32-char trace id and 16-char span id', () => {
      const traceId = '4bf92f3577b34da6a3ce929d0e0e4736';
      const spanId = '00f067aa0ba902b7';
      const out = withTraceContext({ msg: 'request' }, fakeSpan({ traceId, spanId, traceFlags: 1 }));
      expect(out.trace_id).toBe(traceId);
      expect(out.span_id).toBe(spanId);
    });

    it('passes through trace ids/span ids verbatim without padding or reformatting', () => {
      // The formatter must not normalize ids; it copies the context as-is.
      const out = withTraceContext({}, fakeSpan({ traceId: '1', spanId: '2', traceFlags: 1 }));
      expect(out.trace_id).toBe('1');
      expect(out.span_id).toBe('2');
    });
  });

  describe('edge cases', () => {
    it('copies an all-zero trace id, span id and zero trace flags (sampled-out span)', () => {
      const out = withTraceContext(
        { msg: 'unsampled' },
        fakeSpan({
          traceId: '00000000000000000000000000000000',
          spanId: '0000000000000000',
          traceFlags: 0,
        })
      );
      expect(out).toMatchObject({
        trace_id: '00000000000000000000000000000000',
        span_id: '0000000000000000',
        trace_flags: 0,
      });
    });

    it('keeps trace_flags as the numeric 0 value, not dropped as falsy', () => {
      const out = withTraceContext({}, fakeSpan({ traceId: 't', spanId: 's', traceFlags: 0 }));
      expect(out).toHaveProperty('trace_flags', 0);
      expect(typeof out.trace_flags).toBe('number');
    });

    it('preserves empty-string ids exactly as provided by the context', () => {
      const out = withTraceContext({}, fakeSpan({ traceId: '', spanId: '', traceFlags: 1 }));
      expect(out.trace_id).toBe('');
      expect(out.span_id).toBe('');
    });

    it('overwrites pre-existing trace fields on the object with span values', () => {
      const out = withTraceContext(
        { trace_id: 'stale', span_id: 'stale', trace_flags: 99 },
        fakeSpan({ traceId: 'fresh-trace', spanId: 'fresh-span', traceFlags: 1 })
      );
      expect(out).toMatchObject({
        trace_id: 'fresh-trace',
        span_id: 'fresh-span',
        trace_flags: 1,
      });
    });

    it('reads the span context fresh on each call (calls spanContext per invocation)', () => {
      let calls = 0;
      const span = {
        spanContext: () => {
          calls += 1;
          return { traceId: 't', spanId: 's', traceFlags: 1 } as SpanContext;
        },
      } as unknown as Span;
      withTraceContext({}, span);
      withTraceContext({}, span);
      expect(calls).toBe(2);
    });
  });
});
