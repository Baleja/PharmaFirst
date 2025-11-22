/**
 * Language Detection Utilities
 * Handles automatic language detection from first spoken utterance
 */

export type SupportedLanguage = 'en-GB' | 'ur' | 'pa' | 'pl' | 'es' | 'en';

export interface LanguageDetectionResult {
  language: SupportedLanguage;
  confidence: number;
  detectedAt: Date;
}

/**
 * Language codes mapping
 */
export const LANGUAGE_CODES: Record<string, SupportedLanguage> = {
  'en': 'en-GB',
  'en-GB': 'en-GB',
  'en-US': 'en-GB', // Default to GB for English
  'ur': 'ur', // Urdu
  'pa': 'pa', // Punjabi
  'pl': 'pl', // Polish
  'es': 'es', // Spanish
  'es-ES': 'es',
  'es-MX': 'es',
};

/**
 * Language display names
 */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  'en-GB': 'English (UK)',
  'ur': 'Urdu',
  'pa': 'Punjabi',
  'pl': 'Polish',
  'es': 'Spanish',
  'en': 'English (UK)',
};

/**
 * Detect language from text (first utterance)
 * This is a fallback when audio-based detection isn't available
 */
export function detectLanguageFromText(text: string): LanguageDetectionResult {
  // Simple keyword-based detection for common phrases
  const languageIndicators: Record<SupportedLanguage, RegExp[]> = {
    'ur': [/سلام/, /کیا/, /ہے/, /آپ/],
    'pa': [/ਸਤ ਸ੍ਰੀ/, /ਕੀ/, /ਹੈ/],
    'pl': [/dzień dobry/, /cześć/, /proszę/],
    'es': [/hola/, /buenos días/, /por favor/],
    'en-GB': [/hello/, /hi/, /good morning/, /thank you/],
    'en': [/hello/, /hi/, /good morning/, /thank you/],
  };

  const textLower = text.toLowerCase();
  
  for (const [lang, patterns] of Object.entries(languageIndicators)) {
    for (const pattern of patterns) {
      if (pattern.test(textLower)) {
        return {
          language: lang as SupportedLanguage,
          confidence: 0.8,
          detectedAt: new Date(),
        };
      }
    }
  }

  // Default to English if no match
  return {
    language: 'en-GB',
    confidence: 0.5,
    detectedAt: new Date(),
  };
}

/**
 * Normalize language code to supported format
 */
export function normalizeLanguageCode(code: string): SupportedLanguage {
  const normalized = code.toLowerCase().trim();
  return LANGUAGE_CODES[normalized] || 'en-GB';
}

/**
 * Check if language is supported
 */
export function isLanguageSupported(code: string): boolean {
  return normalizeLanguageCode(code) !== 'en-GB' || code.toLowerCase().includes('en');
}

/**
 * Get preferred language from CallSession metadata or patient record
 */
export function getPreferredLanguage(
  metadata?: Record<string, any>,
  patientPreferredLanguage?: string
): SupportedLanguage {
  if (patientPreferredLanguage) {
    return normalizeLanguageCode(patientPreferredLanguage);
  }
  
  if (metadata?.detectedLanguage) {
    return normalizeLanguageCode(metadata.detectedLanguage);
  }
  
  return 'en-GB';
}

