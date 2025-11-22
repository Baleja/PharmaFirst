/**
 * Integration Tests for Voice Call Flow
 * Tests the complete patient journey from call start to completion
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createTriageStateMachine, TriageEvent } from '@/lib/triage/stateMachine';
import { processUTITriage } from '@/workers/triage/uti';
import { detectLanguageFromText } from '@/lib/voice/languageDetection';

describe('Voice Call Integration', () => {
  describe('Language Detection', () => {
    it('should detect English from greeting', () => {
      const result = detectLanguageFromText('Hello, I need help with my symptoms');
      expect(result.language).toBe('en-GB');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect Urdu from greeting', () => {
      const result = detectLanguageFromText('سلام، مجھے مدد چاہیے');
      expect(result.language).toBe('ur');
    });

    it('should detect Punjabi from greeting', () => {
      const result = detectLanguageFromText('ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ਮੈਨੂੰ ਮਦਦ ਚਾਹੀਦੀ ਹੈ');
      expect(result.language).toBe('pa');
    });

    it('should detect Spanish from greeting', () => {
      const result = detectLanguageFromText('Hola, necesito ayuda');
      expect(result.language).toBe('es');
    });
  });

  describe('Triage State Machine', () => {
    let triageMachine: any;

    beforeEach(() => {
      triageMachine = createTriageStateMachine();
    });

    it('should start in INITIAL state', () => {
      expect(triageMachine.getState()).toBe('INITIAL');
    });

    it('should transition to IDENTITY_VERIFICATION on START_TRIAGE', () => {
      const event: TriageEvent = { type: 'START_TRIAGE' };
      const result = triageMachine.processEvent(event);
      expect(result.newState).toBe('IDENTITY_VERIFICATION');
    });

    it('should transition through complete flow', () => {
      // Start triage
      triageMachine.processEvent({ type: 'START_TRIAGE' });
      expect(triageMachine.getState()).toBe('IDENTITY_VERIFICATION');

      // Verify identity
      triageMachine.processEvent({
        type: 'IDENTITY_VERIFIED',
        data: { name: 'John Doe', dob: '1990-01-01' },
      });
      expect(triageMachine.getState()).toBe('SYMPTOM_ASSESSMENT');

      // Record symptoms
      triageMachine.processEvent({
        type: 'SYMPTOM_RECORDED',
        data: { symptom: 'burning_pain' },
      });
      triageMachine.processEvent({
        type: 'SYMPTOM_RECORDED',
        data: { symptom: 'frequency' },
      });
      triageMachine.processEvent({ type: 'SYMPTOMS_COMPLETE' });
      expect(triageMachine.getState()).toBe('RED_FLAG_CHECK');

      // No red flags
      triageMachine.processEvent({ type: 'NO_RED_FLAGS' });
      expect(triageMachine.getState()).toBe('FOLLOW_UP_SELECTION');

      // Select follow-up
      triageMachine.processEvent({
        type: 'FOLLOW_UP_SELECTED',
        data: { option: 'TEXT_MESSAGE' },
      });
      expect(triageMachine.getState()).toBe('DELIVERY_OPTIONS');

      // Select delivery
      triageMachine.processEvent({
        type: 'DELIVERY_SELECTED',
        data: { option: 'PICKUP' },
      });
      expect(triageMachine.getState()).toBe('CONFIRMATION');

      // Confirm
      triageMachine.processEvent({ type: 'CONFIRMED' });
      expect(triageMachine.getState()).toBe('COMPLETED');
    });

    it('should escalate immediately on red flag', () => {
      triageMachine.processEvent({ type: 'START_TRIAGE' });
      triageMachine.processEvent({
        type: 'IDENTITY_VERIFIED',
        data: { name: 'Jane Doe', dob: '1985-05-15' },
      });
      triageMachine.processEvent({ type: 'SYMPTOMS_COMPLETE' });

      // Red flag detected
      triageMachine.processEvent({
        type: 'RED_FLAG_DETECTED',
        data: { redFlag: 'high_temperature' },
      });
      expect(triageMachine.getState()).toBe('ESCALATED');
      expect(triageMachine.needsPharmacistReview()).toBe(true);
    });
  });

  describe('UTI Triage Logic', () => {
    it('should escalate on red flags', async () => {
      // Mock database - in real tests, use test database
      const mockOrgId = 'test-org-id';
      const mockPatientId = 'test-patient-id';

      // This would require a test database setup
      // For now, we test the logic function directly
      const { assessUTISymptoms } = await import('@/workers/triage/uti');

      const result = assessUTISymptoms(
        [{ type: 'burning_pain', present: true }],
        [{ type: 'high_temperature', present: true }]
      );

      expect(result.recommendation).toBe('escalate');
      expect(result.suitableForTreatment).toBe(false);
      expect(result.redFlags.length).toBeGreaterThan(0);
    });

    it('should approve treatment for suitable symptoms', async () => {
      const { assessUTISymptoms } = await import('@/workers/triage/uti');

      const result = assessUTISymptoms(
        [
          { type: 'burning_pain', present: true },
          { type: 'frequency', present: true },
          { type: 'cloudy_urine', present: true },
        ],
        []
      );

      expect(result.recommendation).toBe('treat');
      expect(result.suitableForTreatment).toBe(true);
      expect(result.redFlags.length).toBe(0);
    });
  });

  describe('End-to-End Call Simulation', () => {
    it('should simulate complete English call flow', async () => {
      // 1. Language detection
      const languageResult = detectLanguageFromText('Hello, I need help');
      expect(languageResult.language).toBe('en-GB');

      // 2. Triage flow
      const triageMachine = createTriageStateMachine({
        language: languageResult.language,
      });

      triageMachine.processEvent({ type: 'START_TRIAGE' });
      triageMachine.processEvent({
        type: 'IDENTITY_VERIFIED',
        data: { name: 'Test Patient', dob: '1990-01-01' },
      });
      triageMachine.processEvent({ type: 'SYMPTOMS_COMPLETE' });
      triageMachine.processEvent({ type: 'NO_RED_FLAGS' });
      triageMachine.processEvent({
        type: 'FOLLOW_UP_SELECTED',
        data: { option: 'TEXT_MESSAGE' },
      });
      triageMachine.processEvent({
        type: 'PICKUP_SELECTED',
      });
      triageMachine.processEvent({ type: 'CONFIRMED' });

      expect(triageMachine.isComplete()).toBe(true);
      expect(triageMachine.getState()).toBe('COMPLETED');
    });

    it('should simulate Urdu call with escalation', async () => {
      // 1. Language detection
      const languageResult = detectLanguageFromText('سلام، مجھے بخار ہے');
      expect(languageResult.language).toBe('ur');

      // 2. Triage with red flag
      const triageMachine = createTriageStateMachine({
        language: languageResult.language,
      });

      triageMachine.processEvent({ type: 'START_TRIAGE' });
      triageMachine.processEvent({
        type: 'IDENTITY_VERIFIED',
        data: { name: 'Test Patient', dob: '1985-01-01' },
      });
      triageMachine.processEvent({ type: 'SYMPTOMS_COMPLETE' });

      // Red flag detected
      triageMachine.processEvent({
        type: 'RED_FLAG_DETECTED',
        data: { redFlag: 'high_temperature' },
      });

      expect(triageMachine.getState()).toBe('ESCALATED');
      expect(triageMachine.needsPharmacistReview()).toBe(true);
    });
  });
});

