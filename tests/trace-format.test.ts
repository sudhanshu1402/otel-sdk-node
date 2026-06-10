import { describe, it, expect } from 'vitest';
import { withTraceContext } from '../src/trace-format';

const fakeSpan = (sc: { traceId: string; spanId: string; traceFlags: number }) =>
  ({ spanContext: () => sc }) as any;

describe('withTraceContext', () => {
  it('returns the object unchanged when there is no active span', () => {
    const obj = { level: 30, msg: 'hello' };
    expect(withTraceContext(obj)).toEqual(obj);
  });

  it('injects trace_id / span_id / trace_flags from the active span', () => {
    const out = withTraceContext(
      { msg: 'hi' },
      fakeSpan({ traceId: 'aaaa', spanId: 'bbbb', traceFlags: 1 })
    );
    expect(out).toMatchObject({ msg: 'hi', trace_id: 'aaaa', span_id: 'bbbb', trace_flags: 1 });
  });

  it('does not mutate the input object', () => {
    const obj = { msg: 'x' };
    withTraceContext(obj, fakeSpan({ traceId: 't', spanId: 's', traceFlags: 0 }));
    expect(obj).toEqual({ msg: 'x' });
  });
});
