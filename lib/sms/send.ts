/**
 * SMS Sending Service
 * Handles sending SMS confirmations via Twilio or LiveKit SMS API
 */

export interface SMSMessage {
  to: string; // E.164 format
  message: string;
  from?: string; // Optional sender number
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send SMS via Twilio (fallback if LiveKit SMS not available)
 */
async function sendViaTwilio(message: SMSMessage): Promise<SMSResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio credentials not configured');
  }

  try {
    const twilio = await import('twilio');
    const client = twilio.default(accountSid, authToken);

    const result = await client.messages.create({
      body: message.message,
      to: message.to,
      from: fromNumber,
    });

    return {
      success: true,
      messageId: result.sid,
    };
  } catch (error) {
    console.error('Twilio SMS error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send SMS via LiveKit SMS API (if available)
 */
async function sendViaLiveKit(message: SMSMessage): Promise<SMSResult> {
  // TODO: Implement LiveKit SMS API integration
  // LiveKit may provide SMS capabilities in the future
  // For now, fall back to Twilio
  
  console.log('LiveKit SMS not yet implemented, falling back to Twilio');
  return sendViaTwilio(message);
}

/**
 * Send SMS confirmation message
 * Uses LiveKit SMS if available, otherwise falls back to Twilio
 */
export async function sendSMS(message: SMSMessage): Promise<SMSResult> {
  // Try LiveKit first, then Twilio
  try {
    return await sendViaLiveKit(message);
  } catch (error) {
    console.warn('LiveKit SMS failed, using Twilio fallback:', error);
    return sendViaTwilio(message);
  }
}

/**
 * Send consultation confirmation SMS
 */
export async function sendConsultationConfirmation(
  phoneNumber: string,
  consultationDetails: {
    condition: string;
    status: 'pending' | 'approved' | 'ready';
    pharmacyName: string;
    pickupTime?: string;
    deliveryDate?: string;
  }
): Promise<SMSResult> {
  let message: string;

  if (consultationDetails.status === 'pending') {
    message = `Hello, this is ${consultationDetails.pharmacyName}. We've received your consultation request for ${consultationDetails.condition}. Our pharmacist is reviewing it and will confirm your treatment plan shortly. You'll receive another message once confirmed.`;
  } else if (consultationDetails.status === 'approved') {
    if (consultationDetails.pickupTime) {
      message = `Hello from ${consultationDetails.pharmacyName}. Your ${consultationDetails.condition} treatment has been approved. Your medication is ready for collection. Please collect before ${consultationDetails.pickupTime}. Thank you!`;
    } else if (consultationDetails.deliveryDate) {
      message = `Hello from ${consultationDetails.pharmacyName}. Your ${consultationDetails.condition} treatment has been approved. Your medication will be delivered on ${consultationDetails.deliveryDate}. Thank you!`;
    } else {
      message = `Hello from ${consultationDetails.pharmacyName}. Your ${consultationDetails.condition} treatment has been approved. Please contact us to arrange collection or delivery. Thank you!`;
    }
  } else {
    message = `Hello from ${consultationDetails.pharmacyName}. Your ${consultationDetails.condition} medication is ready. Please collect from the pharmacy. Thank you!`;
  }

  return sendSMS({
    to: phoneNumber,
    message,
  });
}

/**
 * Send follow-up reminder SMS
 */
export async function sendFollowUpReminder(
  phoneNumber: string,
  reminderDetails: {
    pharmacyName: string;
    condition: string;
    followUpDate: string;
    type: 'phone' | 'in_person';
  }
): Promise<SMSResult> {
  const messageType =
    reminderDetails.type === 'phone'
      ? 'phone call'
      : 'in-person consultation';

  const message = `Hello from ${reminderDetails.pharmacyName}. This is a reminder about your ${reminderDetails.condition} follow-up. We have a ${messageType} scheduled for ${reminderDetails.followUpDate}. Please let us know if you need to reschedule. Thank you!`;

  return sendSMS({
    to: phoneNumber,
    message,
  });
}

