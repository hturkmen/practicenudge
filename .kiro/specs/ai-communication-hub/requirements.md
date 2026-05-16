# Requirements Document

## Introduction

AI Communication Hub MVP is a standalone outbound AI voice reminder system designed for UK and Turkish accounting firms using PracticeNudge. The system enables accountant firms to upload a client list, have AI automatically call clients to chase outstanding document submissions, and report outcomes back to PracticeNudge and a dedicated operator dashboard.

The MVP scope is intentionally narrow: outbound voice calls only, with human handoff when AI cannot resolve. No email, WhatsApp, SMS, inbound calls, billing system, or enterprise-scale concurrency in this phase.

**Target**: Prototype in 7-30 days. A single accountant firm uploads 20 clients → AI calls each → asks about missing documents → records outcome → operator reviews results.

## Glossary

- **Platform**: The AI Communication Hub MVP system
- **Voice_Engine**: The subsystem that initiates outbound calls via Twilio, streams audio to/from speech services, and manages call lifecycle
- **Conversation_Manager**: The component that orchestrates AI dialogue using GPT-4o, maintains conversation state, and follows the document-chasing Playbook
- **Playbook**: A pre-configured conversation script for document reminder calls — defines greeting, questions about outstanding documents, handling objections, and closing
- **Voice_Persona**: Voice characteristics (language, accent, pace, tone) applied to AI-generated speech via TTS
- **Human_Handoff**: Transfer of an active call to a human operator when AI cannot resolve the conversation
- **Campaign**: A batch of outbound calls targeting a list of clients with a specific Playbook
- **Operator**: A human user (accountant or staff member) who manages campaigns, reviews call outcomes, and handles handoffs
- **Tenant**: An accounting firm using the Platform (single-tenant MVP, multi-tenant ready architecture)
- **Transcription_Engine**: Converts speech to text in real-time during calls and produces post-call transcripts
- **Outcome**: The result of a call — reached, no_answer, voicemail, document_promised, refused, handoff_completed

## Requirements

### Requirement 1: Outbound Voice Call Campaign

**User Story:** As an Operator at an accounting firm, I want to upload a client list and have the AI automatically call each client to remind them about outstanding documents, so that I can chase 20+ clients without making manual calls.

#### Acceptance Criteria

