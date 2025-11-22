# LiveKit Voice Agent

This directory contains the LiveKit voice agent implementation using Gemini Live.

## Files

- `livekit-agent.ts` - Main agent entry point using Gemini Realtime API
- `gemini-agent.ts` - Legacy implementation (for reference)

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Environment Variables

Create `.env.local` with:

```bash
# LiveKit (from LiveKit Cloud)
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
LIVEKIT_URL=wss://your-project.livekit.cloud

# Google Gemini (for Realtime API)
GOOGLE_API_KEY=your-google-api-key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pharmafirst
```

### 3. Load LiveKit Credentials

```bash
lk app env -w
```

This automatically loads your LiveKit Cloud credentials.

### 4. Run the Agent

#### Development Mode (connects to LiveKit Cloud)

```bash
pnpm agent:dev
```

#### Production Mode

```bash
pnpm agent:start
```

#### Console Mode (local testing - if supported)

```bash
pnpm agent:console
```

## How It Works

1. **Incoming Call**: When a call comes in via LiveKit SIP, a room is created
2. **Agent Joins**: The agent automatically joins the room
3. **Gemini Realtime**: The agent uses Gemini 2.0 Realtime for speech-to-speech conversation
4. **Language Detection**: Gemini automatically detects the caller's language
5. **Triage Flow**: The system prompt guides the conversation through UTI triage
6. **Database**: Call sessions are tracked in the database

## Configuration

### Model Settings

Edit `livekit-agent.ts` to customize:

- **Model**: `gemini-2.0-realtime-exp` (or other Gemini models)
- **TTS Model**: `gemini-2.5-flash-preview-tts`
- **Voice Tone**: `warm` (can be `professional`, `friendly`)
- **Language**: Auto-detected (fallback: `en-GB`)

### System Prompt

The system prompt is loaded from `lib/prompts/pharmvoice_system.ts`. Edit that file to customize agent behavior.

## Deployment

### Deploy to LiveKit Cloud

```bash
lk agent create
```

This will:
1. Build a Docker image
2. Push to LiveKit Cloud
3. Deploy and register the agent

### Update Agent

```bash
lk agent deploy
```

## Troubleshooting

### Agent Not Starting

1. Check environment variables:
   ```bash
   cat .env.local
   ```

2. Verify Google API key has access to Gemini Realtime API

3. Check LiveKit credentials:
   ```bash
   lk cloud status
   ```

### Language Detection Issues

- Ensure `autoDetectLanguage: true` is set
- Check supported languages in Gemini documentation
- Fallback language is `en-GB` by default

### Database Connection

- Verify `DATABASE_URL` is correct
- Run migrations: `pnpm db:migrate`
- Check Prisma client is generated: `pnpm db:generate`

## Integration with Existing System

The agent integrates with:

- **Call Sessions**: Tracks calls in `CallSession` table
- **Triage System**: Uses system prompt for UTI triage flow
- **Language Detection**: Automatic via Gemini
- **Database**: Saves transcripts and metadata

## Next Steps

1. Test with real calls via LiveKit SIP
2. Monitor agent performance in LiveKit Cloud dashboard
3. Fine-tune system prompt based on real conversations
4. Add more condition-specific triage flows

