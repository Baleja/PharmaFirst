# PharmaFirst (PharmVoice)

**AI-powered voice & video platform for UK pharmacies**

[![Next.js](https://img.shields.io/badge/Next.js-14+-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748)](https://www.prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E)](https://supabase.com/)

## Overview

PharmaFirst is a mobile-first voice and text assistant platform designed to transform UK pharmacy operations. Available in multiple languages, it handles patient triage, medication education, appointment booking, and automated documentation while maintaining NHS compliance and patient safety.

**Vision:** Reduce pharmacist phone burden, standardize NHS Pharmacy First consultations, provide multilingual voice/text patient education, and automate documentation and follow-ups.

## Key Features

### 🤖 24/7 AI-Powered Communication
- Automated phone & SMS handling for prescription status, triage, and follow-ups
- Real-time voice interactions using LiveKit + ElevenLabs + Whisper
- Multilingual support for diverse patient populations

### 🏥 NHS Pharmacy First Integration
- NHS-compliant triage workflows for the 7 Pharmacy First conditions
- Automated documentation and PharmOutcomes submission
- Red flag detection and automatic escalation to pharmacists

### 🎥 Multilingual Patient Education
- Programmatic video generation (Fal + Veed + ElevenLabs)
- Multi-language medication counselling content
- Pharmacy-branded educational materials

### 📊 Clinical Intelligence
- Integration with PMR systems for prescription lookup
- Medical knowledge validation via Valyu API
- Complete audit trail for compliance and safety

### 🔄 48-Hour Follow-ups
- Automated patient follow-up scheduling
- SMS and voice reminders
- Clinical outcome tracking

## Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **TailwindCSS** + **shadcn/ui**
- Mobile-first, progressive enhancement

### Backend
- **Next.js API Routes** / Edge Functions
- **PostgreSQL** on Supabase
- **Prisma ORM**
- **Redis** (Upstash) for caching

### AI & Media Services
- **LiveKit** - Real-time voice, PSTN via SIP/Twilio
- **ElevenLabs** - Multilingual TTS and voice cloning
- **OpenAI Whisper** - Real-time transcription
- **Fal API** - Programmatic video generation
- **Veed** - Video post-editing and captions
- **Valyu API** - Medical knowledge search
- **ApeAI** - Small-business marketing automation
- **DLT** - Data migration pipelines

### Infrastructure
- **Vercel** - Frontend hosting
- **Cloudflare R2** / **S3** - Media storage
- **Sentry** - Error tracking
- **Posthog** - Analytics

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- PostgreSQL (via Supabase)
- API keys for: LiveKit, ElevenLabs, Fal, Valyu, Twilio, Supabase

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd PharmaFirst

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run database migrations
npx prisma migrate dev

# Seed the database (optional)
npx prisma db seed

# Start development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
pharmafirst/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Dashboard and admin UI
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── lib/                   # Core libraries and utilities
│   ├── livekit/          # LiveKit integration
│   ├── elevenlabs/       # ElevenLabs TTS
│   ├── fal/              # Fal video generation
│   ├── veed/             # Veed post-editing
│   ├── valyu/            # Valyu medical search
│   ├── dlt/              # DLT data migrations
│   └── db.ts             # Prisma client
├── workers/               # Background jobs
│   ├── triage/           # Triage processing
│   ├── video/            # Video generation
│   └── followup/         # Follow-up scheduling
├── prisma/                # Database schema and migrations
│   ├── schema.prisma     # Data models
│   ├── migrations/       # Migration files
│   └── seed.ts           # Seed data
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── features/         # Feature-specific components
├── docs/                  # Documentation
│   ├── nhs/              # NHS compliance docs
│   └── integrations/     # Integration guides
├── scripts/               # Utility scripts
├── .cursor/              # Cursor IDE rules
│   └── rules/            # Integration-specific rules
└── public/                # Static assets
```

## Core Workflows

### 1. Incoming Call Handling
1. Call received via Twilio → LiveKit session created
2. AI plays consent greeting (ElevenLabs TTS)
3. Patient audio streamed to Whisper for transcription
4. LLM processes intent with system prompt
5. Execute tools: PMR lookup, Valyu search, appointment booking
6. TTS response streamed back to caller
7. Call log, recording, and transcript saved

### 2. NHS Pharmacy First Triage
1. Patient describes symptoms (voice or text)
2. AI follows condition-specific triage protocol
3. Red flag detection → immediate pharmacist escalation
4. Compliant conditions → appointment booking
5. Auto-generate PharmOutcomes documentation
6. Pharmacist review and approval
7. 48-hour follow-up scheduled

### 3. Video Education Generation
1. Trigger: New condition or language request
2. LLM generates patient-appropriate script
3. ElevenLabs creates multilingual voiceover
4. Fal API generates base video with scenes
5. Veed adds pharmacy branding, captions, formatting
6. Video stored and made available to patients
7. Optional: ApeAI creates social media posts

## User Roles

- **Pharmacy Owner/Manager** - Configuration, billing, compliance oversight
- **Pharmacist** - Clinical review, escalations, documentation approval
- **Counter Staff** - Monitor AI escalations, manage dispense queue
- **Patient** - Call, receive SMS, view educational content
- **Admin/Ops** - Integration setup, PMR mapping, data migration

## Security & Compliance

### Data Protection
- ✅ Row-level security (RLS) on all Supabase tables
- ✅ End-to-end encryption for recordings
- ✅ 7-year retention for NHS compliance
- ✅ GDPR-compliant data access and erasure
- ✅ NHS number redaction in searchable transcripts

### Clinical Safety
- ✅ Red flag detection and immediate escalation
- ✅ Valyu API for clinical reference validation
- ✅ Complete audit trail for all interactions
- ✅ Pharmacist approval for all documentation
- ✅ Consent management and recording

### API Security
- ✅ Server-side only API key management
- ✅ HTTPS enforced in production
- ✅ Rate limiting and DDoS protection
- ✅ Signed URLs for media access

## Development

### Available Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm test             # Run tests

# Database
npx prisma studio     # Open Prisma Studio
npx prisma migrate dev --name <name>   # Create migration
npx prisma migrate deploy              # Deploy migrations
npx prisma generate   # Generate Prisma Client

# Cursor IDE
# Cmd/Ctrl + I        # Open Agent mode
# Cmd/Ctrl + K        # Inline edit
```

### Environment Variables

See `.env.example` for required environment variables:
- Supabase (Database & Auth)
- LiveKit (Voice handling)
- ElevenLabs (TTS)
- Fal (Video generation)
- Veed (Video editing)
- Valyu (Medical search)
- Twilio (PSTN connectivity)
- DLT (Data migrations)

## Integrations

### PMR Systems
Support for major UK pharmacy management systems:
- PMR lookup for prescription status
- Patient medication history
- Dispense queue integration

### NHS PharmOutcomes
- Automated claim submission
- Consultation documentation
- Audit trail maintenance

### Telephony
- Twilio SIP trunk for PSTN connectivity
- LiveKit for real-time media processing
- Multi-number support per pharmacy

## Monitoring & Observability

- **Sentry** - Error tracking and performance monitoring
- **Posthog** - User analytics and feature tracking
- **Custom Dashboards** - Call volume, triage outcomes, video generation status
- **Cost Alerts** - AI service usage monitoring
- **Health Endpoints** - System status and uptime monitoring

## Roadmap

### v1 (MVP) - Current
- ✅ Core voice agent with LiveKit
- ✅ NHS Pharmacy First triage
- ✅ Video education automation
- ✅ PMR lookup integration
- ✅ PharmOutcomes submission

### v2 - Planned
- Voice cloning for pharmacist-specific content
- Enhanced NLP for complex clinical queries
- In-app pharmacist chat
- Stripe billing integration
- Multi-pharmacy dashboard

### v3 - Future
- Enterprise PMR integrations
- Advanced analytics and reporting
- Automated audit reports
- International phone support

## Contributing

Please read our contributing guidelines and code of conduct before submitting pull requests.

### Cursor Integration

This project is optimized for development with Cursor IDE:
- Integration-specific rules in `.cursor/rules/`
- Context symbols: `@lib/livekit/`, `@lib/elevenlabs/`, `@workers/triage/`
- Agent prompts in `.cursor/prompts/pharmvoice/`

## License

[Your License Here]

## Support

For questions, issues, or feature requests:
- Documentation: `/docs`
- Issues: [GitHub Issues]
- Email: [support email]

---

**Built with ❤️ for UK pharmacies and their patients**
