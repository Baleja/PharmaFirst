import { NextRequest, NextResponse } from 'next/server';
import { createVoiceAgent } from '@/workers/voice/gemini-agent';
import { db } from '@/lib/db';

/**
 * POST /api/voice/agent/[callSessionId]
 * Initialize and start the Gemini voice agent for a call session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { callSessionId: string } }
) {
  try {
    const { callSessionId } = params;
    const body = await request.json();

    // Get call session
    const callSession = await db.callSession.findUnique({
      where: { id: callSessionId },
      include: { organization: true },
    });

    if (!callSession) {
      return NextResponse.json({ error: 'Call session not found' }, { status: 404 });
    }

    // Create voice agent
    const agent = await createVoiceAgent({
      callSessionId,
      roomName: (callSession.metadata as any)?.roomName || `room_${callSessionId}`,
      agentToken: body.agentToken, // Should be passed from inbound webhook
      orgId: callSession.orgId,
      pharmacyName: callSession.organization.name,
    });

    return NextResponse.json({
      success: true,
      message: 'Voice agent initialized',
      callSessionId,
    });
  } catch (error) {
    console.error('Error initializing voice agent:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize voice agent',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/voice/agent/[callSessionId]
 * Get agent status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { callSessionId: string } }
) {
  const { callSessionId } = params;

  const callSession = await db.callSession.findUnique({
    where: { id: callSessionId },
    select: {
      id: true,
      status: true,
      startTime: true,
      metadata: true,
    },
  });

  if (!callSession) {
    return NextResponse.json({ error: 'Call session not found' }, { status: 404 });
  }

  return NextResponse.json({
    callSessionId,
    status: callSession.status,
    startTime: callSession.startTime,
    metadata: callSession.metadata,
  });
}

