# PharmVoice Agent (Local Dev)

This directory contains the LiveKit agent implementation for PharmVoice.

## Quick Start

### 1. Set Up Environment Variables

Copy `.env.local.example` to `.env.local` and populate with your credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add:
- `LIVEKIT_URL` - Your LiveKit Cloud URL
- `LIVEKIT_API_KEY` - Your LiveKit API key
- `LIVEKIT_API_SECRET` - Your LiveKit API secret
- `GOOGLE_API_KEY` - Your Google API key (for Gemini)
- OR `GOOGLE_APPLICATION_CREDENTIALS` - Path to Google service account JSON

**Important**: If using service account JSON:
- Save your Google service account JSON in the project root as `google-service-account.json`
- **Never commit this file** - add it to `.gitignore`

### 2. Install Dependencies

```bash
pnpm install
```

This installs:
- `@livekit/agents` - LiveKit Agents SDK
- `@livekit/agents-plugin-google` - Google Gemini plugin
- `dotenv` - Environment variable management
- `tsx` - TypeScript execution

### 3. Run the Agent

```bash
pnpm agent
```

You should see:
```
[pharmvoice] Agent server listening on port 4000
[pharmvoice] Agent ready — it should appear in LiveKit Cloud Agents UI as "pharmvoice"
```

### 4. Configure in LiveKit Cloud

1. Go to https://cloud.livekit.io
2. Navigate to **Agents** section
3. You should see "pharmvoice" listed
4. Create a **Dispatch Rule**:
   - Add "pharmvoice" as the agent name
   - Select your purchased phone number (if using SIP)
   - Save the rule

### 5. Test the Agent

**Option A: Via LiveKit Playground**
- Go to LiveKit Cloud → Agents → Playground
- Start a session with "pharmvoice"
- Speak to test the agent

**Option B: Via Phone Call (if SIP configured)**
- Call your configured phone number
- The agent should answer and start the conversation

## Local Testing Notes

### Public Reachability

For local testing, ensure your local agent is reachable by LiveKit Cloud:

**Option 1: Use ngrok** (Recommended for local dev)
```bash
# Install ngrok
brew install ngrok

# Expose local port
ngrok http 4000

# Update LIVEKIT_URL in .env.local to use ngrok URL
```

**Option 2: Run on Public VM**
- Deploy agent to a publicly accessible server
- Update LIVEKIT_URL accordingly

### Logs

Watch the console logs to confirm:
- Language detection events
- Transcripts from conversations
- Any errors or warnings

Example log output:
```
[pharmvoice] New realtime session started: session-123
[pharmvoice] Realtime model attached.
[pharmvoice] Greeting played.
[pharmvoice] Transcript: { text: 'Hello', is_final: true, ... }
[pharmvoice] Detected language event: { language: 'en', confidence: 0.95 }
```

## Troubleshooting

### Agent Does Not Appear in LiveKit Agents UI

**Check 1: Agent Registration Name**
- Ensure `agent_name` in code equals "pharmvoice"
- Must match exactly (case-sensitive)

**Check 2: Agent Process Running**
- Run `pnpm agent` and watch for errors
- Check that server starts successfully

**Check 3: Firewall / Public Reachability**
- LiveKit Cloud must be able to call your agent server
- Use ngrok if running locally
- Check firewall rules

**Check 4: Credentials**
- Verify `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are correct
- Verify `GOOGLE_API_KEY` or `GOOGLE_APPLICATION_CREDENTIALS` is set
- Check Google API key has Gemini Realtime access enabled

**Check 5: SDK/Plugin Compatibility**
- Ensure versions of `@livekit/agents` and `@livekit/agents-plugin-google` are compatible
- Run `pnpm update` to get latest versions

**Check 6: LiveKit Cloud Console**
- Refresh the Agents list
- Sometimes it takes a few seconds to show new agents
- Check for any error messages in the dashboard

### Common Errors

**"Failed to attach realtime model"**
- Check Google API credentials
- Verify Gemini Realtime API is enabled
- Check API quota/limits

**"Agent server failed to start"**
- Check port 4000 is not in use
- Change `AGENT_PORT` in `.env.local` if needed
- Check for missing dependencies

**"Module not found"**
- Run `pnpm install` again
- Check `node_modules` exists
- Verify TypeScript compilation

## Development

### File Structure

```
agents/
  ├── pharmvoiceAgent.ts    # Main agent implementation
  └── README.md             # This file
```

### Customization

**Change Agent Name**
- Edit `AGENT_NAME` constant in `pharmvoiceAgent.ts`
- Update dispatch rule in LiveKit Cloud to match

**Modify System Prompt**
- Edit the `model.systemPrompt` string in `pharmvoiceAgent.ts`
- Restart agent to apply changes

**Add Triage Logic**
- Implement state machine in transcript handler
- Call external triage worker functions
- Persist data to database

**Add Database Integration**
- Import database client
- Save transcripts and call sessions
- Track language detection results

## Production Deployment

For production, use LiveKit Cloud deployment:

```bash
lk agent create
```

This builds and deploys your agent to LiveKit Cloud infrastructure.

See `../DEPLOYMENT_GUIDE.md` for full deployment instructions.

## Next Steps

1. ✅ Test agent in playground
2. ✅ Set up SIP integration for phone calls
3. ✅ Add database persistence for transcripts
4. ✅ Implement full UTI triage state machine
5. ✅ Add monitoring and logging
6. ✅ Deploy to production

## Resources

- [LiveKit Agents Docs](https://docs.livekit.io/agents/)
- [Google Gemini API](https://ai.google.dev/gemini-api/docs/realtime)
- [LiveKit Cloud Dashboard](https://cloud.livekit.io)

