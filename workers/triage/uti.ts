/**
 * UTI Triage Worker
 * Implements NHS Pharmacy First UTI triage decision tree
 */

import { createTriageStateMachine, TriageContext, TriageEvent } from '@/lib/triage/stateMachine';
import { db } from '@/lib/db';
import { PharmacyFirstCondition, DocumentationStatus } from '@prisma/client';

export interface UTISymptom {
  type: 'burning_pain' | 'frequency' | 'cloudy_urine' | 'lower_abdominal_pain' | 'general_malaise';
  present: boolean;
  severity?: 'mild' | 'moderate' | 'severe';
  duration?: number; // days
}

export interface UTIRedFlag {
  type:
    | 'high_temperature'
    | 'kidney_pain'
    | 'nausea_vomiting'
    | 'blood_in_urine'
    | 'symptoms_over_7_days'
    | 'pregnancy'
    | 'diabetes'
    | 'immunocompromised';
  present: boolean;
}

export interface UTITriageResult {
  suitableForTreatment: boolean;
  redFlags: UTIRedFlag[];
  symptoms: UTISymptom[];
  recommendation: 'treat' | 'escalate' | 'refer';
  reasoning: string;
}

/**
 * Assess UTI symptoms against NHS Pharmacy First criteria
 */
export function assessUTISymptoms(
  symptoms: UTISymptom[],
  redFlags: UTIRedFlag[]
): UTITriageResult {
  // Check for red flags first - immediate escalation
  const presentRedFlags = redFlags.filter((rf) => rf.present);

  if (presentRedFlags.length > 0) {
    return {
      suitableForTreatment: false,
      redFlags: presentRedFlags,
      symptoms,
      recommendation: 'escalate',
      reasoning: `Red flags detected: ${presentRedFlags.map((rf) => rf.type).join(', ')}. Immediate pharmacist review required.`,
    };
  }

  // Check symptom criteria
  const hasBurningPain = symptoms.some((s) => s.type === 'burning_pain' && s.present);
  const hasFrequency = symptoms.some((s) => s.type === 'frequency' && s.present);
  const hasCloudyUrine = symptoms.some((s) => s.type === 'cloudy_urine' && s.present);
  const hasLowerPain = symptoms.some((s) => s.type === 'lower_abdominal_pain' && s.present);

  // NHS Pharmacy First criteria: at least 2 of the main symptoms
  const mainSymptoms = [hasBurningPain, hasFrequency, hasCloudyUrine, hasLowerPain].filter(
    Boolean
  ).length;

  if (mainSymptoms >= 2) {
    return {
      suitableForTreatment: true,
      redFlags: [],
      symptoms,
      recommendation: 'treat',
      reasoning: `Patient presents with ${mainSymptoms} main UTI symptoms. Suitable for Pharmacy First treatment pending pharmacist confirmation.`,
    };
  }

  // Insufficient symptoms or unclear presentation
  return {
    suitableForTreatment: false,
    redFlags: [],
    symptoms,
    recommendation: 'escalate',
    reasoning: 'Insufficient or unclear symptoms. Pharmacist review recommended.',
  };
}

/**
 * Process UTI triage and create consultation record
 */
export async function processUTITriage(
  orgId: string,
  patientId: string,
  triageData: {
    symptoms: UTISymptom[];
    redFlags: UTIRedFlag[];
    followUpOption?: string;
    deliveryOption?: string;
  }
): Promise<{
  consultationId: string;
  result: UTITriageResult;
  needsApproval: boolean;
}> {
  // Assess symptoms
  const result = assessUTISymptoms(triageData.symptoms, triageData.redFlags);

  // Create consultation record
  const consultation = await db.consultation.create({
    data: {
      orgId,
      patientId,
      type: 'UTI_WOMEN',
      triageData: {
        symptoms: triageData.symptoms,
        redFlags: triageData.redFlags,
        followUpOption: triageData.followUpOption,
        deliveryOption: triageData.deliveryOption,
      },
      redFlags: result.redFlags.map((rf) => rf.type),
      documentationStatus: result.recommendation === 'escalate' ? 'DRAFT' : 'PENDING_APPROVAL',
    },
  });

  return {
    consultationId: consultation.id,
    result,
    needsApproval: result.recommendation !== 'escalate', // Escalated cases go to pharmacist immediately
  };
}

