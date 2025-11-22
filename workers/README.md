# Workers Directory

Background job processors and long-running tasks.

## Structure

- **voice/** - Voice agent orchestration and call handling
- **triage/** - NHS Pharmacy First triage processing
- **video/** - Video generation pipeline
- **followup/** - 48-hour follow-up scheduling and execution

## Worker Patterns

### 1. Serverless Function Workers (Vercel Cron)

```typescript
// workers/followup/cron.ts
export async function scheduleFollowUps() {
  // Triggered by Vercel Cron
  // Process due follow-ups
}
```

### 2. Event-Driven Workers (Database Triggers)

```typescript
// workers/triage/on-consultation-created.ts
export async function handleNewConsultation(consultation: Consultation) {
  // Triggered when new consultation is created
  // Generate documentation, schedule follow-up
}
```

### 3. Queue-Based Workers (Redis Queue)

```typescript
// workers/video/queue-processor.ts
export async function processVideoQueue() {
  // Process video generation jobs from Redis queue
  // Handle retries and failures
}
```

## Deployment

Workers can be deployed as:
- Vercel Cron Jobs (scheduled tasks)
- API routes called by webhooks
- Separate worker processes (Cloud Run, etc.)

## Monitoring

All workers should:
1. Log execution start/end with structured logging
2. Report metrics (duration, success/failure)
3. Handle errors gracefully with retries
4. Update job status in database
