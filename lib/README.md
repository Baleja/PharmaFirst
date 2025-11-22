# Library Directory

This directory contains all core library code and integrations with external services.

## Structure

- **livekit/** - LiveKit integration for real-time voice handling
- **elevenlabs/** - ElevenLabs TTS integration for voice synthesis
- **fal/** - Fal API integration for video generation
- **veed/** - Veed API integration for video post-editing
- **valyu/** - Valyu API integration for medical knowledge search
- **dlt/** - DLT data migration pipelines
- **pharmoutcomes/** - NHS PharmOutcomes API integration
- **db.ts** - Prisma client singleton

## Development Guidelines

1. **Server-side only**: All API keys and secrets must remain server-side
2. **Type safety**: Export TypeScript interfaces for all API responses
3. **Error handling**: Use try-catch and return structured error objects
4. **Logging**: Use the centralized logger from `lib/logger.ts`
5. **Testing**: Write unit tests for all integration logic

## Example Integration Structure

```typescript
// lib/example-service/client.ts
export class ExampleClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async someMethod(): Promise<Result> {
    // Implementation
  }
}

// lib/example-service/types.ts
export interface ExampleResponse {
  // Type definitions
}

// lib/example-service/config.ts
export const exampleConfig = {
  apiKey: process.env.EXAMPLE_API_KEY!,
  baseUrl: "https://api.example.com",
};

// lib/example-service/index.ts
export * from './client';
export * from './types';
export * from './config';
```
