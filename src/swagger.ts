// OpenAPI definition for the demo API. Kept in sync with the routes actually
// served in src/index.ts ('/', '/ping', '/error'); tests/swagger.test.ts pins
// the path set so a route/doc drift is caught at test time.
export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'OpenTelemetry Node.js Demo API',
    version: '1.0.0',
    description:
      'Demonstrates distributed-tracing auto-instrumentation and trace-correlated structured logging.',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local server',
    },
  ],
  paths: {
    '/': {
      get: {
        summary: 'Traced root endpoint',
        description: 'Opens a custom span, does simulated work, and returns a greeting.',
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/ping': {
      get: {
        summary: 'Health check endpoint',
        responses: {
          '200': {
            description: 'Service is healthy; echoes the active trace id',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    traceId: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/error': {
      get: {
        summary: 'Error endpoint for exercising error spans',
        responses: {
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