1. WHEN an Operator creates a Campaign by uploading a CSV with client names, phone numbers, and outstanding document details, THE Platform SHALL validate the list and create a Campaign in 'ready' status
2. WHEN an Operator starts a Campaign, THE Voice_Engine SHALL initiate outbound calls to each recipient sequentially or with up to 5 concurrent calls
3. WHEN the Voice_Engine initiates an outbound call, THE Voice_Engine SHALL apply the configured Voice_Persona (language and accent matching the client's preference — English UK or Turkish)
4. IF a call recipient does not answer within 30 seconds, THEN THE Voice_Engine SHALL mark the call as 'no_answer' and move to the next recipient
5. WHEN a Campaign completes all calls, THE Platform SHALL generate a Campaign summary showing total calls, outcomes breakdown, and success rate
6. THE Platform SHALL support a retry policy allowing up to 2 retries for unanswered calls with a minimum 30-minute delay between attempts

### Requirement 2: AI Document Reminder Conversation

**User Story:** As an accounting firm, I want the AI to have a natural conversation with clients about their outstanding documents, so that clients understand what they need to submit and by when.

#### Acceptance Criteria

1. WHEN a call recipient answers, THE Conversation_Manager SHALL greet the client by name and identify the calling firm using the Playbook greeting template
2. WHILE the call is active, THE Conversation_Manager SHALL inform the client about their specific outstanding documents and deadline dates using context from PracticeNudge
3. IF the client confirms they will submit documents, THEN THE Conversation_Manager SHALL record the outcome as 'document_promised' with any stated timeline
4. IF the client refuses or states they cannot submit, THEN THE Conversation_Manager SHALL record the outcome as 'refused' with the stated reason
5. IF the client asks questions the AI cannot answer after 2 attempts, THEN THE Conversation_Manager SHALL offer to transfer to a human operator (Human_Handoff)
6. WHEN the conversation ends, THE Conversation_Manager SHALL produce a structured outcome record including: outcome type, client response summary, and any commitments made

### Requirement 3: Real-Time Speech Processing

**User Story:** As a client receiving a call, I want the AI to understand me and respond naturally in real-time, so that the conversation feels like talking to a real person.

#### Acceptance Criteria

1. WHEN a client speaks during an active call, THE Transcription_Engine SHALL convert speech to text with a latency of less than 500 milliseconds
2. WHEN the Conversation_Manager generates a response, THE Voice_Engine SHALL convert text to speech and deliver audio with a total response latency of less than 2 seconds from end of client utterance
3. THE Transcription_Engine SHALL achieve a minimum word accuracy rate of 85% for English (UK accent) and Turkish in standard phone call audio conditions
4. WHILE a call is active, THE Transcription_Engine SHALL detect end-of-utterance boundaries to prevent the AI from interrupting the client
5. THE Voice_Engine SHALL support English (UK accent) and Turkish for both speech-to-text and text-to-speech

### Requirement 4: Human Handoff

**User Story:** As an Operator, I want the AI to transfer calls to me when it cannot handle a client's request, so that clients always get proper support.

#### Acceptance Criteria

1. WHEN the Conversation_Manager determines Human_Handoff is needed, THE Platform SHALL notify the Operator via the dashboard with call context (client name, conversation summary, reason for handoff)
2. IF an Operator accepts the handoff within 30 seconds, THEN THE Voice_Engine SHALL transfer the active call to the Operator's phone
3. IF no Operator accepts within 30 seconds, THEN THE Conversation_Manager SHALL inform the client that someone will call them back and end the call with outcome 'handoff_missed'
4. WHEN Human_Handoff occurs, THE Platform SHALL provide the Operator with a text summary of the conversation so far
5. THE Platform SHALL support a maximum of 1 concurrent handoff queue per Operator (MVP simplicity)

### Requirement 5: Call Recording and Transcription

**User Story:** As an Operator, I want all AI calls recorded and transcribed, so that I can review what was said and ensure quality.

#### Acceptance Criteria

1. WHEN a call begins, THE Voice_Engine SHALL start recording the call audio
2. WHEN a call ends, THE Transcription_Engine SHALL produce a complete text transcript within 60 seconds of call completion
3. THE Platform SHALL store call recordings and transcripts accessible from the operator dashboard, organized by Campaign and client
4. THE Platform SHALL retain recordings for 90 days by default
5. WHEN a client requests recording to stop during the call, THE Voice_Engine SHALL stop recording and note this in the call metadata

### Requirement 6: PracticeNudge Integration

**User Story:** As a PracticeNudge user, I want the AI Communication Hub to pull client data from PracticeNudge and push call outcomes back, so that everything stays in sync without manual data entry.

#### Acceptance Criteria

1. WHEN an Operator creates a Campaign, THE Platform SHALL accept client context from PracticeNudge including: client name, phone number, outstanding documents list, and deadline dates
2. WHEN a call completes, THE Platform SHALL send a callback to PracticeNudge via API with the call outcome (reached, no_answer, document_promised, refused, handoff_completed)
3. THE Platform SHALL map PracticeNudge client IDs to call records so that outcomes are linked to the correct client in PracticeNudge
4. THE Platform SHALL accept campaign trigger requests from PracticeNudge via a REST API endpoint (POST /api/campaigns/trigger)
5. WHEN PracticeNudge sends updated client data (e.g., document submitted since campaign started), THE Platform SHALL skip calling that client if the call has not yet been initiated

### Requirement 7: Operator Dashboard

**User Story:** As an Operator, I want a dedicated dashboard to manage campaigns, view call outcomes, listen to recordings, and handle handoffs, so that I have full visibility into the AI's work.

#### Acceptance Criteria

1. THE Platform SHALL provide a web-based dashboard (separate application) where Operators can create campaigns, upload client lists, and start/pause campaigns
2. THE Platform SHALL display real-time campaign progress showing: calls completed, calls in progress, calls remaining, and outcome breakdown
3. THE Platform SHALL provide a call history view where Operators can see each call's outcome, listen to the recording, and read the transcript
4. WHEN a Human_Handoff is requested, THE dashboard SHALL display a real-time notification with client context and accept/decline buttons
5. THE Platform SHALL provide a campaign results summary exportable as CSV with columns: client name, phone, outcome, duration, summary, timestamp

### Requirement 8: Voice Persona and Language

**User Story:** As an Operator, I want to choose the AI voice language and style, so that clients hear a professional voice appropriate for their language preference.

#### Acceptance Criteria

1. THE Platform SHALL provide at minimum 2 pre-configured Voice_Personas: one English (UK professional) and one Turkish (professional)
2. WHEN creating a Campaign, THE Operator SHALL be able to select the Voice_Persona (language) for all calls in that Campaign
3. WHILE a call is active, THE Voice_Engine SHALL maintain consistent voice characteristics throughout the entire call
4. THE Platform SHALL allow per-client language override within a Campaign CSV (optional 'language' column defaulting to Campaign-level setting)

