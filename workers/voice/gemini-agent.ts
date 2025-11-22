/**
 * Gemini Voice Agent Worker
 * Handles real-time voice conversations using Gemini Realtime API
 * Integrates with LiveKit for audio streaming
 */

import { createRealtimeConnection, setSystemPrompt, getVoiceConfigForLanguage } from '@/lib/gemini/realtime';
import { getSystemPrompt, getGreetingForLanguage } from '@/lib/prompts/pharmvoice_system';
import { detectLanguage, LanguageDetectionResult } from '@/lib/gemini/realtime';
import { getPreferredLanguage } from '@/lib/voice/languageDetection';
import { createTriageStateMachine, TriageEvent } from '@/lib/triage/stateMachine';
import { processUTITriage, extractSymptomsFromTranscript } from '@/workers/triage/uti';
import { db } from '@/lib/db';
import { CallStatus } from '@prisma/client';

export interface VoiceAgentConfig {
  callSessionId: string;
  roomName: string;
  agentToken: string;
  orgId: string;
  pharmacyName?: string;
}

export interface AgentState {
  callSessionId: string;
  language?: string;
  transcript: string[];
  triageState: any;
  patientId?: string;
}

/**
 * Gemini Voice Agent
 * Manages the complete voice conversation flow
 */
export class GeminiVoiceAgent {
  private config: VoiceAgentConfig;
  private state: AgentState;
  private geminiConnection: any;
  private triageMachine: any;

  constructor(config: VoiceAgentConfig) {
    this.config = config;
    this.state = {
      callSessionId: config.callSessionId,
      transcript: [],
      triageState: null,
    };
  }

  /**
   * Initialize the agent and connect to Gemini Realtime
   */
  async initialize(): Promise<void> {
    try {
      // Get call session
      const callSession = await db.callSession.findUnique({
        where: { id: this.config.callSessionId },
        include: { patient: true, organization: true },
      });

      if (!callSession) {
        throw new Error(`Call session ${this.config.callSessionId} not found`);
      }

      // Determine language preference
      const preferredLanguage = getPreferredLanguage(
        callSession.metadata as Record<string, any>,
        callSession.patient?.preferredLanguage
      );

      // Create Gemini Realtime connection with language auto-detection
      const voiceConfig = getVoiceConfigForLanguage(preferredLanguage);
      this.geminiConnection = await createRealtimeConnection({
        autoDetectLanguage: true,
        fallbackLanguage: preferredLanguage,
        voiceStyle: voiceConfig.style as any,
        speed: voiceConfig.speed,
      });

      // Set system prompt
      const systemPrompt = getSystemPrompt(
        callSession.organization.name || this.config.pharmacyName || 'the pharmacy'
      );
      await setSystemPrompt(this.geminiConnection, systemPrompt);

      // Initialize triage state machine
      this.triageMachine = await import('@/lib/triage/stateMachine').then((m) =>
        m.createTriageStateMachine({
          language: preferredLanguage,
          metadata: {
            orgId: this.config.orgId,
            callSessionId: this.config.callSessionId,
          },
        })
      );

      // Update call session status
      await db.callSession.update({
        where: { id: this.config.callSessionId },
        data: {
          status: CallStatus.IN_PROGRESS,
          metadata: {
            ...(callSession.metadata as Record<string, any>),
            agentInitialized: true,
            language: preferredLanguage,
          },
        },
      });

      // Send initial greeting
      const greeting = getGreetingForLanguage(preferredLanguage);
      await this.sendMessage(greeting);
    } catch (error) {
      console.error('Error initializing Gemini voice agent:', error);
      throw error;
    }
  }

