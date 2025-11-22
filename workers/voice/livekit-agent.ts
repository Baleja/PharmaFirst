/**
 * LiveKit Voice Agent with Gemini Live
 * Uses Google's Gemini Realtime API via LiveKit Agents plugin
 */

import { AgentServer, JobContext } from '@livekit/agents';
import { RealtimeModel } from '@livekit/agents-plugin-google/beta/realtime';
import { getSystemPrompt } from '@/lib/prompts/pharmvoice_system';
import { db } from '@/lib/db';
import { CallStatus } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const server = new AgentServer();

/**
 * RTC Session Handler
 * Called when a new call/room session starts
 */
server.rtc_session({ agent_name: 'pharmvoice-telephony-agent' }, async (ctx: JobContext) => {
  console.log(`[Agent] New session started: ${ctx.room.name}`);

  try {
    // Extract call session ID from room name or metadata
    const roomName = ctx.room.name;
    const callSessionMatch = roomName.match(/call_(.+?)_/);
    const callSessionId = callSessionMatch?.[1];

    let orgId: string | undefined;
    let pharmacyName = 'the pharmacy';

    // Load call session from database if available
    if (callSessionId) {
      try {
        const callSession = await db.callSession.findUnique({
          where: { id: callSessionId },
          include: {
            organization: true,
            patient: true,
          },
        });

        if (callSession) {
          orgId = callSession.orgId;
          pharmacyName = callSession.organization.name || pharmacyName;

          // Update call session status
          await db.callSession.update({
            where: { id: callSessionId },
            data: {
              status: CallStatus.IN_PROGRESS,
              metadata: {
                ...(callSession.metadata as Record<string, any>),
                agentStarted: true,
                startedAt: new Date().toISOString(),
              },
            },
          });

          console.log(`[Agent] Call session ${callSessionId} loaded for org ${orgId}`);
        }
      } catch (error) {
        console.error(`[Agent] Error loading call session:`, error);
        // Continue without call session - agent will still work
      }
    }

    // Create Gemini Realtime model
    const model = new RealtimeModel({
      // Gemini model
      model: 'gemini-2.0-realtime-exp',
      
      // Enable audio and text modalities
      modalities: ['audio', 'text'] as const,
      
      // TTS configuration
      tts: {
        model: 'gemini-2.5-flash-preview-tts',
      },
      
      // Language auto-detection and voice options
      options: {
        autoDetectLanguage: true,
        fallbackLanguage: 'en-GB',
        tone: 'warm',
        style: 'warm',
      },
    });

    // Set system prompt with pharmacy-specific instructions
    model.systemPrompt = getSystemPrompt(pharmacyName);

    // Bind model to the realtime job context
    // LiveKit will handle streaming audio in/out, transcription, etc.
    await ctx.attachRealtimeModel(model);

    console.log(`[Agent] Gemini Realtime model attached to session ${ctx.room.name}`);

    // Optional: Send initial greeting
    // The model will automatically greet when it detects speech
    // But we can trigger an initial message if needed
    // await model.sendMessage("Hello, thank you for calling. How can I help you today?");

    // Handle session end - save transcript and update call session
    ctx.on('disconnected', async () => {
      console.log(`[Agent] Session ended: ${ctx.room.name}`);
      
      if (callSessionId) {
        try {
          // Get final transcript from model (if available)
          // Note: The exact API may vary - check LiveKit plugin docs
          const transcript = model.getTranscript?.() || [];

          await db.callSession.update({
            where: { id: callSessionId },
            data: {
              status: CallStatus.COMPLETED,
              endTime: new Date(),
              transcript: {
                messages: transcript,
                language: 'auto-detected',
              },
              resolution: 'triage_completed',
            },
          });

          console.log(`[Agent] Call session ${callSessionId} completed`);
        } catch (error) {
          console.error(`[Agent] Error completing call session:`, error);
        }
      }
    });

    // Handle errors
    ctx.on('error', (error) => {
      console.error(`[Agent] Error in session ${ctx.room.name}:`, error);
      
      if (callSessionId) {
        db.callSession.update({
          where: { id: callSessionId },
          data: {
            status: CallStatus.FAILED,
            metadata: {
              error: error.message,
            },
          },
        }).catch(console.error);
      }
    });

  } catch (error) {
    console.error(`[Agent] Fatal error in session ${ctx.room.name}:`, error);
    throw error;
  }
});

/**
 * Start the agent server
 */
server.listen().then(() => {
  console.log('[Agent] PharmVoice agent server started');
  console.log('[Agent] Waiting for incoming calls...');
}).catch((error) => {
  console.error('[Agent] Failed to start server:', error);
  process.exit(1);
});
