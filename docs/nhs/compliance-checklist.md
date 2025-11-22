# NHS Compliance Checklist

This document outlines compliance requirements for PharmaFirst to operate within the NHS Pharmacy First framework.

## Data Protection & Privacy

### GDPR Requirements
- [ ] **Data Processing Agreement** with all third-party processors (Supabase, LiveKit, etc.)
- [ ] **Privacy Policy** clearly stating data collection, usage, and retention
- [ ] **Consent Management** - explicit consent for voice recording and data processing
- [ ] **Right to Access** - API endpoint for patients to request their data
- [ ] **Right to Erasure** - Anonymization process (legal hold for NHS records)
- [ ] **Data Portability** - Export patient data in machine-readable format
- [ ] **Breach Notification** - 72-hour notification procedure

### NHS Data Security Standards
- [ ] **Encryption at Rest** - All PII encrypted in database
- [ ] **Encryption in Transit** - HTTPS enforced, TLS 1.3 minimum
- [ ] **Access Controls** - Role-based access control (RBAC) with RLS
- [ ] **Audit Logging** - Complete audit trail for all data access
- [ ] **Data Retention** - 7-year retention for clinical records
- [ ] **Secure Disposal** - Cryptographic erasure after retention period
- [ ] **Staff Training** - Data protection training for all users

## Clinical Safety (DCB0129)

### Safety Case
- [ ] **Hazard Log** - Documented risks and mitigations
- [ ] **Clinical Risk Assessment** - DTAC approved risk assessment
- [ ] **Safety Monitoring** - Process for incident reporting and investigation

### Key Hazards & Mitigations

| Hazard | Risk | Mitigation |
|--------|------|------------|
| AI misdiagnosis | High | Red flag detection + pharmacist escalation |
| Missed red flags | High | Strict triage protocols + pharmacist review |
| Medication error | High | Double-check with Valyu API + pharmacist approval |
| System downtime | Medium | Automated phone failover to pharmacist |
| Data breach | High | Encryption + access controls + audit logs |

### Clinical Override
- [ ] **Pharmacist Override** - All AI decisions subject to pharmacist review
- [ ] **Escalation Triggers** - Automatic escalation for red flags
- [ ] **Human Fallback** - Option to speak to pharmacist at any time

## NHS Pharmacy First Protocols

### Approved Conditions (7 conditions)
- [ ] Acute Otitis Media (AOM)
- [ ] Impetigo
- [ ] Infected Insect Bites
- [ ] Shingles
- [ ] Sinusitis
- [ ] Sore Throat
- [ ] Uncomplicated UTI (Women 16-64)

### Triage Requirements
- [ ] **Evidence-Based Protocols** - Aligned with NICE/NHS guidelines
- [ ] **Red Flag Detection** - Immediate escalation for serious symptoms
- [ ] **Age Restrictions** - Enforce age criteria per condition
- [ ] **Exclusion Criteria** - Check for pregnancy, immunosuppression, etc.
- [ ] **Patient Safety Netting** - Clear advice on when to seek further help

### Documentation Requirements
- [ ] **Patient Demographics** - Name, DOB, NHS number, address
- [ ] **Triage Outcome** - Symptoms, red flags, suitability assessment
- [ ] **Treatment Provided** - Medication name, dose, duration
- [ ] **Advice Given** - Safety netting, follow-up instructions
- [ ] **Pharmacist Details** - GPhC number, name, digital signature
- [ ] **Consultation Date/Time** - Accurate timestamp

## PharmOutcomes Integration

### Claim Submission
- [ ] **Real-Time Submission** - Submit claims within 24 hours
- [ ] **Validation** - Pre-submission validation of all required fields
- [ ] **Error Handling** - Retry logic for failed submissions
- [ ] **Audit Trail** - Log all submissions with NHS reference number

### Required Data Fields
- [ ] ODS Code (pharmacy)
- [ ] NHS Number (patient)
- [ ] Consultation Type (Pharmacy First condition)
- [ ] Outcome Code (treatment supplied, referred, etc.)
- [ ] Pharmacist GPhC Number
- [ ] Consultation Date/Time
- [ ] Follow-Up Required (Y/N)

## Professional Standards

### GPhC Standards for Pharmacy Professionals
- [ ] **Patient-Centered Care** - AI supports, not replaces, pharmacist judgment
- [ ] **Consent** - Informed consent for AI triage and recording
- [ ] **Confidentiality** - Secure handling of patient data
- [ ] **Professional Judgment** - Pharmacist approval for all clinical decisions
- [ ] **Accountability** - Clear responsibility for AI-assisted decisions

