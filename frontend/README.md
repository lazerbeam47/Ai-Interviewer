# AI Interviewer

An AI-powered voice interview platform that conducts technical interviews based on a candidate's GitHub projects. The system uses real-time speech-to-text, a large language model, and text-to-speech to simulate a natural interview experience.

## How it works

1. Candidate pastes their GitHub URL
2. The system scrapes their public repositories
3. A WebSocket session opens and the AI interviewer (Alex) asks technical questions based on their projects
4. The candidate speaks their answers — transcribed in real time via Deepgram
5. The LLM generates follow-up questions based on the conversation
6. At the end, the interview is scored across four dimensions and results are saved

## Tech stack

**Frontend**
- React 19
- React Router v7
- Tailwind CSS
- Web Audio API (mic capture, VAD)
- Browser Speech Synthesis API (TTS)

**Backend**
- Node.js + Express
- WebSocket (`ws` library)
- Prisma ORM
- PostgreSQL

**AI Services**
- Deepgram Nova-3 (real-time STT)
- Google Gemini 2.5 Flash (LLM, primary)
- Groq LLaMA 3.3 70B (LLM, fallback)

## Architecture

```
Browser
  ├── WebSocket (binary audio + JSON control events)
  └── REST API (pre-interview setup, results fetch)

Server
  ├── WebSocket Server (orchestration layer)
  │   ├── Deepgram WS (STT)
  │   └── Gemini / Groq (LLM)
  └── Express REST API
       └── Prisma → PostgreSQL
```

### Voice pipeline

```
Mic → AudioCapture (energy VAD) → binary PCM → WebSocket
    → Server → Deepgram (STT) → transcript
    → LLM (Gemini/Groq) → next question
    → Browser Speech Synthesis (TTS) → candidate hears question
```

### Sideband events

| Direction | Event | Description |
|---|---|---|
| Client → Server | `START_INTERVIEW` | Begin session, fetch GitHub context |
| Client → Server | `END_INTERVIEW` | Score and close session |
| Client → Server | `BARGE_IN` | User interrupted AI |
| Server → Client | `INTERVIEW_STARTED` | Session ready |
| Server → Client | `AI_MESSAGE` | LLM generated question |
| Server → Client | `TRANSCRIPT_INTERIM` | Partial STT result |
| Server → Client | `TRANSCRIPT_FINAL` | Final STT result |
| Server → Client | `INTERVIEW_ENDED` | Scoring complete, redirect |

## Project structure

```
AI-Interviewer/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── form.jsx         # GitHub URL input
│   │   │   ├── interview.jsx    # Voice interview UI
│   │   │   └── result.jsx       # Score display
│   │   ├── utils/
│   │   │   └── audioCapture.js  # Mic capture + VAD
│   │   └── constants/
│   │       └── event.js         # WS event names
│   └── public/
│       └── audioWorklet.js      # (reserved for future AudioWorklet upgrade)
│
└── backend/
    ├── server.js                # HTTP + WebSocket server
    ├── app.js                   # Express setup
    ├── db.js                    # Prisma client
    ├── routes/
    │   └── interview_route.js   # REST endpoints
    ├── services/
    │   ├── deepgram.js          # STT streaming
    │   └── llm.js               # Gemini + Groq
    ├── constants/
    │   └── events.js            # WS event names
    └── prisma/
        └── schema.prisma        # DB schema
```

## Database schema

```prisma
model Interview {
  id              String          @id @default(uuid())
  githubMetadata  Json
  status          InterviewStatus @default(PENDING)
  score           Int             @default(0)
  knowledge       Int             @default(0)
  communication   Int             @default(0)
  technicalSkills Int             @default(0)
  thoughtProcess  Int             @default(0)
  summary         String          @default("")
  conversation    Conversation[]
}

model Conversation {
  id          String      @id @default(uuid())
  message     String
  type        MessageType
  interviewId String
  interview   Interview   @relation(fields: [interviewId], references: [id])
}
```

## Getting started

### Prerequisites
- Node.js 20+
- PostgreSQL
- Deepgram API key
- Google Gemini API key
- Groq API key

### Installation

```bash
# clone the repo
git clone https://github.com/lazerbeam47/Ai-Interviewer.git
cd Ai-Interviewer
```

**Backend setup**
```bash
cd backend
npm install
```

Create `backend/.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/ai_interviewer
DEEPGRAM_API_KEY=your_key
GEMINI_API_KEY=your_key
GROQ_API_KEY=your_key
PORT=3000
```

```bash
npx prisma migrate dev
npm run dev
```

**Frontend setup**
```bash
cd frontend
npm install
```

Create `frontend/.env`:
```
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

```bash
npm run dev
```

Open `http://localhost:5173`

## Interview flow

1. Paste your GitHub profile URL on the home page
2. Click **Start Interview**
3. Wait for Alex (the AI interviewer) to introduce and ask the first question
4. Speak your answer naturally — a 3 second pause signals you're done
5. Alex asks follow-up questions based on your answers
6. Click **End interview** at any time
7. View your scores on the results page

## Scoring

After the interview ends, the LLM evaluates the full conversation and scores the candidate on:

| Dimension | Max Score |
|---|---|
| Knowledge | 10 |
| Communication | 10 |
| Technical Skills | 10 |
| Thought Process | 10 |
| **Total** | **40** |

A summary of the candidate's performance is also generated.

## Known limitations

- Gemini free tier is limited to 20 requests/day — Groq fallback kicks in automatically
- Browser Speech Synthesis voice quality varies by OS
- VAD is energy-based, not ML-based — may misfire in noisy environments
- No authentication yet — sessions are identified by UUID only

## Roadmap

- [ ] JWT authentication on WebSocket
- [ ] Save full conversation to database
- [ ] 10 question limit with project coverage enforcement
- [ ] AudioWorklet upgrade (replace ScriptProcessorNode)
- [ ] ElevenLabs/Cartesia TTS for better voice quality
- [ ] Resume upload support
- [ ] Deployment (Railway / Render)