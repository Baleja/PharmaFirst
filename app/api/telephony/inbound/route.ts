import { NextRequest, NextResponse } from 'next/server';
import { handleInboundCall, InboundCallEvent } from '@/lib/livekit/sip';
import { db } from '@/lib/db';
import { CallStatus } from '@prisma/client';

/**
 * POST /api/telephony/inbound
 * Webhook endpoint for incoming SIP calls from LiveKit
 * Creates a LiveKit room and initiates the voice agent
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Parse incoming call event from LiveKit SIP
    // Format depends on LiveKit's SIP webhook structure
    const callEvent: InboundCallEvent = {
      callId: body.callId || `call_${Date.now()}`,
      from: body.from || body.callerNumber,
      to: body.to || body.calledNumber,
      timestamp: new Date(body.timestamp || Date.now()),
      orgId: body.orgId, // May be determined from phone number mapping
    };

    // Determine organization from phone number if not provided
    let orgId = callEvent.orgId;
    if (!orgId) {
      // Look up organization by phone number
      const org = await db.organization.findFirst({
        where: {
          phoneNumbers: {
            has: callEvent.to,
          },
        },
      });
      orgId = org?.id;
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization not found for phone number' },
        { status: 404 }
      );
    }

    // Create LiveKit room and get tokens
    const { roomName, participantToken, agentToken } = await handleInboundCall(callEvent);

    // Create CallSession record
    const callSession = await db.callSession.create({
      data: {
        orgId,
        incomingNumber: callEvent.from,
        direction: 'inbound',
        status: CallStatus.RINGING,
        metadata: {
          callId: callEvent.callId,
          roomName,
          to: callEvent.to,
        },
      },
    });

    // Trigger voice agent worker (async)
    // In production, this would be a background job
    // For now, we'll return the room details and the agent will join separately

    return NextResponse.json({
      success: true,
      callSessionId: callSession.id,
      roomName,
      participantToken,
      agentToken, // This will be used by the agent worker
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/voice/agent/${callSession.id}`,
    });
  } catch (error) {
    console.error('Error handling inbound call:', error);
    return NextResponse.json(
      { error: 'Failed to handle inbound call', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/telephony/inbound
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'telephony-inbound' });
}

