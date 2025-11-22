import { LiveKitClient, RoomServiceClient } from 'livekit-server-sdk';

/**
 * LiveKit SIP Configuration and Management
 * Handles PSTN phone number setup, SIP trunk configuration, and inbound call routing
 */

export interface SIPTrunkConfig {
  inboundUri: string;
  outboundProvider: 'twilio' | 'livekit';
  phoneNumber?: string;
  region?: string; // UK, US, etc.
}

export interface InboundCallEvent {
  callId: string;
  from: string; // E.164 format phone number
  to: string; // E.164 format phone number
  timestamp: Date;
  orgId?: string; // Pharmacy organization ID
}

/**
 * Initialize LiveKit client for SIP operations
 */
export function getLiveKitClient(): LiveKitClient {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!url || !apiKey || !apiSecret) {
    throw new Error('LiveKit credentials not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET');
  }

  return new LiveKitClient(url, apiKey, apiSecret);
}

/**
 * Create a SIP trunk for inbound phone calls
 * This should be called once during pharmacy setup
 */
export async function createSIPTrunk(config: SIPTrunkConfig): Promise<string> {
  const client = getLiveKitClient();
  
  // Note: LiveKit SIP trunk creation is typically done via their dashboard or API
  // This is a placeholder for the API call structure
  // In production, use LiveKit's SIP API endpoints
  
  const trunkConfig = {
    inboundUri: config.inboundUri,
    outboundProvider: config.outboundProvider,
    phoneNumber: config.phoneNumber,
    region: config.region || 'UK',
  };

  // TODO: Implement actual LiveKit SIP trunk creation API call
  // This would typically be:
  // const response = await client.sip.createTrunk(trunkConfig);
  // return response.trunkId;

  console.log('SIP Trunk configuration:', trunkConfig);
  return 'trunk_' + Date.now(); // Placeholder
}

/**
 * Purchase a UK geographic phone number via LiveKit SIP
 * Returns the phone number in E.164 format
 */
export async function purchasePhoneNumber(orgId: string, region: string = 'GB'): Promise<string> {
  const client = getLiveKitClient();

  // TODO: Implement LiveKit SIP phone number purchase
  // This would typically use LiveKit's SIP API to purchase a number
  // For UK numbers, you'd specify region: 'GB' and get a geographic number
  
  // Placeholder implementation
  const phoneNumber = `+44${Math.floor(Math.random() * 10000000000)}`;
  
  console.log(`Purchased phone number ${phoneNumber} for org ${orgId}`);
  return phoneNumber;
}

/**
 * Assign a phone number to a pharmacy organization
 */
export async function assignNumberToPharmacy(
  phoneNumber: string,
  orgId: string,
  webhookUrl: string
): Promise<void> {
  const client = getLiveKitClient();

  // Configure the SIP trunk to route calls to our webhook
  // TODO: Implement LiveKit SIP trunk assignment
  // This would set up routing so calls to phoneNumber go to webhookUrl

  console.log(`Assigned ${phoneNumber} to org ${orgId} with webhook ${webhookUrl}`);
}

/**
 * Handle incoming SIP call event
 * Creates a LiveKit room and returns room details for the agent to join
 */
export async function handleInboundCall(event: InboundCallEvent): Promise<{
  roomName: string;
  participantToken: string;
  agentToken: string;
}> {
  const client = getLiveKitClient();
  const roomService = new RoomServiceClient(
    process.env.LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );

  // Create unique room name from call ID
  const roomName = `call_${event.callId}_${Date.now()}`;

  // Create room with 1 hour expiry
  await roomService.createRoom({
    name: roomName,
    emptyTimeout: 3600,
    maxParticipants: 10,
  });

  // Generate participant token for caller
  const { AccessToken } = await import('livekit-server-sdk');
  const participantToken = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity: `caller_${event.from}`,
    }
  );
  participantToken.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  // Generate agent token
  const agentToken = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity: 'pharmvoice_agent',
    }
  );
  agentToken.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  return {
    roomName,
    participantToken: participantToken.toJwt(),
    agentToken: agentToken.toJwt(),
  };
}

/**
 * Get SIP trunk status and configuration
 */
export async function getSIPTrunkStatus(trunkId: string): Promise<{
  status: 'active' | 'inactive' | 'error';
  phoneNumber?: string;
  inboundUri?: string;
}> {
  // TODO: Implement LiveKit SIP trunk status check
  return {
    status: 'active',
    phoneNumber: '+441234567890', // Placeholder
    inboundUri: `sip:${trunkId}@livekit.io`,
  };
}

