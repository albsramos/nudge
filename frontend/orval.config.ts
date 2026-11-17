import { defineConfig } from 'orval';

// The backend owns the contract: this reads the swagger file swag generates from the Go handlers.
export default defineConfig({
  api: {
    input: { target: '../backend/api/swagger.json' },
    output: {
      target: 'src/shared/api/generated',
      schemas: 'src/shared/api/generated/model',
      mode: 'tags-split',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      mock: { generators: [{ type: 'msw', useExamples: true }] },
      override: {
        mutator: { path: 'src/shared/api/http.ts', name: 'http' },
        fetch: { includeHttpResponseReturnType: false },
      },
    },
  },
});
