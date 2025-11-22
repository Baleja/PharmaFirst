# PharmaFirst Architecture

This document describes the technical architecture, data models, API integrations, and system design patterns for the PharmaFirst (PharmVoice) platform.

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Principles](#architecture-principles)
- [High-Level Architecture](#high-level-architecture)
- [Data Model](#data-model)
- [Core Components](#core-components)
- [API Integrations](#api-integrations)
- [Security Architecture](#security-architecture)
- [Deployment Architecture](#deployment-architecture)
- [Observability](#observability)

---

## System Overview

PharmaFirst is a distributed, event-driven system that orchestrates multiple AI services to provide automated pharmacy operations. The architecture follows a serverless-first approach with edge computing capabilities for low-latency voice interactions.

### Key Characteristics

- **Event-Driven**: Asynchronous processing for voice, video generation, and follow-ups
- **Multi-Tenant**: Each pharmacy operates as an isolated organization
- **HIPAA/GDPR Compliant**: End-to-end encryption, audit trails, data retention policies
- **Real-Time**: Sub-second latency for voice interactions
- **Scalable**: Auto-scaling for call volume spikes

---

## Architecture Principles

### 1. Security First
- All API keys server-side only
- Row-level security (RLS) on all database tables
- Encryption at rest and in transit
- NHS-compliant data retention (7 years)

### 2. Mobile-First
- Progressive enhancement for low-bandwidth scenarios
- Optimized for 3G/4G connections
- SMS fallback for voice unavailability

### 3. Fail-Safe Clinical Design
- Red flag detection triggers immediate escalation
- Pharmacist approval required for documentation
- Complete audit trail for all clinical decisions
- Graceful degradation (human fallback)

### 4. Observability
- Distributed tracing for all AI service calls
- Cost tracking per pharmacy/interaction
- Clinical outcome monitoring
- Performance metrics for compliance SLAs

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Patient Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  Phone (PSTN)  │  SMS  │  Web App  │  Video Player             │
└────────┬────────┴───┬───┴─────┬─────┴──────┬────────────────────┘
         │            │         │            │
         │            │         │            │
┌────────▼────────────▼─────────▼────────────▼────────────────────┐
│                      Edge Layer (Vercel)                        │
├─────────────────────────────────────────────────────────────────┤
│  Next.js App Router  │  API Routes  │  Edge Functions          │
│  - Authentication    │  - REST APIs │  - Real-time handlers    │
│  - UI Components     │  - Webhooks  │  - WebSocket proxies     │
└────────┬─────────────┴──────┬───────┴──────┬────────────────────┘
         │                    │              │
         │                    │              │
┌────────▼────────────────────▼──────────────▼────────────────────┐
│                      Service Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  LiveKit         │  ElevenLabs    │  Fal/Veed  │  Valyu        │
│  (Voice)         │  (TTS)         │  (Video)   │  (Medical KB) │
├─────────────────────────────────────────────────────────────────┤
│  OpenAI/Anthropic │  Twilio       │  ApeAI     │  DLT          │
│  (LLM)            │  (PSTN)       │  (Social)  │  (Migration)  │
└────────┬──────────┴───────┬────────┴─────┬──────┴───────────────┘
         │                  │              │
         │                  │              │
┌────────▼──────────────────▼──────────────▼────────────────────┐
│                      Data Layer                               │
├───────────────────────────────────────────────────────────────┤
│  Supabase PostgreSQL  │  Redis (Upstash)  │  R2/S3 Storage   │
│  - Relational data    │  - Session cache  │  - Recordings    │
│  - RLS policies       │  - Rate limiting  │  - Videos        │
│  - Audit logs         │  - Job queues     │  - Attachments   │
└───────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Core Entities

#### Organization (Pharmacy)
```typescript
model Organization {
  id              String   @id @default(cuid())
  name            String
  odsCode         String   @unique  // NHS ODS code
  address         Json                // Structured address
  phoneNumbers    String[]            // Primary, overflow numbers
  timezone        String   @default("Europe/London")
  region          String              // NHS region
  settings        Json                // Pharmacy-specific config
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  users           User[]
  callSessions    CallSession[]
  consultations   Consultation[]
  pmrIntegrations PMRIntegration[]
}
```

#### User
```typescript
model User {
  id              String   @id @default(cuid())
  email           String   @unique
  name            String
  role            UserRole            // OWNER, PHARMACIST, STAFF, ADMIN
  gphcNumber      String?             // GPhC registration (pharmacists)
  orgId           String
  organization    Organization @relation(fields: [orgId], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  consultations   Consultation[]
  auditLogs       AuditLog[]
}

enum UserRole {
  OWNER
  PHARMACIST
  STAFF
  ADMIN
}
```

#### Patient
```typescript
model Patient {
  id                 String   @id @default(cuid())
  name               String
  dob                DateTime
  phone              String
  email              String?
  preferredLanguage  String   @default("en-GB")
  nhsNumber          String?  @unique
  consentFlags       Json                // Voice recording, SMS, video

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  callSessions       CallSession[]
  consultations      Consultation[]
}
```

#### CallSession
```typescript
model CallSession {
  id              String   @id @default(cuid())
  orgId           String
  organization    Organization @relation(fields: [orgId], references: [id])

  patientId       String?
  patient         Patient? @relation(fields: [patientId], references: [id])

  incomingNumber  String
  direction       String              // inbound, outbound
  status          CallStatus
  startTime       DateTime @default(now())
  endTime         DateTime?
  duration        Int?                // seconds

  transcriptId    String?
  transcript      Json?               // Full conversation transcript
  recordingUrl    String?             // Signed R2/S3 URL

  resolution      String?             // prescription_status, triage, escalation
  escalatedAt     DateTime?
  escalatedReason String?

  metadata        Json                // Intent, tools used, costs

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum CallStatus {
  RINGING
  IN_PROGRESS
  COMPLETED
  FAILED
  ESCALATED
}
```

#### Consultation
```typescript
model Consultation {
  id                    String   @id @default(cuid())
  orgId                 String
  organization          Organization @relation(fields: [orgId], references: [id])

  patientId             String
  patient               Patient @relation(fields: [patientId], references: [id])

  type                  PharmacyFirstCondition
  triageData            Json                // Structured triage responses
  redFlags              String[]

  pharmacistId          String?
  pharmacist            User? @relation(fields: [pharmacistId], references: [id])

  documentationStatus   DocumentationStatus
  nhsRef                String?             // PharmOutcomes claim ID
  submittedAt           DateTime?

  followUpScheduled     DateTime?
  followUpCompleted     DateTime?
  followUpOutcome       String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

enum PharmacyFirstCondition {
  ACUTE_OTITIS_MEDIA
  IMPETIGO
  INFECTED_INSECT_BITE
  SHINGLES
  SINUSITIS
  SORE_THROAT
  UTI_WOMEN
}

enum DocumentationStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  SUBMITTED
  REJECTED
}
```

#### VideoAsset
```typescript
model VideoAsset {
  id              String   @id @default(cuid())
  condition       String
  language        String
  title           String
  description     String?

  voiceId         String              // ElevenLabs voice ID
  script          String              // Original script
  transcript      String?             // Final transcript with timecodes

  falVideoId      String?
  veedProjectId   String?

  status          VideoStatus
  url             String?             // Final video URL
  thumbnailUrl    String?
  duration        Int?                // seconds

  metadata        Json                // Aspect ratios, captions, costs

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum VideoStatus {
  SCRIPT_GENERATED
  VOICE_GENERATED
  VIDEO_GENERATING
  POST_PROCESSING
  COMPLETED
  FAILED
}
```

#### PMRIntegration
```typescript
model PMRIntegration {
  id              String   @id @default(cuid())
  orgId           String
  organization    Organization @relation(fields: [orgId], references: [id])

  provider        String              // "PMR1", "PharmacyManager", etc.
  credentials     String              // Encrypted API keys/tokens
  mappedFields    Json                // Field mapping config

  status          IntegrationStatus
  lastSyncedAt    DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum IntegrationStatus {
  PENDING
  ACTIVE
  FAILED
  DISABLED
}
```

#### AuditLog
```typescript
model AuditLog {
  id              String   @id @default(cuid())
  userId          String?
  user            User? @relation(fields: [userId], references: [id])

  action          String              // call.started, triage.completed, etc.
  resourceType    String              // CallSession, Consultation, etc.
  resourceId      String
  details         Json

  ipAddress       String?
  userAgent       String?

  timestamp       DateTime @default(now())
}
```

---

## Core Components

### 1. Voice Agent System

**Location**: `lib/livekit/` + `workers/voice/`

#### Responsibilities
- Handle incoming PSTN calls via Twilio SIP trunk
- Stream audio to/from LiveKit rooms
- Orchestrate STT (Whisper) → LLM → TTS (ElevenLabs) pipeline
- Execute tool calls (PMR lookup, Valyu search, appointment booking)
- Save call recordings and transcripts

#### Flow
```
1. Twilio receives call → forwards to LiveKit SIP endpoint
2. LiveKit creates room, agent joins
3. Agent plays consent greeting (cached TTS)
4. Patient audio streamed → Whisper transcription
5. Transcript chunks → LLM with system prompt + conversation history
6. LLM returns response + tool calls
7. Tools executed (PMR API, Valyu API, etc.)
8. Tool results → LLM for natural response
9. Response → ElevenLabs TTS → streamed to LiveKit → patient
10. Loop until call ends or escalation
11. Save CallSession record, upload recording to R2
```

#### Key Files
- `lib/livekit/client.ts` - LiveKit SDK client
- `lib/livekit/sip-config.ts` - SIP trunk configuration
- `workers/voice/agent.ts` - Main voice agent orchestrator
- `workers/voice/tools.ts` - Tool definitions for LLM

### 2. Triage Engine

**Location**: `workers/triage/`

#### Responsibilities
- Implement NHS Pharmacy First triage protocols
- Detect red flags and trigger escalations
- Generate structured triage data for documentation
- Schedule follow-ups

#### Protocol Implementation
Each of the 7 Pharmacy First conditions has a dedicated protocol:
- Decision tree based on symptoms
- Red flag criteria (immediate escalation)
- Suitability assessment
- Treatment pathway recommendation

#### Example: UTI in Women Protocol
```typescript
const utiProtocol = {
  name: "UTI_WOMEN",
  questions: [
    { id: "age", text: "What is your age?", type: "number", redFlag: (val) => val < 16 || val > 64 },
    { id: "pregnancy", text: "Are you pregnant?", type: "boolean", redFlag: (val) => val === true },
    { id: "bloodInUrine", text: "Do you have blood in your urine?", type: "boolean", redFlag: (val) => val === true },
    { id: "fever", text: "Do you have a fever >38°C?", type: "boolean", redFlag: (val) => val === true },
    // ... more questions
  ],
  treatment: {
    suitable: { medication: "Nitrofurantoin", duration: "3 days", dose: "100mg BD" },
    followUp: { hours: 48, checkpoints: ["symptoms", "adherence", "sideEffects"] }
  }
};
```

#### Key Files
- `workers/triage/protocols/` - Protocol definitions for each condition
- `workers/triage/engine.ts` - Triage orchestration
- `workers/triage/red-flags.ts` - Red flag detection logic
- `workers/triage/valyu-integration.ts` - Clinical knowledge validation

### 3. Video Generation Pipeline

**Location**: `workers/video/`

#### Responsibilities
- Generate patient education videos programmatically
- Support multiple languages and conditions
- Pharmacy branding and customization
- Multi-format output (social, web, mobile)

#### Flow
```
1. Trigger: New video request (condition + language)
2. LLM generates patient-appropriate script (reading level, tone)
3. Script → ElevenLabs for multilingual TTS (returns audio file)
4. Fal API: Generate base video
   - Input: script scenes, visual templates, audio
   - Output: Base video with scenes
5. Veed API: Post-processing
   - Add pharmacy logo/branding
   - Generate captions (SRT from transcript)
   - Adapt aspect ratios (16:9, 9:16, 1:1)
   - Export final video
6. Upload to R2/S3, create VideoAsset record
7. Optional: ApeAI creates social media posts
```

#### Key Files
- `workers/video/script-generator.ts` - LLM-based script generation
- `workers/video/fal-client.ts` - Fal API integration
- `workers/video/veed-client.ts` - Veed API integration
- `workers/video/templates/` - Video templates per condition

### 4. Documentation Engine

**Location**: `lib/pharmoutcomes/`

#### Responsibilities
- Auto-generate NHS PharmOutcomes claim forms
- Map triage data to required fields
- Submit claims with pharmacist digital signature
- Maintain audit trail for NHS inspections

#### PharmOutcomes API Integration
```typescript
interface PharmOutcomesSubmission {
  claimType: "Pharmacy First";
  condition: PharmacyFirstCondition;
  patientDetails: {
    nhsNumber: string;
    name: string;
    dob: string;
    postcode: string;
  };
  triageOutcome: {
    redFlags: string[];
    suitableForTreatment: boolean;
    treatmentProvided: string;
    adviceGiven: string;
  };
  pharmacist: {
    gphcNumber: string;
    name: string;
    digitalSignature: string;
  };
  consultationDate: string;
  followUpRequired: boolean;
}
```

#### Key Files
- `lib/pharmoutcomes/client.ts` - PharmOutcomes API client
- `lib/pharmoutcomes/mapping.ts` - Field mapping from triage data
- `lib/pharmoutcomes/submission.ts` - Claim submission logic

---

## API Integrations

### 1. LiveKit (Real-Time Voice)

**Purpose**: WebRTC infrastructure for PSTN calls and real-time audio processing

**Configuration**:
```typescript
// lib/livekit/config.ts
export const livekitConfig = {
  url: process.env.LIVEKIT_URL!,
  apiKey: process.env.LIVEKIT_API_KEY!,
  apiSecret: process.env.LIVEKIT_API_SECRET!,
  sipTrunk: {
    inboundUri: process.env.LIVEKIT_SIP_INBOUND_URI!,
    outboundProvider: "twilio",
    twilioConfig: {
      accountSid: process.env.TWILIO_ACCOUNT_SID!,
      authToken: process.env.TWILIO_AUTH_TOKEN!,
      fromNumber: process.env.TWILIO_PHONE_NUMBER!,
    }
  }
};
```

**Key Operations**:
- Create room for incoming call
- Stream audio tracks (bidirectional)
- Record call audio (S3/R2 egress)
- Handle call events (participant joined, disconnected)

### 2. ElevenLabs (Text-to-Speech)

**Purpose**: Multilingual TTS for IVR and video voiceovers

**Configuration**:
```typescript
// lib/elevenlabs/config.ts
export const elevenlabsConfig = {
  apiKey: process.env.ELEVENLABS_API_KEY!,
  defaultModel: "eleven_turbo_v2",
  voices: {
    "en-GB": { id: "british_female_1", name: "Alice" },
    "es-ES": { id: "spanish_female_1", name: "Maria" },
    "ur-PK": { id: "urdu_male_1", name: "Ahmed" },
  },
  settings: {
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0.3,
  }
};
```

**Key Operations**:
- Generate TTS audio streams (streaming for low latency)
- Voice cloning for pharmacist-specific videos
- Multilingual voice selection
- Audio file generation for video pipeline

### 3. Fal API (Video Generation)

**Purpose**: Programmatic video generation from scripts and assets

**Configuration**:
```typescript
// lib/fal/config.ts
export const falConfig = {
  apiKey: process.env.FAL_API_KEY!,
  baseUrl: "https://api.fal.ai",
  templates: {
    medicationGuide: "fal-template-123",
    conditionEducation: "fal-template-456",
  }
};
```

**Key Operations**:
- Submit video generation job with script + audio + visual templates
- Poll for job completion (webhook or polling)
- Retrieve generated video URL
- Cost tracking per generation

### 4. Veed (Video Post-Editing)

**Purpose**: Programmatic video editing, captions, branding

**Configuration**:
```typescript
// lib/veed/config.ts
export const veedConfig = {
  apiKey: process.env.VEED_API_KEY!,
  brandingTemplates: {
    logo: "veed-template-logo-overlay",
    intro: "veed-template-intro-3s",
  }
};
```

**Key Operations**:
- Upload base video from Fal
- Apply branding template (logo, colors)
- Generate auto-captions (multi-language)
- Export multiple aspect ratios
- Webhook for completion events

### 5. Valyu API (Medical Knowledge Search)

**Purpose**: Clinical reference validation and evidence retrieval

**Configuration**:
```typescript
// lib/valyu/config.ts
export const valyuConfig = {
  apiKey: process.env.VALYU_API_KEY!,
  baseUrl: "https://api.valyu.ai",
  sources: ["BNF", "NICE", "NHS"],
};
```

**Key Operations**:
- Search for medication interactions
- Retrieve side effect profiles
- Validate clinical advice
- Return scored results with citations

**Example Tool Definition for LLM**:
```typescript
const searchValyuTool = {
  name: "search_valyu",
  description: "Search clinical knowledge base for medication info, interactions, side effects",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Clinical query" },
      sources: { type: "array", items: { type: "string" }, description: "Preferred sources (BNF, NICE, NHS)" }
    },
    required: ["query"]
  }
};
```

### 6. DLT (Data Migration)

**Purpose**: LLM-assisted ETL for PMR and historical data

**Configuration**:
```typescript
// lib/dlt/config.ts
export const dltConfig = {
  pipelines: {
    pmrMigration: {
      source: "pmr_export", // CSV, HL7, FHIR
      destination: "pharmafirst_db",
      llmMapping: true, // Use LLM for field mapping
    }
  }
};
```

**Key Operations**:
- Ingest PMR exports (various formats)
- LLM-assisted schema mapping
- Incremental data loading with deduplication
- Validation and audit logging

---

## Security Architecture

### 1. Authentication & Authorization

**Supabase Auth + RLS**:
```sql
-- Row-level security policy example
CREATE POLICY "Users can only see their org's data"
ON call_sessions FOR SELECT
USING (
  org_id IN (
    SELECT org_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Pharmacists can update consultations"
ON consultations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('PHARMACIST', 'OWNER')
    AND org_id = consultations.org_id
  )
);
```

### 2. API Key Management

**Server-side only**:
```typescript
// app/api/voice/route.ts (server-side API route)
export async function POST(req: Request) {
  // Keys never exposed to client
  const livekitClient = new LiveKitClient({
    apiKey: process.env.LIVEKIT_API_KEY!,
    apiSecret: process.env.LIVEKIT_API_SECRET!,
  });

  // ... handle request
}
```

**Never**:
- Embed API keys in client-side code
- Pass keys via query params or headers from client
- Store unencrypted keys in database

### 3. Data Encryption

**At Rest**:
- Supabase PostgreSQL encryption enabled
- R2/S3 bucket encryption for recordings/videos
- PMR credentials encrypted with KMS

**In Transit**:
- HTTPS enforced (HSTS headers)
- WebRTC DTLS-SRTP for voice
- VPN for PMR integrations

### 4. PII Protection

**Redaction Strategy**:
```typescript
// Redact NHS numbers from searchable transcripts
function redactPII(transcript: string): string {
  return transcript
    .replace(/\b\d{3}\s?\d{3}\s?\d{4}\b/g, "[NHS_NUMBER_REDACTED]")
    .replace(/\b[A-Z]{2}\d{1,2}\s?\d{1,2}[A-Z]{2}\b/g, "[POSTCODE_REDACTED]");
}
```

**Access Controls**:
- Recordings accessible via signed URLs only (60-min expiry)
- NHS numbers viewable only by PHARMACIST and OWNER roles
- Audit log for all PII access

### 5. Compliance

**GDPR**:
- Right to access: `/api/patients/[id]/export`
- Right to erasure: Anonymization after retention period (legal hold for NHS)
- Data portability: JSON export of patient data

**NHS Data Security**:
- 7-year retention for clinical records
- Audit trail for all access and modifications
- Pharmacist digital signatures for documentation

---

## Deployment Architecture

### Production Infrastructure

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                  │
├─────────────────────────────────────────────────────────┤
│  - Next.js App (Static + SSR)                          │
│  - API Routes (Serverless Functions)                   │
│  - Edge Functions (Real-time handlers)                 │
└────────────┬────────────────────────────────────────────┘
             │
             │ HTTPS (TLS 1.3)
             │
┌────────────▼────────────────────────────────────────────┐
│                    External Services                    │
├─────────────────────────────────────────────────────────┤
│  LiveKit Cloud  │  Supabase  │  Upstash Redis          │
├─────────────────────────────────────────────────────────┤
│  ElevenLabs     │  Fal       │  Veed                   │
├─────────────────────────────────────────────────────────┤
│  Twilio         │  Valyu     │  ApeAI                  │
└─────────────────────────────────────────────────────────┘
             │
             │
┌────────────▼────────────────────────────────────────────┐
│                    Storage Layer                        │
├─────────────────────────────────────────────────────────┤
│  Cloudflare R2 / S3                                     │
│  - Call recordings (7-year retention)                   │
│  - Generated videos                                     │
│  - Attachments and assets                              │
└─────────────────────────────────────────────────────────┘
```

### Environment Configuration

**Development**:
- Local Next.js dev server (`pnpm dev`)
- Supabase local instance (optional)
- Mock API responses for cost savings

**Staging**:
- Vercel preview deployments (per-branch)
- Shared Supabase staging database
- Test API keys with rate limits

**Production**:
- Vercel production deployment
- Supabase production database (replicated)
- Production API keys with monitoring
- CDN caching for videos and static assets

### Scaling Strategy

**Horizontal Scaling**:
- Vercel auto-scales serverless functions
- Supabase connection pooling (PgBouncer)
- LiveKit auto-scales media servers

**Database Optimization**:
- Read replicas for analytics queries
- Materialized views for dashboards
- Partitioning for large tables (call_sessions, audit_logs)

**Caching**:
- Redis for session data and rate limiting
- CDN caching for videos (CloudFront/Cloudflare)
- Stale-while-revalidate for dashboard data

---

## Observability

### 1. Logging

**Structured Logging**:
```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, meta?: object) => {
    console.log(JSON.stringify({
      level: "info",
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  },
  error: (message: string, error: Error, meta?: object) => {
    console.error(JSON.stringify({
      level: "error",
      message,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }
};
```

**Log Aggregation**:
- Vercel logs for API routes
- Sentry for errors and exceptions
- Custom log sink for compliance audits

### 2. Metrics

**Key Metrics**:
- Call volume (per pharmacy, per hour)
- Triage completion rate
- Escalation rate (target: <20%)
- Video generation success rate
- API costs per interaction
- Response latency (voice, triage, video)

**Dashboards**:
- Grafana for technical metrics
- Custom admin dashboard for clinical outcomes
- Cost tracking dashboard per pharmacy

### 3. Tracing

**Distributed Tracing**:
```typescript
// Example: Trace video generation pipeline
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('video-generation');

async function generateVideo(condition: string, language: string) {
  const span = tracer.startSpan('generate_video');
  span.setAttribute('condition', condition);
  span.setAttribute('language', language);

  try {
    const scriptSpan = tracer.startSpan('generate_script', { parent: span });
    const script = await generateScript(condition, language);
    scriptSpan.end();

    const ttsSpan = tracer.startSpan('generate_tts', { parent: span });
    const audio = await generateTTS(script, language);
    ttsSpan.end();

    // ... more spans

    span.setStatus({ code: 0 }); // OK
  } catch (error) {
    span.setStatus({ code: 2, message: error.message }); // ERROR
    throw error;
  } finally {
    span.end();
  }
}
```

### 4. Alerting

**Critical Alerts**:
- API failures (>5% error rate)
- Database connection pool exhaustion
- High latency (>2s p95 for voice)
- Cost anomalies (>2x expected spend)
- Red flag escalation failures

**Alert Channels**:
- PagerDuty for critical issues
- Slack for warnings
- Email for daily summaries

---

## Integration Patterns

### 1. Webhook Handling

**Veed Completion Webhook**:
```typescript
// app/api/webhooks/veed/route.ts
export async function POST(req: Request) {
  const signature = req.headers.get('x-veed-signature');
  const payload = await req.json();

  // Verify webhook signature
  const isValid = verifyVeedSignature(payload, signature);
  if (!isValid) return new Response('Unauthorized', { status: 401 });

  // Update VideoAsset status
  await prisma.videoAsset.update({
    where: { veedProjectId: payload.projectId },
    data: {
      status: 'COMPLETED',
      url: payload.videoUrl,
      duration: payload.duration,
    }
  });

  return new Response('OK', { status: 200 });
}
```

### 2. Background Jobs

**Worker Pattern** (Vercel Cron or external worker):
```typescript
// workers/followup/scheduler.ts
export async function scheduleFollowUps() {
  const due = await prisma.consultation.findMany({
    where: {
      followUpScheduled: { lte: new Date() },
      followUpCompleted: null,
    }
  });

  for (const consultation of due) {
    await triggerFollowUpCall(consultation);
  }
}
```

### 3. Circuit Breaker

**Resilient API Calls**:
```typescript
// lib/circuit-breaker.ts
class CircuitBreaker {
  async call<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    if (this.isOpen) return fallback;

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      if (this.shouldOpen()) this.open();
      return fallback;
    }
  }
}

// Usage
const valyuResult = await circuitBreaker.call(
  () => valyuClient.search("nitrofurantoin interactions"),
  { results: [], error: "Service unavailable" }
);
```

---

## Future Architectural Enhancements

### v2
- **Event Sourcing**: Full event log for consultation replay and audits
- **CQRS**: Separate read/write models for analytics
- **GraphQL API**: Flexible querying for multi-pharmacy dashboard

### v3
- **Multi-Region**: EU, US deployments for international expansion
- **Edge AI**: On-device transcription for ultra-low latency
- **Federated Learning**: Privacy-preserving ML model improvements

---

## Conclusion

This architecture balances clinical safety, regulatory compliance, and developer productivity. The serverless-first approach enables rapid scaling while keeping infrastructure costs proportional to usage. Comprehensive observability and fail-safe design ensure patient safety remains paramount.

For implementation details, see:
- `/docs/integrations/` - Integration-specific guides
- `/docs/nhs/` - NHS compliance documentation
- `.cursor/rules/` - Development best practices
