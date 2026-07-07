import { describe, it, expect } from 'vitest';
import { swaggerDocument } from '../src/swagger';

// swaggerDocument is a pure static OpenAPI definition describing the routes
// served in src/index.ts. These tests pin its shape so a doc/route drift
// (documenting an endpoint that doesn't exist, or vice versa) is caught here.
describe('swaggerDocument', () => {
  it('declares an OpenAPI 3.0.0 document', () => {
    expect(swaggerDocument.openapi).toBe('3.0.0');
  });

  it('carries non-empty title, version and description metadata', () => {
    expect(swaggerDocument.info.title.length).toBeGreaterThan(0);
    expect(swaggerDocument.info.version).toBe('1.0.0');
    expect(swaggerDocument.info.description.length).toBeGreaterThan(0);
  });

  it('lists exactly one local server pointing at port 3000', () => {
    expect(swaggerDocument.servers).toHaveLength(1);
    expect(swaggerDocument.servers[0].url).toBe('http://localhost:3000');
  });

  it('documents exactly the routes served by the app (/, /ping, /error)', () => {
    expect(Object.keys(swaggerDocument.paths).sort()).toEqual(['/', '/error', '/ping']);
  });

  it('documents the traced root endpoint returning a message', () => {
    const root = swaggerDocument.paths['/'].get;
    expect(root.summary).toMatch(/root/i);
    const schema = root.responses['200'].content['application/json'].schema;
    expect(schema.properties.message.type).toBe('string');
  });

  it('documents the /ping health check with status and traceId', () => {
    const ping = swaggerDocument.paths['/ping'].get;
    expect(ping.summary).toMatch(/health/i);
    const schema = ping.responses['200'].content['application/json'].schema;
    expect(schema.properties.status.type).toBe('string');
    expect(schema.properties.traceId.type).toBe('string');
  });

  it('documents the /error endpoint with a 500 response', () => {
    const err = swaggerDocument.paths['/error'].get;
    const schema = err.responses['500'].content['application/json'].schema;
    expect(schema.properties.error.type).toBe('string');
  });
});