### Indemnity Insurance
- [ ] **Professional Indemnity** - Coverage for AI-assisted consultations
- [ ] **Cyber Insurance** - Coverage for data breaches
- [ ] **Public Liability** - General pharmacy insurance

## Voice Recording Compliance

### Consent Requirements
- [ ] **Pre-Call Announcement** - "This call may be recorded for quality and training"
- [ ] **Opt-Out Option** - Ability to decline recording (speak to pharmacist)
- [ ] **Implied Consent** - Continuing call = consent (logged)

### Recording Management
- [ ] **Secure Storage** - Encrypted storage (R2/S3 with encryption at rest)
- [ ] **Access Control** - Signed URLs with expiry (60 minutes)
- [ ] **Retention** - 7-year retention, then cryptographic deletion
- [ ] **Subject Access** - Patient can request copy of recording

### Transcription
- [ ] **Accuracy** - Whisper transcription validated
- [ ] **Redaction** - PII redacted from searchable text (NHS number, postcode)
- [ ] **Storage** - Transcripts stored with same security as recordings

## AI/ML Governance

### Transparency
- [ ] **Patient Notification** - Clearly state AI is being used
- [ ] **Explainability** - Document how AI makes triage decisions
- [ ] **Bias Monitoring** - Regular audits for demographic bias

### Model Validation
- [ ] **Clinical Validation** - Triage protocols reviewed by pharmacists
- [ ] **Safety Testing** - Red flag detection tested on known cases
- [ ] **Performance Monitoring** - Track accuracy, escalation rate, outcomes

### Human Oversight
- [ ] **Pharmacist Review** - All AI triage reviewed before treatment
- [ ] **Feedback Loop** - Pharmacist corrections improve AI prompts
- [ ] **Override Capability** - Pharmacist can override any AI decision

## Operational Requirements

### Service Availability
- [ ] **Uptime SLA** - 99.9% uptime target
- [ ] **Failover** - Automatic failover to pharmacist if AI fails
- [ ] **Disaster Recovery** - Backup systems and data recovery plan

### Response Times
- [ ] **Call Answering** - Answer within 3 rings (15 seconds)
- [ ] **Triage Completion** - Complete triage within 5 minutes
- [ ] **Documentation** - Submit PharmOutcomes claim within 24 hours
- [ ] **Follow-Up** - 48-hour follow-up call as scheduled

### Quality Assurance
- [ ] **Call Monitoring** - Random sample of calls reviewed monthly
- [ ] **Complaint Handling** - Process for patient complaints
- [ ] **Incident Reporting** - Report clinical incidents to CQC

## Inspections & Audits

### CQC Registration
- [ ] **Registration** - Pharmacy registered with CQC
- [ ] **Inspection Readiness** - Documentation and audit trails accessible
- [ ] **Safe Care Standard** - Demonstrate AI safety controls

### Internal Audits
- [ ] **Monthly** - Review escalation rate, red flag detection accuracy
- [ ] **Quarterly** - Audit random sample of consultations
- [ ] **Annually** - Comprehensive clinical safety review

### External Audits
- [ ] **NHS Audits** - Cooperate with NHS audit requests
- [ ] **PharmOutcomes Audits** - Provide claims data as required
- [ ] **Data Protection Audits** - ICO compliance if requested

## Continuous Improvement

### Feedback Mechanisms
- [ ] **Patient Feedback** - Post-call SMS survey
- [ ] **Pharmacist Feedback** - UI for reporting AI errors
- [ ] **Outcome Tracking** - 48-hour follow-up outcomes

### Performance Metrics
- [ ] **Triage Accuracy** - % of AI triage confirmed by pharmacist
- [ ] **Red Flag Detection** - Sensitivity and specificity
- [ ] **Patient Satisfaction** - NPS score from surveys
- [ ] **Clinical Outcomes** - Resolution rate, re-consultation rate

### Protocol Updates
- [ ] **NICE Guideline Updates** - Monitor and incorporate updates
- [ ] **Medication Changes** - Update drug databases
- [ ] **Regulatory Changes** - Track NHS Pharmacy First updates

## Sign-Off

### Responsible Individuals

- **Clinical Safety Officer**: [Name, GPhC Number]
- **Data Protection Officer**: [Name, Contact]
- **Pharmacy Superintendent**: [Name, GPhC Number]

### Review Schedule
- **Next Review Date**: [Date]
- **Review Frequency**: Quarterly (or upon significant system changes)

---

**Document Version**: 1.0
**Last Updated**: [Date]
**Author**: [Name]
