export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'OpenTelemetry Node.js SDK Demo API',
    version: '1.0.0',
    description: 'Demonstrates distributed tracing auto-instrumentation and structured log correlation.',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local server',
    },
  ],
  paths: {
    '/ping': {
      get: {
        summary: 'Health check endpoint',
        responses: {
          '200': {
            description: 'Successful response',
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
  },
};
