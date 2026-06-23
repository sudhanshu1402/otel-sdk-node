import { describe, it, expect } from 'vitest';
import { swaggerDocument } from '../src/swagger';

// swaggerDocument is a pure static OpenAPI definition. These tests pin its
// shape so accidental edits that break the spec are caught at build/test time.
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

  it('documents the GET /ping health-check endpoint', () => {
    const ping = swaggerDocument.paths['/ping'];
    expect(ping).toBeDefined();
    expect(ping.get).toBeDefined();
    expect(ping.get.summary).toMatch(/health/i);
  });

  it('defines a 200 JSON response with status and traceId properties', () => {
    const ok = swaggerDocument.paths['/ping'].get.responses['200'];
    const schema = ok.content['application/json'].schema;
    expect(schema.type).toBe('object');
    expect(schema.properties.status.type).toBe('string');
    expect(schema.properties.traceId.type).toBe('string');
  });

  it('only documents paths that have been intentionally defined', () => {
    expect(Object.keys(swaggerDocument.paths)).toEqual(['/ping']);
  });
});
