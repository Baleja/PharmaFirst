/**
 * Triage State Machine
 * Manages the patient journey flow for UTI triage and other conditions
 */

export type TriageState =
  | 'INITIAL'
  | 'IDENTITY_VERIFICATION'
  | 'SYMPTOM_ASSESSMENT'
  | 'RED_FLAG_CHECK'
  | 'FOLLOW_UP_SELECTION'
  | 'DELIVERY_OPTIONS'
  | 'CONFIRMATION'
  | 'ESCALATED'
  | 'COMPLETED';

export type FollowUpOption = 'PHONE_CALL' | 'IN_PERSON' | 'TEXT_MESSAGE';

export type DeliveryOption = 'PICKUP' | 'STANDARD' | 'NEXT_DAY' | 'SAME_DAY';

export interface TriageContext {
  state: TriageState;
  patientId?: string;
  patientName?: string;
  patientDOB?: string;
  symptoms: string[];
  redFlags: string[];
  followUpOption?: FollowUpOption;
  deliveryOption?: DeliveryOption;
  language?: string;
  metadata: Record<string, any>;
}

export interface TriageEvent {
  type: string;
  data?: any;
}

/**
 * UTI Triage State Machine
 * Handles the complete patient journey from call start to completion
 */
export class UTITriageStateMachine {
  private context: TriageContext;

  constructor(initialContext?: Partial<TriageContext>) {
    this.context = {
      state: 'INITIAL',
      symptoms: [],
      redFlags: [],
      metadata: {},
      ...initialContext,
    };
  }

  /**
   * Process an event and transition state
   */
  processEvent(event: TriageEvent): { newState: TriageState; context: TriageContext } {
    const currentState = this.context.state;

    switch (currentState) {
      case 'INITIAL':
        if (event.type === 'START_TRIAGE') {
          this.context.state = 'IDENTITY_VERIFICATION';
        }
        break;

      case 'IDENTITY_VERIFICATION':
        if (event.type === 'IDENTITY_VERIFIED') {
          this.context.patientId = event.data?.patientId;
          this.context.patientName = event.data?.name;
          this.context.patientDOB = event.data?.dob;
          this.context.state = 'SYMPTOM_ASSESSMENT';
        } else if (event.type === 'IDENTITY_FAILED') {
          // Retry identity verification
          this.context.state = 'IDENTITY_VERIFICATION';
        }
        break;

      case 'SYMPTOM_ASSESSMENT':
        if (event.type === 'SYMPTOM_RECORDED') {
          this.context.symptoms.push(event.data?.symptom);
        } else if (event.type === 'SYMPTOMS_COMPLETE') {
          this.context.state = 'RED_FLAG_CHECK';
        }
        break;

      case 'RED_FLAG_CHECK':
        if (event.type === 'RED_FLAG_DETECTED') {
          this.context.redFlags.push(event.data?.redFlag);
          this.context.state = 'ESCALATED';
        } else if (event.type === 'NO_RED_FLAGS') {
          this.context.state = 'FOLLOW_UP_SELECTION';
        }
        break;

      case 'FOLLOW_UP_SELECTION':
        if (event.type === 'FOLLOW_UP_SELECTED') {
          this.context.followUpOption = event.data?.option;
          if (event.data?.option === 'TEXT_MESSAGE') {
            this.context.state = 'DELIVERY_OPTIONS';
          } else {
            this.context.state = 'CONFIRMATION';
          }
        }
        break;

      case 'DELIVERY_OPTIONS':
        if (event.type === 'DELIVERY_SELECTED') {
          this.context.deliveryOption = event.data?.option;
          this.context.state = 'CONFIRMATION';
        } else if (event.type === 'PICKUP_SELECTED') {
          this.context.deliveryOption = 'PICKUP';
          this.context.state = 'CONFIRMATION';
        }
        break;

      case 'CONFIRMATION':
        if (event.type === 'CONFIRMED') {
          this.context.state = 'COMPLETED';
        } else if (event.type === 'CHANGE_REQUESTED') {
          // Allow going back to previous state
          const previousState = event.data?.previousState;
          if (previousState) {
            this.context.state = previousState as TriageState;
          }
        }
        break;

      case 'ESCALATED':
        // Once escalated, stay in this state
        break;

      case 'COMPLETED':
        // Terminal state
        break;
    }

    return {
      newState: this.context.state,
      context: { ...this.context },
    };
  }

  /**
   * Get current state
   */
  getState(): TriageState {
    return this.context.state;
  }

  /**
   * Get current context
   */
  getContext(): TriageContext {
    return { ...this.context };
  }

  /**
   * Update context metadata
   */
  updateMetadata(key: string, value: any): void {
    this.context.metadata[key] = value;
  }

  /**
   * Set detected language
   */
  setLanguage(language: string): void {
    this.context.language = language;
  }

  /**
   * Check if triage is complete
   */
  isComplete(): boolean {
    return this.context.state === 'COMPLETED' || this.context.state === 'ESCALATED';
  }

  /**
   * Check if triage needs pharmacist review
   */
  needsPharmacistReview(): boolean {
    return (
      this.context.state === 'ESCALATED' ||
      this.context.redFlags.length > 0 ||
      this.context.state === 'CONFIRMATION'
    );
  }

  /**
   * Get next question based on current state
   */
  getNextQuestion(): string | null {
    switch (this.context.state) {
      case 'IDENTITY_VERIFICATION':
        return 'To help you today, could I please have your full name and date of birth?';
      case 'SYMPTOM_ASSESSMENT':
        return 'Can you tell me about your symptoms?';
      case 'RED_FLAG_CHECK':
        return 'Do you have any of the following: high temperature, pain in your sides or back, nausea, or blood in your urine?';
      case 'FOLLOW_UP_SELECTION':
        return 'How would you like to proceed? I can arrange a phone call from our pharmacist, an in-person consultation, or send you a text message with medication details.';
      case 'DELIVERY_OPTIONS':
        return 'Would you like to collect the medication from the pharmacy, or have it delivered?';
      case 'CONFIRMATION':
        return 'Is there anything else I can help you with today?';
      default:
        return null;
    }
  }
}

/**
 * Create a new triage state machine instance
 */
export function createTriageStateMachine(
  initialContext?: Partial<TriageContext>
): UTITriageStateMachine {
  return new UTITriageStateMachine(initialContext);
}