/**
 * Extract symptoms from conversation transcript
 * This would typically use NLP/LLM to extract structured data
 */
export function extractSymptomsFromTranscript(transcript: string): {
  symptoms: UTISymptom[];
  redFlags: UTIRedFlag[];
} {
  const symptoms: UTISymptom[] = [];
  const redFlags: UTIRedFlag[] = [];

  const transcriptLower = transcript.toLowerCase();

  // Symptom detection (simplified - in production, use NLP)
  if (transcriptLower.match(/burn|pain|sting|urine|pee|wee/)) {
    symptoms.push({ type: 'burning_pain', present: true });
  }
  if (transcriptLower.match(/frequent|often|keep going|toilet/)) {
    symptoms.push({ type: 'frequency', present: true });
  }
  if (transcriptLower.match(/cloudy|dark|smell|strong/)) {
    symptoms.push({ type: 'cloudy_urine', present: true });
  }
  if (transcriptLower.match(/lower|tummy|stomach|belly/)) {
    symptoms.push({ type: 'lower_abdominal_pain', present: true });
  }

  // Red flag detection
  if (transcriptLower.match(/fever|temperature|high temp|hot/)) {
    redFlags.push({ type: 'high_temperature', present: true });
  }
  if (transcriptLower.match(/side|back|kidney|flank/)) {
    redFlags.push({ type: 'kidney_pain', present: true });
  }
  if (transcriptLower.match(/nausea|sick|vomit|throw up/)) {
    redFlags.push({ type: 'nausea_vomiting', present: true });
  }
  if (transcriptLower.match(/blood|red|pink/)) {
    redFlags.push({ type: 'blood_in_urine', present: true });
  }
  if (transcriptLower.match(/week|7 days|more than/)) {
    redFlags.push({ type: 'symptoms_over_7_days', present: true });
  }
  if (transcriptLower.match(/pregnant|expecting|baby/)) {
    redFlags.push({ type: 'pregnancy', present: true });
  }
  if (transcriptLower.match(/diabetes|diabetic/)) {
    redFlags.push({ type: 'diabetes', present: true });
  }

  return { symptoms, redFlags };
}

/**
 * Get UTI triage decision tree (for reference)
 */
export function getUTIDecisionTree(): {
  questions: Array<{ id: string; text: string; type: 'symptom' | 'red_flag' }>;
} {
  return {
    questions: [
      {
        id: 'burning_pain',
        text: 'Do you have burning or pain when passing urine?',
        type: 'symptom',
      },
      {
        id: 'frequency',
        text: 'Do you need to pass urine more often than usual?',
        type: 'symptom',
      },
      {
        id: 'cloudy_urine',
        text: 'Is your urine cloudy, dark, or have a strong smell?',
        type: 'symptom',
      },
      {
        id: 'lower_abdominal_pain',
        text: 'Do you have pain in your lower tummy or back?',
        type: 'symptom',
      },
      {
        id: 'high_temperature',
        text: 'Do you have a high temperature or fever?',
        type: 'red_flag',
      },
      {
        id: 'kidney_pain',
        text: 'Do you have pain in your sides or back (kidney area)?',
        type: 'red_flag',
      },
      {
        id: 'nausea_vomiting',
        text: 'Are you feeling nauseous or have you vomited?',
        type: 'red_flag',
      },
      {
        id: 'blood_in_urine',
        text: 'Have you noticed any blood in your urine?',
        type: 'red_flag',
      },
      {
        id: 'symptoms_over_7_days',
        text: 'Have you had these symptoms for more than 7 days?',
        type: 'red_flag',
      },
      {
        id: 'pregnancy',
        text: 'Are you currently pregnant?',
        type: 'red_flag',
      },
      {
        id: 'diabetes',
        text: 'Do you have diabetes or any condition that affects your immune system?',
        type: 'red_flag',
      },
    ],
  };
}