  /**
   * Process incoming audio from LiveKit
   */
  async processAudio(audioChunk: Buffer): Promise<void> {
    try {
      // Detect language from first utterance if not already detected
      if (!this.state.language) {
        const detection = await detectLanguage(audioChunk);
        this.state.language = detection.language;
        this.triageMachine.setLanguage(detection.language);

        // Update call session with detected language
        await db.callSession.update({
          where: { id: this.config.callSessionId },
          data: {
            metadata: {
              detectedLanguage: detection.language,
            },
          },
        });
      }

      // Stream audio to Gemini and get response
      const response = await this.streamToGemini(audioChunk);

      if (response.text) {
        // Append to transcript
        this.state.transcript.push(response.text);

        // Update call session transcript
        await this.updateTranscript();

        // Process triage logic based on conversation
        await this.processTriageLogic(response.text);
      }

      if (response.audio) {
        // Stream audio response back to LiveKit room
        await this.sendAudio(response.audio);
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      throw error;
    }
  }

  /**
   * Stream audio to Gemini Realtime
   */
  private async streamToGemini(audioChunk: Buffer): Promise<{
    text?: string;
    audio?: Buffer;
    language?: string;
  }> {
    // TODO: Implement actual Gemini Realtime streaming
    // This would use the gemini connection to send audio and receive response
    const { streamAudioToGemini } = await import('@/lib/gemini/realtime');
    return streamAudioToGemini(this.geminiConnection, audioChunk);
  }

  /**
   * Send text message (will be converted to speech by Gemini)
   */
  private async sendMessage(text: string): Promise<void> {
    // TODO: Send text message to Gemini Realtime
    // Gemini will convert to speech and stream audio back
    console.log('Sending message:', text);
  }

  /**
   * Send audio to LiveKit room
   */
  private async sendAudio(audio: Buffer): Promise<void> {
    // TODO: Stream audio to LiveKit room
    // This would publish audio track to the room
    console.log('Sending audio chunk:', audio.length, 'bytes');
  }

  /**
   * Update call session transcript
   */
  private async updateTranscript(): Promise<void> {
    await db.callSession.update({
      where: { id: this.config.callSessionId },
      data: {
        transcript: {
          messages: this.state.transcript,
          language: this.state.language,
        },
      },
    });
  }

  /**
   * Process triage logic based on conversation
   */
  private async processTriageLogic(transcriptText: string): Promise<void> {
    const currentState = this.triageMachine.getState();
    const transcriptLower = transcriptText.toLowerCase();

    // Identity verification detection
    if (currentState === 'IDENTITY_VERIFICATION') {
      // Extract name and DOB from transcript (simplified - use NLP in production)
      const nameMatch = transcriptText.match(/(?:name is|i'm|i am|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
      const dobMatch = transcriptText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);

      if (nameMatch && dobMatch) {
        const event: TriageEvent = {
          type: 'IDENTITY_VERIFIED',
          data: {
            name: nameMatch[1],
            dob: dobMatch[1],
          },
        };
        this.triageMachine.processEvent(event);
      }
    }

    // Symptom assessment
    if (currentState === 'SYMPTOM_ASSESSMENT') {
      const { symptoms, redFlags } = extractSymptomsFromTranscript(transcriptText);

      if (redFlags.length > 0) {
        // Immediate escalation
        const event: TriageEvent = {
          type: 'RED_FLAG_DETECTED',
          data: { redFlag: redFlags[0].type },
        };
        this.triageMachine.processEvent(event);
        await this.escalateToPharmacist();
      } else if (symptoms.length >= 2) {
        // Enough symptoms collected
        const event: TriageEvent = {
          type: 'SYMPTOMS_COMPLETE',
        };
        this.triageMachine.processEvent(event);
      }
    }

    // Follow-up selection
    if (currentState === 'FOLLOW_UP_SELECTION') {
      if (transcriptLower.includes('phone') || transcriptLower.includes('call')) {
        this.triageMachine.processEvent({
          type: 'FOLLOW_UP_SELECTED',
          data: { option: 'PHONE_CALL' },
        });
      } else if (transcriptLower.includes('person') || transcriptLower.includes('visit')) {
        this.triageMachine.processEvent({
          type: 'FOLLOW_UP_SELECTED',
          data: { option: 'IN_PERSON' },
        });
      } else if (transcriptLower.includes('text') || transcriptLower.includes('message')) {
        this.triageMachine.processEvent({
          type: 'FOLLOW_UP_SELECTED',
          data: { option: 'TEXT_MESSAGE' },
        });
      }
    }

    // Delivery options
    if (currentState === 'DELIVERY_OPTIONS') {
      if (transcriptLower.includes('pick') || transcriptLower.includes('collect')) {
        this.triageMachine.processEvent({
          type: 'PICKUP_SELECTED',
        });
      } else if (transcriptLower.includes('deliver')) {
        const option = transcriptLower.includes('same day') || transcriptLower.includes('urgent')
          ? 'SAME_DAY'
          : transcriptLower.includes('next day')
          ? 'NEXT_DAY'
          : 'STANDARD';
        this.triageMachine.processEvent({
          type: 'DELIVERY_SELECTED',
          data: { option },
        });
      }
    }
  }

  /**
   * Escalate to pharmacist
   */
  private async escalateToPharmacist(): Promise<void> {
    await db.callSession.update({
      where: { id: this.config.callSessionId },
      data: {
        status: CallStatus.ESCALATED,
        escalatedAt: new Date(),
        escalatedReason: 'Red flag detected during triage',
      },
    });

    // TODO: Notify pharmacist via dashboard/notification system
  }

  /**
   * Complete triage and create consultation
   */
  async completeTriage(): Promise<void> {
    const context = this.triageMachine.getContext();
    const fullTranscript = this.state.transcript.join(' ');

    // Extract structured data from transcript
    const { symptoms, redFlags } = extractSymptomsFromTranscript(fullTranscript);

    // Process UTI triage
    if (this.state.patientId) {
      await processUTITriage(this.config.orgId, this.state.patientId, {
        symptoms,
        redFlags,
        followUpOption: context.followUpOption,
        deliveryOption: context.deliveryOption,
      });
    }

    // Update call session
    await db.callSession.update({
      where: { id: this.config.callSessionId },
      data: {
        status: CallStatus.COMPLETED,
        endTime: new Date(),
        resolution: 'triage_completed',
      },
    });

    // Close Gemini connection
    const { closeRealtimeConnection } = await import('@/lib/gemini/realtime');
    await closeRealtimeConnection(this.geminiConnection);
  }

  /**
   * Handle call end
   */
  async endCall(): Promise<void> {
    try {
      await this.completeTriage();
    } catch (error) {
      console.error('Error ending call:', error);
    }
  }
}

/**
 * Create and initialize a Gemini voice agent for a call session
 */
export async function createVoiceAgent(config: VoiceAgentConfig): Promise<GeminiVoiceAgent> {
  const agent = new GeminiVoiceAgent(config);
  await agent.initialize();
  return agent;
}

