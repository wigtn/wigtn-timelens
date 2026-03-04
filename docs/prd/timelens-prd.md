# TimeLens PRD - AI Cultural Heritage Companion

> **Hackathon**: Gemini Live Agent Challenge ($80K Prize Pool)
> **Deadline**: March 16, 2026
> **Track**: Best Overall Agent
> **Version**: 1.0
> **Last Updated**: 2026-03-04

---

## Table of Contents

1. [Overview](#1-overview)
2. [User Stories](#2-user-stories)
3. [Acceptance Criteria](#3-acceptance-criteria)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Technical Architecture](#6-technical-architecture)
7. [Implementation Phases](#7-implementation-phases)
8. [Hackathon Submission Mapping](#8-hackathon-submission-mapping)
9. [Demo Script](#9-demo-script)
10. [Risk Assessment](#10-risk-assessment)
11. [Appendix](#11-appendix)

---

## 1. Overview

### 1.1 Problem Statement

Museums hold humanity's greatest treasures — yet the visitor experience is fundamentally broken. A tourist stands before a 3,000-year-old Egyptian sarcophagus, reads a 50-word placard, and moves on. A student stares at a cracked Greek vase, unable to imagine it whole. The gap between *seeing* and *understanding* is vast:

- **Information Access Gap**: 73% of museum visitors leave without understanding the historical significance of what they saw (AAM Survey 2024). Placards are too short; audio guides are rigid and outdated
- **Audio Guide Linearity Problem**: Traditional audio guides force users to listen from start to finish. To answer a single question like "When was this made?", you must sit through 3 minutes of narration. Text can be scanned; audio cannot — there is no way to quickly jump to the key facts you care about
- **Imagination Gap**: Broken artifacts, faded paintings, damaged sculptures — visitors cannot visualize what these treasures looked like when they were new. A shattered pottery fragment was once a vibrant ceremonial vessel; a weathered marble statue was once painted in vivid colors
- **Context Gap**: Artifacts are displayed in isolation. Visitors don't understand the civilization, the daily life, or the story behind the object in front of them
- **Discovery Gap**: Museums and nearby cultural sites go unnoticed; visitors miss 60% of heritage within 1km radius
- **Memory Gap**: Experiences fade within weeks; photos of glass cases lack narrative context

### 1.2 Solution

**TimeLens** is an AI-powered museum and cultural heritage companion that transforms passive viewing into an interactive, multi-sensory exploration. Using Gemini's cutting-edge AI capabilities, TimeLens delivers:

1. **Real-time AI Curator** — Point your camera at any museum artifact, painting, or sculpture; receive instant voice narration with the depth of a world-class museum docent. Beyond audio alone, an **Interactive Knowledge Panel** displays key information visually in a chat-like UI — grasp "era, purpose, key facts" in 3 seconds without listening to 3 minutes of narration
2. **Artifact Restoration** — See damaged, broken, or faded artifacts restored to their original condition through AI-generated imagery with interactive before/after comparison (broken pottery → complete vessel, faded fresco → vibrant original)
3. **Nearby Discovery** — GPS-powered exploration of surrounding museums and cultural heritage sites
4. **Museum Diary** — Auto-generated illustrated journal combining your exhibit photos, AI insights, and restored artifact imagery

### 1.3 Value Proposition

| Stakeholder | Value |
|---|---|
| **Museum Visitor** | Every artifact becomes a conversation — ask anything, in any language, get instant expert-level answers with visual restoration |
| **Educator** | Classroom-grade historical content delivered through engaging visual + conversational AI; show students what artifacts looked like when new |
| **Museum** | Increases visitor engagement and dwell time without infrastructure investment; works alongside existing exhibit labels |
| **Hackathon Judges** | Demonstrates 9 Gemini features in a cohesive, production-quality agent system |

### 1.4 Competitive Analysis

| Competitor | Approach | Weakness | TimeLens Advantage |
|---|---|---|---|
| Google Arts & Culture | Pre-curated content | No real-time interaction, no user-camera input, limited to partnered museums | Real-time vision + voice conversation at any museum |
| Smartify | QR/barcode scan | Requires museum partnership, only works on labeled exhibits | Works on any artifact, zero museum setup needed |
| Generic ChatGPT + Camera | Text chat with photo upload | No streaming, high latency, no voice, no artifact restoration | Sub-second voice + artifact restoration imagery |
| Traditional Audio Guide | Pre-recorded narration | Fixed script, no follow-up questions, no visual enhancement, **cannot skip to key facts — must listen start-to-finish** | Dynamic conversation with interrupts + visual artifact restoration + **chat-style knowledge panel for instant text access to key information** |
| **No competitor** | Artifact restoration | No existing product restores damaged artifacts visually in real-time | **Unique: broken → complete, faded → vibrant via AI image gen** |

### 1.5 Track Strategy: Best Overall Agent

The "Best Overall Agent" track prioritizes:
1. **Breadth of Gemini feature usage** — TimeLens uses 9 features (maximum coverage)
2. **Agent sophistication** — ADK Multi-Agent with 4 specialized agents + orchestrator
3. **Real-world utility** — Solves a genuine problem for 100K+ museums worldwide and 1.4B annual heritage visitors
4. **Production readiness** — Deployed on GCP, accessible via URL, mobile-optimized

---

## 2. User Stories

### 2.1 Persona: Museum Visitor (Primary)

> *"I'm at the British Museum staring at the Rosetta Stone. The placard tells me almost nothing. I want to understand what I'm really looking at."*

| ID | User Story | Priority |
|---|---|---|
| US-01 | As a Museum Visitor, I want to point my phone at a museum artifact and receive an immediate voice explanation so I can learn without reading tiny placards | P0 |
| US-02 | As a Museum Visitor, I want to ask follow-up questions mid-narration (interrupt) like "What was this used for?" or "How old is this?" so I can explore my curiosity | P0 |
| US-12 | As a Museum Visitor, I want to **instantly see key information (era, purpose, significance) as text** without listening to the entire audio guide from start to finish — so I can quickly scan the essentials and dive deeper only into topics I care about | P0 |
| US-03 | As a Museum Visitor, I want to see what a damaged or incomplete artifact looked like when it was new (e.g., broken pottery → complete vessel, faded painting → original colors, headless statue → full figure) | P0 |
| US-04 | As a Museum Visitor, I want to discover nearby museums and cultural sites I might have missed so I can maximize my trip | P1 |
| US-05 | As a Museum Visitor, I want a museum diary auto-generated from my visit with artifact photos and AI insights so I can share and remember the experience | P1 |
| US-06 | As a Museum Visitor, I want the AI to speak in my preferred language so I can understand exhibits in any country's museum | P0 |
| US-10 | As a Museum Visitor, I want to understand the cultural context behind an artifact — who made it, how it was used in daily life, what civilization it belonged to | P0 |
| US-11 | As a Museum Visitor, I want to compare artifacts across eras (e.g., "How does this Greek vase compare to Roman ones?") through natural conversation | P1 |

### 2.2 Persona: Educator

> *"I'm a history teacher preparing a virtual field trip. I need accurate, engaging content I can use in class."*

| ID | User Story | Priority |
|---|---|---|
| US-07 | As an Educator, I want to upload images of artifacts and receive detailed historical context so I can create lesson materials | P1 |
| US-08 | As an Educator, I want AI-verified information grounded in search results so I can trust the accuracy for educational use | P0 |
| US-09 | As an Educator, I want artifact restoration images to show students what ancient objects looked like when they were created — not just their current damaged state | P1 |

---

## 3. Acceptance Criteria

### 3.1 BDD Scenarios

```gherkin
Feature: Real-time Museum Artifact Recognition and Exploration

  Scenario: User points camera at a museum artifact
    Given the user has granted camera and microphone permissions
    And the Live API WebSocket connection is established
    When the user points their camera at a Greek amphora in a museum display case
    Then the Curator Agent identifies the artifact within 3 seconds
    And begins voice narration about its origin, era, craftsmanship, and cultural significance
    And the narration is grounded with Google Search results

  Scenario: User asks a follow-up question mid-narration
    Given the Curator Agent is narrating about a displayed artifact
    When the user interrupts with "What was this actually used for in daily life?"
    Then the agent stops current narration within 500ms
    And responds to the follow-up question with culturally rich context
    And resumes contextual awareness of the original artifact

  Scenario: User quickly scans key information (Interactive Knowledge Panel)
    Given the user has pointed the camera at a museum artifact
    And the Curator Agent has identified the artifact
    Then the UI immediately displays a summary card (name, era, one-line key description)
    And voice narration begins simultaneously, but the user can grasp key facts via text within 3 seconds
    When the user taps the "Purpose" topic on the summary card
    Then a detailed explanation for that topic expands in a chat-style format
    And the user can explore information at their own depth without listening to the full audio narration

  Scenario: User requests artifact restoration
    Given the user is viewing a damaged artifact through the camera
    When the user says "Show me what this looked like when it was new"
    Then the Orchestrator routes to the Restoration Agent
    And the Restoration Agent generates a restored image within 10 seconds
    And the UI displays a before/after slider comparison
    Examples:
      | Current State               | Restored State                              |
      | Cracked Greek vase          | Complete vessel with original painted motifs |
      | Headless marble statue      | Full figure with original polychrome paint   |
      | Faded Renaissance fresco    | Vivid original colors and detail             |
      | Corroded bronze artifact    | Gleaming bronze with original patina         |
      | Fragmented mosaic floor     | Complete mosaic with full pattern             |

  Scenario: User points camera at an outdoor monument
    Given the user is outside a museum near a heritage site
    When the user points their camera at a historical building or ruins
    Then the Curator Agent identifies the structure within 3 seconds
    And provides historical context about the site
    And the user can request time reconstruction to see the original state

  Scenario: Nearby museum and heritage discovery
    Given the user has granted location permissions
    When the user says "What other museums or sites are nearby?"
    Then the Discovery Agent queries Google Places API
    And returns up to 5 museums and cultural heritage sites within 2km
    And each result includes distance, brief description, and walking time

  Scenario: Museum diary generation
    Given the user has viewed at least 3 artifacts in the current session
    When the user says "Create my museum diary"
    Then the Diary Agent generates an interleaved text + image journal
    And includes AI-generated summaries for each artifact viewed
    And includes at least one AI-restored illustration per artifact
    And organizes entries by the order of the museum visit

  Scenario: Session resumption after timeout
    Given the user's Live API session has been idle for 15 minutes
    When the session times out and the user returns
    Then the system automatically re-establishes the WebSocket connection
    And restores the conversation context from Firestore
    And the user can continue exploring artifacts seamlessly
```

---

## 4. Functional Requirements

### 4.1 P0 - Must Have (MVP for Demo)

| ID | Requirement | Gemini Features Used |
|---|---|---|
| FR-01 | **Live Voice Conversation**: Bidirectional audio streaming between user and Curator Agent via Gemini Live API | Live API, Native Audio |
| FR-01a | **Interactive Knowledge Panel**: Alongside voice narration, display key information visually in a chat-style text UI. On artifact recognition, immediately show a **summary card** (name, era, one-line description) so users can grasp essentials in 3 seconds. Users can tap specific topics to expand into deeper chat-based conversation on that subject only. Solves the audio guide linearity problem by giving users non-linear, scannable access to information | Live API, Native Audio |
| FR-02 | **Real-time Vision Recognition**: Continuous camera frame analysis for museum artifact identification (pottery, sculptures, paintings, weapons, jewelry, inscriptions, textiles) and outdoor monument recognition | Live API, Vision |
| FR-03 | **Search Grounding**: All factual responses verified against Google Search for accuracy | Google Search Grounding |
| FR-04 | **Voice Interrupt**: User can interrupt AI narration at any point; agent responds to new input within 500ms | Live API |
| FR-05 | **Artifact Restoration & Time Reconstruction**: Generate before/after images showing damaged artifacts restored to original condition (broken pottery → complete, faded paintings → vibrant, ruins → original structure) | Image Generation |
| FR-06 | **Before/After UI Slider**: Interactive comparison slider for time reconstruction images | - |
| FR-07 | **Multi-Agent Orchestration**: Orchestrator routes user intent to appropriate specialist agent | ADK Multi-Agent |
| FR-08 | **Session Resumption**: Auto-reconnect WebSocket with context preservation after timeout | Session Resumption |
| FR-09 | **Multi-language Support**: AI responds in user's detected or selected language | Native Audio |

### 4.2 P1 - Should Have

| ID | Requirement | Gemini Features Used |
|---|---|---|
| FR-10 | **GPS Nearby Discovery**: Discover nearby museums and cultural heritage sites within configurable radius | Google Search Grounding |
| FR-11 | **Museum Diary Generation**: Auto-generate illustrated museum visit diary with interleaved text + restored artifact images | Interleaved Output, Image Generation |
| FR-12 | **Context Window Compression**: Compress long conversation history to extend session duration | Context Window Compression |
| FR-13 | **Visit History**: Persist visited sites and conversations in Firestore | - |
| FR-14 | **Share Diary**: Export diary as shareable link or PDF | - |

### 4.3 P2 - Nice to Have

| ID | Requirement | Gemini Features Used |
|---|---|---|
| FR-15 | **AR Overlay**: Overlay reconstruction image on camera feed | - |
| FR-16 | **Collaborative Mode**: Multiple users share a guided session | - |
| FR-17 | **Offline Mode**: Cache previously visited site data for offline access | - |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Metric | Target | Rationale |
|---|---|---|
| Voice Response Latency | < 1.5s (first byte) | Conversational feel requires near-real-time |
| Vision Recognition | < 3s | User patience threshold for camera recognition |
| Image Generation | < 15s | Acceptable wait with loading animation |
| WebSocket Reconnect | < 2s | Seamless experience on network interruption |
| Time to Interactive (TTI) | < 3s on 4G | Mobile-first performance |
| Lighthouse Performance | > 85 | Submission quality bar |

### 5.2 Security

| Requirement | Implementation |
|---|---|
| API Key Protection | Server-side proxy; no Gemini API keys exposed to client |
| Camera/Mic Permissions | Explicit user consent via Permissions API; no auto-activation |
| Data Privacy | No camera frames stored server-side; processed in-memory only |
| Auth | Firebase Anonymous Auth for session tracking; no PII collection |
| HTTPS | All traffic encrypted; enforced via Cloud Run |

### 5.3 Reliability

| Requirement | Target |
|---|---|
| Uptime during demo | 99.9% (GCP Cloud Run auto-scaling) |
| Graceful Degradation | If Live API fails → fallback to text chat + Gemini 2.5 Flash |
| Error Recovery | Auto-retry WebSocket 3x with exponential backoff |
| Session Persistence | Firestore with 24h TTL for session data |

### 5.4 Compatibility

| Platform | Minimum Version |
|---|---|
| Chrome (Android) | 90+ |
| Safari (iOS) | 15.4+ (MediaDevices API support) |
| Chrome (Desktop) | 90+ |
| Screen Size | 360px - 1440px (responsive) |

---

## 6. Technical Architecture

### 6.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Next.js PWA)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │  Camera   │  │   Mic    │  │   GPS    │  │     React UI       │  │
│  │  Module   │  │  Module  │  │  Module  │  │  (Mobile-First)    │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬───────────┘  │
│       │              │             │                  │              │
│  ┌────▼──────────────▼─────────────▼──────────────────▼───────────┐  │
│  │              WebSocket Manager + REST Client                   │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
└───────────────────────────────┼──────────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │    Cloud Run (API)     │
                    │    Next.js Server      │
                    └───────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                  │
    ┌─────────▼────────┐ ┌─────▼──────┐ ┌────────▼────────┐
    │  Pipeline 1       │ │  Pipeline 2 │ │  External APIs   │
    │  Gemini Live API  │ │  Gemini 2.5 │ │                  │
    │  (Bidi Streaming) │ │  Flash Image│ │  - Places API    │
    │                   │ │  (REST)     │ │  - Geocoding API │
    │  - Audio In/Out   │ │             │ │                  │
    │  - Video Frames   │ │  - Image    │ │                  │
    │  - Tool Calls     │ │    Gen      │ │                  │
    │                   │ │  - Interl.  │ │                  │
    │                   │ │    Output   │ │                  │
    └─────────┬────────┘ └─────┬──────┘ └────────┬────────┘
              │                │                  │
              └────────────────┼──────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │     Firestore       │
                    │  - Sessions         │
                    │  - Visit History    │
                    │  - Diary Entries    │
                    └─────────────────────┘
```

### 6.2 Dual Pipeline Architecture

TimeLens employs a **Dual Pipeline** design to leverage both real-time streaming and batch image generation capabilities of Gemini:

#### Pipeline 1: Real-time Streaming (Gemini Live API)

```
User Mic ──► PCM 16kHz ──► WebSocket ──► Live API ──► Audio Response
User Camera ──► JPEG 1fps ──► WebSocket ──► Live API ──► Vision Analysis
                                                    ──► Tool Calls ─── ► Pipeline 2
```

- **Protocol**: WebSocket (bidirectional streaming)
- **Model**: `gemini-2.0-flash-live` (or latest Live API model)
- **Input**: Interleaved audio (PCM 16-bit, 16kHz mono) + video frames (JPEG, 1fps, 768px max)
- **Output**: Audio stream (PCM 24kHz) + text transcript + tool call events
- **Features Used**: Live API, Vision, Native Audio, Google Search Grounding, Session Resumption, Context Window Compression

#### Pipeline 2: Batch Image Generation (Gemini 2.5 Flash)

```
Tool Call Event ──► REST API ──► Gemini 2.5 Flash ──► Generated Image
                                                  ──► Interleaved Text + Image
```

- **Protocol**: REST (request/response)
- **Model**: `gemini-2.5-flash-preview-image-generation` (or latest image gen model)
- **Input**: Text prompt + optional reference image (base64)
- **Output**: Generated image (PNG/JPEG) + text
- **Features Used**: Image Generation, Interleaved Output

#### Pipeline Synchronization: Function Calling Bridge

```
Live API Session                          REST API
     │                                       │
     ├── User: "Show me what it looked       │
     │   like when it was new"               │
     │                                       │
     ├── Tool Call: generate_restoration      │
     │   {artifact: "Athenian red-figure     │
     │    krater", era: "460 BC",            │
     │    damage: "cracks, faded paint,      │
     │    missing handle"}                   │
     │        │                              │
     │        └──────────────────────────────►├── POST /restore
     │                                       │   model: gemini-2.5-flash
     │   ◄── Tool Response ──────────────────┤   response: {image_url}
     │                                       │
     ├── Audio: "Here's your krater as it    │
     │   would have appeared fresh from      │
     │   the workshop in 460 BC Athens..."   │
     │                                       │
     └── Client receives image_url via       │
         tool call result → renders slider   │
```

### 6.3 ADK Multi-Agent Design

```
                    ┌───────────────────────┐
                    │     Orchestrator      │
                    │  (Intent Router)      │
                    │                       │
                    │  Analyzes user intent  │
                    │  via Live API input   │
                    └───────┬───────────────┘
                            │
            ┌───────────────┼───────────────┬──────────────────┐
            │               │               │                  │
   ┌────────▼────────┐ ┌───▼──────────┐ ┌──▼───────────┐ ┌───▼──────────┐
   │  Curator Agent  │ │ Restoration  │ │  Discovery   │ │  Diary       │
   │                 │ │ Agent        │ │  Agent       │ │  Agent       │
   │ - Live API      │ │              │ │              │ │              │
   │ - Vision        │ │ - Image Gen  │ │ - Places API │ │ - Interleaved│
   │ - Search Ground │ │ - Before/    │ │ - Geocoding  │ │   Output     │
   │ - Native Audio  │ │   After      │ │ - Search     │ │ - Image Gen  │
   │ - Session Resume│ │              │ │   Grounding  │ │              │
   │ - Context Comp. │ │              │ │              │ │              │
   └─────────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

#### Agent Specifications

**Orchestrator**
- **Role**: Intercepts all user input, determines intent, and routes to the appropriate specialist agent
- **Routing Logic**:
  - Artifact/building recognition / general questions / "Tell me about this" → Curator
  - "Show me the original" / "What did this look like new" / "Restore this" / restoration-related → Restoration
  - "What museums are nearby" / "Other sites" / location-related → Discovery
  - "Create diary" / "Summarize my visit" / "Museum diary" → Diary
- **Implementation**: ADK `Agent` with routing function calls defined as tools

**Curator Agent**
- **Role**: Primary conversational agent for real-time heritage exploration
- **Pipeline**: Pipeline 1 (Live API)
- **System Prompt Strategy**:
  ```
  You are TimeLens Curator, a world-class museum docent and cultural heritage expert.
  You speak like a passionate curator — knowledgeable yet accessible, storytelling-driven.

  Behaviors:
  - Analyze camera frames to identify museum artifacts: pottery, sculptures,
    paintings, weapons, jewelry, inscriptions, textiles, fossils, coins, masks
  - Also recognize outdoor monuments, buildings, ruins, and architectural features
  - Provide rich historical context: origin, era, civilization, craftsmanship,
    cultural significance, daily-life usage — grounded in Google Search
  - When describing artifacts, paint a vivid picture of the world they came from
    ("This amphora would have held wine at a symposium in 5th-century Athens...")
  - Support natural conversation with follow-up questions
  - Speak in the user's language (auto-detect or user-specified)
  - On artifact recognition, immediately generate a structured summary card:
    {name, era, civilization, one-line description, 3 key topics}
    — displayed as text in the UI alongside voice narration so users can
    instantly grasp key facts without listening to the full audio
  - Display voice narration content simultaneously as chat-style text
  - When user taps a specific topic, expand into deeper conversation on that topic only
  - When user requests restoration/reconstruction, call generate_restoration tool
  - When user asks about nearby museums/sites, call discover_nearby tool
  ```
- **Tools Available**:
  - `generate_restoration(artifact_name, era, artifact_type, damage_description)` → triggers Restoration Agent
  - `discover_nearby(lat, lng, radius_km)` → triggers Discovery Agent
  - `create_diary(session_id)` → triggers Diary Agent
  - `google_search(query)` → Search Grounding

**Restoration Agent**
- **Role**: Generates historically accurate restoration images for damaged artifacts and heritage sites
- **Pipeline**: Pipeline 2 (Gemini 2.5 Flash Image)
- **Input**: Artifact/site identification + era + damage description + current photo (optional reference)
- **Output**: Restored/reconstructed image + descriptive text
- **Restoration Categories**:
  | Category | Example Input | Example Output |
  |---|---|---|
  | Broken pottery/ceramics | Cracked Greek amphora with missing handles | Complete vessel with painted mythological scenes |
  | Damaged sculptures | Headless marble statue, missing arms | Full figure with original polychrome paint |
  | Faded paintings/frescoes | Deteriorated Renaissance fresco | Vibrant original colors and crisp details |
  | Corroded metals | Green-patinated bronze helmet | Gleaming bronze with original finish |
  | Fragmented mosaics | Incomplete Roman floor mosaic | Full mosaic with complete pattern |
  | Ruined architecture | Collapsed temple columns | Intact temple with roof and decorations |
- **Prompt Template (Artifact)**:
  ```
  Generate a photorealistic image of {artifact_name} as it appeared when newly
  created in {era}.

  Artifact type: {artifact_type}
  Historical context: {search_grounded_context}
  Current condition: {damage_description}

  Requirements:
  - Historically accurate restoration based on archaeological records
  - Same viewing angle as the reference photo
  - Show the artifact in pristine, newly-made condition
  - Vivid colors and materials as they would have appeared originally
  - Fine detail on craftsmanship, engravings, paintwork
  ```
- **Prompt Template (Architecture)**:
  ```
  Generate a photorealistic image of {site_name} as it appeared in {era}.

  Historical context: {search_grounded_context}
  Reference: The current state shows {current_description}.

  Requirements:
  - Architecturally accurate based on historical records
  - Same viewing angle as the reference photo
  - Vivid colors reflecting the original paintwork and materials
  - Include period-appropriate surroundings (people, vegetation, sky)
  ```

**Discovery Agent**
- **Role**: Finds and recommends nearby museums and cultural heritage sites
- **Pipeline**: Pipeline 2 (REST) + Google Places API
- **Input**: User GPS coordinates + radius + optional interest filter (e.g., "ancient Egyptian", "modern art")
- **Output**: List of nearby museums and heritage sites with metadata
- **Data Sources**: Google Places API (type: `museum`, `art_gallery`, `tourist_attraction`, `church`, `hindu_temple`, `synagogue`, `mosque`) + Google Search Grounding for descriptions
- **Museum-specific enrichment**: For each museum result, include current exhibitions, notable collections, and opening hours via Search Grounding

**Diary Agent**
- **Role**: Generates illustrated museum visit journal from session history
- **Pipeline**: Pipeline 2 (Gemini 2.5 Flash with Interleaved Output)
- **Input**: Session visit history (artifacts viewed, conversations, photos, restorations)
- **Output**: Markdown-formatted diary with interleaved text narratives and AI-generated illustrations
- **Interleaved Output Format**:
  ```
  [Text: "A Morning at the British Museum — Room 4: Egyptian Sculpture"]
  [Image: AI-generated watercolor illustration of the museum gallery]
  [Text: "The Rosetta Stone stands behind glass, smaller than expected
   but infinitely more significant. Carved in 196 BC, this granodiorite
   slab unlocked the entire Egyptian hieroglyphic system..."]
  [Image: Restoration — the Rosetta Stone as it appeared when newly carved]
  [Text: "In the adjacent room, a cracked Athenian red-figure krater
   caught my eye. TimeLens showed me what it looked like 2,500 years ago..."]
  [Image: Before/After — cracked krater → complete vessel with vivid scenes]
  [Text: "Walking 10 minutes east, I discovered the Sir John Soane's Museum..."]
  [Image: AI-generated sketch of the museum facade]
  ```

### 6.4 WebSocket Protocol

#### Client → Server Messages

```typescript
// Establish Live API session
interface SessionConfig {
  type: 'session.config';
  payload: {
    language: string;        // e.g., 'en', 'ko', 'ja'
    sessionId?: string;      // for session resumption
  };
}

// Audio chunk from microphone
interface AudioInput {
  type: 'audio.input';
  payload: {
    data: string;            // base64-encoded PCM 16-bit 16kHz mono
    timestamp: number;
  };
}

// Camera frame
interface VideoFrame {
  type: 'video.frame';
  payload: {
    data: string;            // base64-encoded JPEG (max 768px)
    timestamp: number;
  };
}

// User interrupt signal
interface Interrupt {
  type: 'audio.interrupt';
}
```

#### Server → Client Messages

```typescript
// Audio response chunk
interface AudioOutput {
  type: 'audio.output';
  payload: {
    data: string;            // base64-encoded PCM 24kHz
    transcript?: string;     // optional text transcript
  };
}

// Tool call result (e.g., reconstruction image)
interface ToolResult {
  type: 'tool.result';
  payload: {
    tool: 'generate_restoration' | 'discover_nearby' | 'create_diary';
    result: Record<string, unknown>;
  };
}

// Session status updates
interface SessionStatus {
  type: 'session.status';
  payload: {
    status: 'connected' | 'reconnecting' | 'expired';
    sessionId: string;
    expiresAt?: number;
  };
}

// Agent routing notification
interface AgentSwitch {
  type: 'agent.switch';
  payload: {
    from: string;
    to: string;
    reason: string;
  };
}
```

### 6.5 REST API

| Method | Endpoint | Description | Request | Response |
|---|---|---|---|---|
| POST | `/api/session` | Create new session | `{ language, userId? }` | `{ sessionId, wsUrl, expiresAt }` |
| POST | `/api/session/resume` | Resume expired session | `{ sessionId }` | `{ wsUrl, context, expiresAt }` |
| POST | `/api/restore` | Generate artifact restoration / time reconstruction | `{ artifactName, era, artifactType?, damageDescription?, referenceImage? }` | `{ imageUrl, description }` |
| GET | `/api/discover` | Nearby museum and heritage discovery | `?lat=&lng=&radius=&type=` | `{ sites: Site[] }` |
| POST | `/api/diary/generate` | Generate museum visit diary | `{ sessionId }` | `{ diary: DiaryEntry[] }` |
| GET | `/api/diary/:id` | Get generated diary | - | `{ diary: DiaryEntry[] }` |
| GET | `/api/health` | Health check | - | `{ status, version, uptime }` |

### 6.6 Firestore Data Model

```typescript
// Collection: sessions
interface Session {
  id: string;                          // auto-generated
  userId: string;                      // Firebase Anonymous Auth UID
  language: string;
  status: 'active' | 'paused' | 'completed';
  liveApiSessionId?: string;           // Gemini Live API session handle
  contextSnapshot?: string;            // compressed context for resumption
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp;               // TTL: 24h
}

// Collection: sessions/{sessionId}/visits
interface Visit {
  id: string;
  itemName: string;                    // artifact name or site name
  location: GeoPoint;
  venueName?: string;                  // e.g., "British Museum", "Room 4"
  recognizedAt: Timestamp;
  conversationSummary: string;         // compressed by Context Window Compression
  restorationImageUrl?: string;        // AI-restored artifact image
  userPhotoUrl?: string;               // uploaded to Cloud Storage
  metadata: {
    era?: string;
    category: 'artifact' | 'monument' | 'building' | 'painting' | 'sculpture';
    artifactType?: string;             // 'pottery' | 'sculpture' | 'painting' | 'weapon' | 'jewelry' | 'textile' | 'coin' | 'mosaic' | 'inscription'
    material?: string;                 // 'marble' | 'bronze' | 'ceramic' | 'gold' | 'stone'
    civilization?: string;             // 'Greek' | 'Roman' | 'Egyptian' | 'Mesopotamian' | etc.
    damageDescription?: string;        // for restoration reference
    searchGroundingSources?: string[];
  };
}

// Collection: diaries
interface Diary {
  id: string;
  sessionId: string;
  userId: string;
  title: string;
  entries: DiaryEntry[];
  createdAt: Timestamp;
  shareToken?: string;                // for public sharing
}

interface DiaryEntry {
  type: 'text' | 'image';
  content: string;                    // markdown text or image URL
  siteName?: string;
  order: number;
}
```

### 6.7 Key Design Decisions

| # | Decision | Choice | Rationale | Alternatives Considered |
|---|---|---|---|---|
| 1 | **Platform** | Next.js Mobile Web (PWA) | Zero install friction; judge clicks URL → instant access; no app store review risk | React Native (Expo) — rejected due to app store review timeline |
| 2 | **Real-time Communication** | Gemini Live API (WebSocket) | Native bidi audio+video streaming; < 1s latency; built-in turn detection | WebRTC → unnecessary complexity; REST polling → too slow |
| 3 | **Image Generation** | Gemini 2.5 Flash (Image) | Single vendor (Gemini ecosystem); interleaved output support; no additional API key | DALL-E 3, Stable Diffusion → separate service, no interleaved output |
| 4 | **Agent Framework** | Google ADK | Required by hackathon; native Gemini integration; multi-agent orchestration | LangGraph, CrewAI → not Gemini-native, loses hackathon points |
| 5 | **Database** | Firestore | Serverless, real-time sync, GCP-native, free tier sufficient for hackathon | Supabase → non-GCP; Redis → no persistence |
| 6 | **Deployment** | Cloud Run | Serverless, auto-scaling, WebSocket support, GCP requirement met | Cloud Functions → no WebSocket; GKE → overkill |

---

## 7. Implementation Phases

### 10-Day Sprint Plan

```
Day   Phase                    Deliverables                               Risk
─────────────────────────────────────────────────────────────────────────────────
 1    Project Setup + PoC      Next.js scaffold, GCP project,            LOW
                               Live API WebSocket hello-world,
                               Camera + Mic permissions working

 2    Core Voice Pipeline      Audio capture → Live API → Audio           MED
                               playback loop, basic conversation
                               working end-to-end

 3    Vision + Search          Camera frames → Live API Vision,           MED
                               Google Search Grounding integrated,
                               Curator Agent system prompt tuned

 4    Multi-Agent Setup        ADK Orchestrator + Agent routing,          HIGH
                               Function Calling Bridge between
                               Pipeline 1 and Pipeline 2

 5    Artifact Restoration     Restoration Agent, Gemini 2.5 Flash        MED
                               Image Gen, Before/After slider UI,
                               artifact restoration prompts tested

 6    Discovery Agent          GPS integration, Places API,               LOW
                               Nearby sites list UI,
                               Search Grounding for descriptions

 7    Diary Agent              Interleaved Output integration,            MED
                               Diary generation + rendering,
                               Session visit history tracking

 8    Session + Polish         Session Resumption, Context Window         MED
                               Compression, error handling,
                               loading states, fallback flows

 9    Demo Preparation         Demo script rehearsal, screen              LOW
                               recording setup, edge case fixes,
                               performance optimization

10    Submission               Final demo recording (4 min),              LOW
                               README + architecture diagram,
                               GCP deployment verification,
                               Devpost submission

11-12 Buffer                   Bug fixes, demo re-recording if            -
                               needed, submission polish
```

### Phase Details

#### Day 1: Project Setup + PoC
- [ ] Initialize Next.js 15 project with App Router
- [ ] Configure Tailwind CSS + shadcn/ui
- [ ] Create GCP project + enable APIs (Gemini, Places, Geocoding)
- [ ] Set up Firebase (Auth, Firestore, Storage)
- [ ] Implement Live API WebSocket connection PoC
- [ ] Camera access via MediaDevices API
- [ ] Microphone access + PCM encoding
- [ ] Deploy to Cloud Run (CI/CD via Cloud Build)
- **Exit Criteria**: Can establish Live API connection and send/receive audio

#### Day 2-3: Core Voice Pipeline
- [ ] Audio capture pipeline (MediaRecorder → PCM 16kHz → base64)
- [ ] Audio playback pipeline (base64 → PCM 24kHz → AudioContext)
- [ ] WebSocket message protocol implementation
- [ ] Camera frame capture (1fps JPEG extraction from video stream)
- [ ] Curator Agent system prompt + personality
- [ ] Voice interrupt handling (server_content cancellation)
- [ ] Basic UI: camera viewfinder + audio visualizer + status indicator
- **Exit Criteria**: Can have natural voice conversation about camera-visible objects

#### Day 4-6: Multi-Agent + Reconstruction + Discovery
- [ ] ADK Orchestrator with intent routing
- [ ] Function Calling Bridge (Live API tool calls → REST Pipeline 2)
- [ ] Restoration Agent: artifact restoration + architecture reconstruction prompts
- [ ] Test restoration quality with 5+ artifact types (pottery, statue, fresco, bronze, mosaic)
- [ ] Before/After slider component (touch-friendly, animated)
- [ ] Discovery Agent: Places API integration + Search Grounding
- [ ] Nearby sites list UI (cards with distance, photo, description)
- [ ] GPS + Geolocation API integration
- [ ] Firestore session + visit tracking
- **Exit Criteria**: All 4 agents functional; artifact restoration generates quality before/after images

#### Day 7-8: Diary + Polish + Fallback
- [ ] Diary Agent: interleaved text + image generation
- [ ] Diary rendering UI (scrollable, shareable)
- [ ] Session Resumption implementation
- [ ] Context Window Compression for long sessions
- [ ] Error handling + graceful degradation (Live API → text fallback)
- [ ] Loading states + skeleton screens
- [ ] Mobile UI polish (safe areas, orientation, gestures)
- [ ] Firebase Anonymous Auth
- **Exit Criteria**: Complete user flow works end-to-end; fallbacks tested

#### Day 9-10: Demo + Submission
- [ ] Demo script finalization (see Section 9)
- [ ] Screen recording with voiceover (4 min max)
- [ ] Architecture diagram (clean SVG/PNG)
- [ ] README.md with setup instructions
- [ ] GCP deployment verified + URL accessible
- [ ] Devpost submission: text description, demo video, repo link, GCP proof
- **Exit Criteria**: Submission complete on Devpost before March 16

---

## 8. Hackathon Submission Mapping

### 8.1 Submission Requirements Coverage

| Requirement | Status | TimeLens Deliverable |
|---|---|---|
| **Text Description** | Covered | Section 1 (Overview) adapted for Devpost |
| **Code Repository** | Covered | GitHub repo (public or private with judge access) |
| **GCP Deployment Proof** | Covered | Cloud Run URL + GCP Console screenshot |
| **Architecture Diagram** | Covered | Section 6.1 diagram (exported as SVG) |
| **Demo Video** | Covered | 4-min video per Section 9 script |

### 8.2 Judging Criteria Mapping

| Criteria | Weight | TimeLens Strategy | Score Target |
|---|---|---|---|
| **Gemini API Usage** | High | 9 features used (maximum possible coverage) | 9/10 |
| **Agent Sophistication** | High | ADK Multi-Agent with 4 specialists + orchestrator, dual pipeline, function calling bridge | 9/10 |
| **Creativity & Innovation** | Medium | Museum artifact restoration (unique — no competitor does this), cultural heritage niche | 9/10 |
| **Real-world Utility** | Medium | 100K+ museums worldwide; zero-install web app; multi-language; works on any artifact | 8/10 |
| **Technical Execution** | High | Production deployment on GCP, WebSocket streaming, responsive mobile UI | 8/10 |
| **Demo Quality** | High | Scripted 4-min demo with killer moment (before/after slider) | 9/10 |

### 8.3 Gemini Feature Matrix (for Submission Description)

| # | Gemini Feature | Where Used | User-Facing Impact |
|---|---|---|---|
| 1 | **Live API** (bidi-streaming) | Curator Agent | Real-time voice + video conversation |
| 2 | **Vision** (image analysis) | Curator Agent | Instant artifact/building recognition |
| 3 | **Google Search Grounding** | Curator, Discovery | Verified, accurate historical information |
| 4 | **Image Generation** | Restoration Agent | Artifact restoration + time reconstruction (broken → complete, faded → vibrant) |
| 5 | **Interleaved Output** | Diary Agent | Rich text + image museum visit journals |
| 6 | **ADK Multi-Agent** | All Agents | Intelligent routing across 4 specialists |
| 7 | **Session Resumption** | All Agents | Seamless reconnection after timeout |
| 8 | **Context Window Compression** | Curator Agent | Extended conversation sessions |
| 9 | **Native Audio** | Curator Agent | Natural multi-language voice output |

---

## 9. Demo Script

### 4-Minute Video Breakdown

#### 0:00 - 0:30 | Hook + Problem Definition (30s)

```
[Screen: Title card "TimeLens - See History Come Alive"]

NARRATOR: "100,000 museums. Billions of artifacts. And this is
how we experience them..."

[Cut to: person in museum, squinting at a tiny placard next to
an ancient Greek vase, looking confused, moving on after 8 seconds]

"What if your phone could become the world's best museum docent —
one that sees what you see, tells the story behind every artifact,
and shows you what time has taken away?"

[Cut to: TimeLens app opening on phone inside a museum]
```

#### 0:30 - 1:30 | Museum Artifact Recognition + Voice Conversation (60s)

```
[Screen: User in museum, pointing phone at a cracked Athenian red-figure krater]

USER: *points camera at the vase*

TIMELENS (voice): "You're looking at an Athenian red-figure krater,
likely from around 460 BC. This was a mixing vessel — the ancient
Greeks never drank wine straight. At a symposium, a servant would
mix wine with water in a krater exactly like this one..."

[UI shows: "Athenian Red-Figure Krater, c.460 BC" + search grounding icon]

USER (interrupting): "What are those figures painted on it?"

TIMELENS (voice): "Great eye! Those scenes depict Hercules battling
the Nemean lion — one of his twelve labors. Notice the distinctive
red-figure technique: the artist painted the background black and
left the figures in the natural red clay color. This was actually
a revolutionary technique invented in Athens around 530 BC..."

[UI shows: real-time transcript, conversation flowing naturally]

USER: "It's so damaged though. Can you show me what it looked like new?"

TIMELENS: "Absolutely. Let me restore that for you..."
```

#### 1:30 - 2:15 | Artifact Restoration - KILLER MOMENT (45s)

```
[Screen: Loading animation "Restoring to 460 BC..."]

[Screen: Before/After slider appears]
- Left side: Current cracked krater (photo from camera) —
  cracks visible, paint faded, pieces missing
- Right side: AI-generated pristine krater — vivid red figures
  on glossy black, complete handles, sharp details, no damage

[User drags slider back and forth — dramatic reveal]

TIMELENS (voice): "Here's your krater as it would have appeared
fresh from the potter's workshop in 460 BC Athens. Notice the
sharp, vivid red figures — Hercules' muscles are clearly defined.
The glossy black slip would have gleamed like lacquer..."

[Quick montage: slider on 3 more artifacts]
- Headless marble statue → complete figure with painted colors
- Corroded bronze helmet → gleaming original
- Faded Egyptian papyrus → vivid hieroglyphics

NARRATOR: "TimeLens doesn't just tell you about artifacts —
it shows you what time has erased."
```

#### 2:15 - 2:50 | GPS Nearby Discovery (35s)

```
[Screen: User steps outside the museum]

USER: "What other museums are near me?"

[Screen: Map view with pins appearing]

TIMELENS (voice): "Within walking distance, I found 3 museums:
The National Archaeological Museum is 800 meters north —
a 10-minute walk. It houses the Mask of Agamemnon and one of
the world's finest Bronze Age collections..."

[UI shows: museum cards with distance, photos, current exhibitions]

USER taps on National Archaeological Museum → directions appear
```

#### 2:50 - 3:25 | Museum Diary (35s)

```
USER: "Create a diary of my museum visit"

[Screen: Loading "Generating your museum diary..."]

[Screen: Beautiful diary page appears with interleaved content]
- Text: "A Morning at the Museum of Classical Antiquities"
- AI illustration: watercolor of the museum gallery
- Text: "The red-figure krater stopped me in my tracks..."
- Image: the before/after restoration slider
- Text: "Around the corner, a headless marble Aphrodite..."
- Image: AI-restored statue with original polychrome paint

NARRATOR: "Every museum visit becomes a story worth keeping."

[User taps Share → link copied]
```

#### 3:25 - 4:00 | Architecture + Closing (35s)

```
[Screen: Architecture diagram (clean, professional)]

NARRATOR: "Under the hood, TimeLens uses 9 Gemini features
working together through a multi-agent architecture:

[Highlight each as mentioned]
Live API for real-time voice and vision...
Image Generation for artifact restoration...
ADK for multi-agent orchestration...
And 6 more features creating a seamless experience."

[Screen: Feature matrix table]

"TimeLens — because every artifact has a story.
Built with Gemini, for the world's heritage."

[End card: GitHub repo + deployed URL + team name]
```

---

## 10. Risk Assessment

### 10.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **Live API WebSocket instability** | Medium | High | Implement auto-reconnect with exponential backoff (3 retries); fallback to text-based Gemini 2.5 Flash chat |
| **Image generation quality inconsistent** | Medium | Medium | Pre-test prompts with multiple heritage sites; maintain a library of tested prompts; include reference images for angle matching |
| **Live API audio latency > 2s** | Low | High | Optimize audio chunk size (100ms); use server closest to demo location; pre-warm connection before demo |
| **Vision misidentifies artifacts** | Medium | Medium | Supplement with Google Search Grounding; add "I'm not certain, but..." confidence language in system prompt; museum artifacts through glass may reduce vision quality — test with glass reflections |
| **Museum lighting/glass case glare** | Medium | Medium | Guide user to adjust angle in UI ("Try tilting your phone to reduce glare"); test with various lighting conditions; add image preprocessing for glare reduction |
| **Mobile Safari WebSocket issues** | Medium | Medium | Test extensively on iOS Safari 15.4+; have Chrome Android as backup demo device |
| **Gemini API rate limits during demo** | Low | Critical | Use dedicated GCP project with billing; request quota increase; pre-demo warm-up calls |

### 10.2 Schedule Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **Multi-agent routing complexity** | High | High | Start with simple if/else routing; upgrade to ADK orchestration if time permits; minimum: 2 agents working for demo |
| **Image Generation API changes** | Low | High | Pin to specific model version; test daily; have DALL-E 3 as emergency backup |
| **UI polish insufficient** | Medium | Medium | Use shadcn/ui components (pre-built, polished); focus on 3 key screens only |
| **Demo recording issues** | Low | Medium | Record multiple takes; have backup demo environment (local + deployed) |

### 10.3 Demo-Specific Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **Network failure during live demo** | N/A (pre-recorded) | None | Demo is pre-recorded video; not live |
| **AI generates historically inaccurate content** | Medium | Medium | Use Search Grounding for all factual claims; add sources in UI; pre-test demo script sites |
| **Before/After slider not impressive** | Low | High | Test with 5+ artifact types (pottery, statue, fresco, bronze, mosaic); choose the most dramatic restoration for demo; add smooth animation |
| **Demo exceeds 4 minutes** | Medium | Low | Time each section during rehearsal; cut Discovery section if over time |

---

## 11. Appendix

### 11.1 Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Framework** | Next.js | 15.x | App Router, Server Components, API Routes |
| **Language** | TypeScript | 5.x | Type safety across full stack |
| **Styling** | Tailwind CSS | 4.x | Utility-first, mobile responsive |
| **UI Components** | shadcn/ui | Latest | Pre-built accessible components |
| **AI Platform** | Gemini API | 2.5 Flash / 2.0 Flash Live | Dual pipeline AI capabilities |
| **Agent Framework** | Google ADK | Latest | Multi-agent orchestration |
| **Auth** | Firebase Auth | 10.x | Anonymous authentication |
| **Database** | Firestore | 10.x | Session + visit + diary storage |
| **Storage** | Cloud Storage | - | Image storage (reconstructions, diary) |
| **Maps** | Google Maps JS API | 3.x | GPS + nearby visualization |
| **Hosting** | Cloud Run | - | Serverless container hosting |
| **CI/CD** | Cloud Build | - | Auto-deploy on push |
| **Audio** | Web Audio API | Native | Audio capture + playback |
| **Camera** | MediaDevices API | Native | Camera stream capture |

### 11.2 Project File Structure

```
timelens/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (PWA meta, fonts)
│   │   ├── page.tsx                  # Landing / camera view
│   │   ├── diary/
│   │   │   └── [id]/page.tsx         # Diary view + share
│   │   └── api/
│   │       ├── session/
│   │       │   ├── route.ts          # POST: create session
│   │       │   └── resume/route.ts   # POST: resume session
│   │       ├── ws/route.ts           # WebSocket upgrade → Live API proxy
│   │       ├── restore/route.ts      # POST: artifact restoration / image gen
│   │       ├── discover/route.ts     # GET: nearby sites
│   │       ├── diary/
│   │       │   ├── generate/route.ts # POST: generate diary
│   │       │   └── [id]/route.ts     # GET: fetch diary
│   │       └── health/route.ts       # GET: health check
│   ├── agents/                       # ADK Multi-Agent
│   │   ├── orchestrator.ts           # Intent router
│   │   ├── curator.ts                # Live API voice + vision
│   │   ├── restoration.ts            # Image generation
│   │   ├── discovery.ts              # Places API + search
│   │   └── diary.ts                  # Interleaved output
│   ├── lib/
│   │   ├── gemini/
│   │   │   ├── live-api.ts           # WebSocket client for Live API
│   │   │   ├── flash-image.ts        # REST client for image gen
│   │   │   └── search-grounding.ts   # Search grounding wrapper
│   │   ├── firebase/
│   │   │   ├── config.ts             # Firebase initialization
│   │   │   ├── auth.ts               # Anonymous auth
│   │   │   └── firestore.ts          # DB operations
│   │   ├── audio/
│   │   │   ├── capture.ts            # Mic → PCM encoding
│   │   │   └── playback.ts           # PCM decoding → speaker
│   │   ├── camera/
│   │   │   └── capture.ts            # Camera → JPEG frames
│   │   ├── geo/
│   │   │   └── location.ts           # GPS + Places API
│   │   └── ws/
│   │       └── manager.ts            # WebSocket lifecycle + reconnect
│   ├── components/
│   │   ├── camera-view.tsx           # Main camera viewfinder
│   │   ├── audio-visualizer.tsx      # Voice activity indicator
│   │   ├── before-after-slider.tsx   # Time reconstruction comparison
│   │   ├── nearby-sites.tsx          # Discovery results cards
│   │   ├── diary-viewer.tsx          # Diary rendering
│   │   ├── knowledge-panel.tsx       # Interactive Knowledge Panel (summary card + chat-style details)
│   │   ├── transcript.tsx            # Real-time transcript overlay
│   │   ├── agent-indicator.tsx       # Shows active agent
│   │   └── ui/                       # shadcn/ui components
│   ├── hooks/
│   │   ├── use-live-session.ts       # Live API session management
│   │   ├── use-camera.ts             # Camera stream hook
│   │   ├── use-microphone.ts         # Audio capture hook
│   │   └── use-geolocation.ts        # GPS position hook
│   └── types/
│       ├── ws-messages.ts            # WebSocket protocol types
│       ├── agents.ts                 # Agent types
│       └── models.ts                 # Firestore model types
├── public/
│   ├── manifest.json                 # PWA manifest
│   ├── icons/                        # App icons (192, 512)
│   └── sw.js                         # Service worker (minimal)
├── Dockerfile                        # Cloud Run container
├── cloudbuild.yaml                   # CI/CD pipeline
├── .env.example                      # Environment variables template
├── next.config.ts                    # Next.js configuration
├── tailwind.config.ts                # Tailwind configuration
├── tsconfig.json                     # TypeScript configuration
└── README.md                         # Setup + architecture + demo
```

### 11.3 Environment Variables

```bash
# Gemini API
GOOGLE_GEMINI_API_KEY=               # Gemini API key
GOOGLE_CLOUD_PROJECT=                # GCP project ID

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT_KEY=        # Base64 encoded (server-side only)

# Google Maps / Places
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
GOOGLE_PLACES_API_KEY=               # Server-side only

# App Config
NEXT_PUBLIC_APP_URL=                  # Deployed URL
NEXT_PUBLIC_WS_URL=                  # WebSocket endpoint
```

### 11.4 Prize Optimization Strategy

**Target**: Best Overall Agent ($30K Grand Prize)

**Differentiation Pillars**:

1. **Feature Count Leadership**: 9 Gemini features (likely highest among competitors)
2. **Visual "Wow" Moment**: Damaged artifact → pristine restoration via Before/After slider — instantly understandable and emotionally compelling. Judges remember this
3. **Museum-First = Untapped Niche**: No existing product does real-time AI artifact restoration + voice conversation in museums. Outdoor heritage apps exist (Google Arts & Culture); museum artifact restoration does NOT
4. **Real Problem, Real Users**: 100K+ museums worldwide, billions of artifacts behind glass with inadequate labels
5. **Zero Friction**: URL → camera → talking to AI in < 10 seconds
6. **Multi-Agent Sophistication**: Not just chatbot; 4 specialized agents with pipeline orchestration
7. **Production Quality**: Deployed on GCP, responsive mobile UI, proper error handling

**Common Competitor Weaknesses to Exploit**:
- Most hackathon entries use 2-3 Gemini features → TimeLens uses 9
- Most build chatbots → TimeLens is multi-modal (voice + vision + image gen)
- Most skip mobile optimization → TimeLens is mobile-first
- Most have text-only output → TimeLens generates images + interleaved content
- **Most focus on outdoor/general use cases** → TimeLens owns the museum niche with artifact restoration as a unique killer feature no one else has

---

*Built for the Gemini Live Agent Challenge 2026*
*Target: Best Overall Agent*
*"Every artifact has a story. TimeLens lets you hear it."*
