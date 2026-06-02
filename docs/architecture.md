# Prism Prototype — Architecture & Phased Build Plan

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | Single-file HTML/CSS/JS | No build tooling, no framework |
| LLM | Groq API — `llama-3.3-70b-versatile` | OpenAI-compatible; local → direct call, deployed → Edge Function proxy |
| Storage | `localStorage` + `prism_chat_v1` | Sessions, messages, verified state persist across page refresh |
| Deployment | Vercel static site | `vercel.json` + GitHub → auto-deploy |
| API key (local) | Hardcoded in `index.html` | Used only when running as `file://` or `localhost` |
| API key (production) | Vercel Environment Variable | Read by Edge Function — never sent to browser |

---

## File Structure

```
prism/
├── index.html              ← Single entry point (all HTML + CSS + JS)
├── .env                    ← Groq API key — local reference only, never committed
├── .gitignore              ← Excludes .env, node_modules, .vercel
├── vercel.json             ← Vercel deployment config
├── api/
│   └── chat.js             ← Vercel Edge Function (API key proxy)
├── Image/
│   └── Claudelogo.png      ← Logo used in sidebar + greeting
└── docs/
    ├── architecture.md
    ├── problemstatement.md
    ├── PrototypeNotes.md   ← Known limitations & design decisions
    ├── Fixes.md
    ├── Fixes2.md
    └── Fixes3.md
```

---

## Data Flow

```
User types prompt
      ↓
appendUserBubble(prompt)          — immediate UI feedback
saveChatMessage(sessionId, ...)   — saved to localStorage immediately
showTypingIndicator()             — animated dots
setLoading(true)                  — disables input, shows spinner on send btn
      ↓
callGroq(prompt)
  ┌─ LOCAL (file:// or localhost) ──────────────────────────────────┐
  │  POST https://api.groq.com/openai/v1/chat/completions           │
  │  Authorization: Bearer ${GROQ_API_KEY}  ← hardcoded key         │
  └─────────────────────────────────────────────────────────────────┘
  ┌─ PRODUCTION (Vercel) ───────────────────────────────────────────┐
  │  POST /api/chat  ← Edge Function proxy                          │
  │  Edge Function reads process.env.GROQ_API_KEY (server-side)    │
  │  forwards to Groq — API key never reaches the browser           │
  └─────────────────────────────────────────────────────────────────┘
      ↓
responseText (real LLM output)
saveChatMessage(sessionId, { role:'assistant', responseText, msgId, prompt })
      ↓
analyseResponse(responseText, msgId)
  → tokenizeResponse()            — split on newlines; classify headers/tables/bullets
  → classifySentence()            — regex patterns per token
  → preserves saved verified states from STATE.messages (replay-safe)
  → Segment[] with tokenType + flagType
      ↓
renderAssistantMessage()
  → 💡 Short Answer callout
  → ## Section headers
  → Markdown tables → HTML <table>
  → Bullet lists with inline 🔴/🟡 flag buttons (max 5 per response)
  → 📎 Sources block
  → Verification progress bar
  → What Prism Assumes panel (collapsible)
      ↓
persistSave()
  → localStorage: SESSIONS + STATE.messages + counters
```

**On page refresh / reload:**
```
persistLoad()
  → restore SESSIONS, STATE.messages, msgCounter, sessionCounter
  → replayLastSession()
       → loadChatMessages(sessionId)   — raw message log from prism_chat_v1
       → appendUserBubble() for each user message
       → renderAssistantMessage() for each assistant message
            (analyseResponse preserves verified states from STATE.messages)
       → applyVerifiedStatesToDOM()   — restores ✓ buttons + progress bars
```

---

## Component Map

```
┌────────────────────────────────────────────────────────┐
│  App Shell                                             │
│  ┌────────────────────────────────────────────────┐   │
│  │  Sidebar (260px — slide-in drawer on mobile)   │   │
│  │  ├─ Claudelogo.png + "Claude" brand            │   │
│  │  ├─ New Chat                                   │   │
│  │  ├─ Chats (nav)                                │   │
│  │  ├─ Projects  [placeholder — not implemented]  │   │
│  │  ├─ Verified Claims (shows claims view)        │   │
│  │  ├─ Prism Settings [placeholder]               │   │
│  │  ├─ Starred section (dynamic session list ★)   │   │
│  │  ├─ Recents section (dynamic session list)     │   │
│  │  └─ Footer: Guest avatar + name + Free plan    │   │
│  └────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────┐   │
│  │  Main Area                                     │   │
│  │  ┌──────────────────────────────────────────┐  │   │
│  │  │  Top Bar: ☰ hamburger (mobile) | pill    │  │   │
│  │  │           | ? help / onboarding button   │  │   │
│  │  └──────────────────────────────────────────┘  │   │
│  │                                                 │   │
│  │  [Welcome View]                                 │   │
│  │    Claudelogo (spinning) + time-aware greeting  │   │
│  │    Centered input (+ attach, model selector)   │   │
│  │    Chip dialog overlay (Verify/Analyse/etc.)   │   │
│  │    Suggestion chips (horizontal scroll mobile) │   │
│  │                                                 │   │
│  │  [Chat View]                                    │   │
│  │    Scrollable messages (max-width 680px)        │   │
│  │    UserBubble (right-aligned, dark bg)          │   │
│  │    AssistantBubble:                             │   │
│  │      ├─ 💡 Short Answer callout                │   │
│  │      ├─ ## Section headers                     │   │
│  │      ├─ Data table (markdown → HTML)           │   │
│  │      ├─ Bullets with 🔴/🟡 inline flags       │   │
│  │      ├─ 📎 Sources block                       │   │
│  │      ├─ Verification progress bar              │   │
│  │      └─ What Prism Assumes panel (collapsible) │   │
│  │    Bottom input bar (+ attach, model selector) │   │
│  │                                                 │   │
│  │  [Claims View]                                  │   │
│  │    All flagged segments across all messages     │   │
│  │    ↗ View → jump to chat + highlight sentence  │   │
│  └────────────────────────────────────────────────┘   │
│  [Tooltip Overlay — shared, portaled, positioned]      │
│  [Onboarding Modal — 4 steps, first-visit only]        │
│  [Sidebar Backdrop — mobile overlay]                   │
└────────────────────────────────────────────────────────┘
```

---

## Data Model

```js
// App-level runtime state
STATE = {
  messages: {
    [msgId]: {
      segments: Segment[],
      mode: "flagged" | "quiet",
      prompt: string
    }
  }
}

// Session — stored in SESSIONS{} and localStorage('prism_sessions')
Session = {
  id: string,               // "s1", "s2", ...
  title: string,            // first 45 chars of first user message
  starred: boolean,
  createdAt: timestamp,
  claimMsgIds: string[]     // list of msgIds for Verified Claims view
}

// Chat message log — stored in localStorage('prism_chat_v1')
// { [sessionId]: ChatEntry[] }
ChatEntry = {
  id: string,
  role: "user" | "assistant",
  text?: string,            // user message text
  responseText?: string,    // assistant raw LLM output (for replay)
  prompt?: string,          // original prompt that produced this response
  msgId?: string            // assistant message ID (for segment ID matching)
}

// Segment — one token from the LLM response
Segment = {
  id: string,               // "${msgId}-${index}"
  msgId: string,
  tokenType: "short-answer" | "header" | "subheader" | "table"
           | "bullet" | "sentence" | "sources",
  text: string,             // display text
  raw: string,              // original markdown (tables need this)
  flagType: null | "quantitative" | "recent",
  verified: boolean,        // persisted in STATE.messages → localStorage
  tooltip: TooltipData | null
}
```

---

## State Machine (per response)

```
IDLE
  → LOADING   setLoading(true) — spinner on send btn, input disabled
  → RENDERED  removeTypingIndicator, renderAssistantMessage
       ↓
  mode = "flagged":
    segments[n].verified = false  →  progress bar "X of Y claims verified"
    all verified                  →  "All claims checked ✓" banner
  mode = "quiet":
    ℹ️ label — no progress bar, no assumes panel
       ↓
  saveChatMessage() + persistSave()  →  localStorage updated
```

---

## Edge Function — api/chat.js

```
Browser (Vercel)                 Edge Function              Groq API
      │                               │                         │
      │  POST /api/chat               │                         │
      │  { prompt, model }   ────────►│                         │
      │                               │  POST /v1/completions   │
      │                               │  Authorization: Bearer  │
      │                               │  process.env.GROQ_KEY ─►│
      │                               │                         │
      │                               │◄──── { choices[0] } ────│
      │◄──── { text: "..." } ─────────│                         │
```

- Edge Function runs in Vercel's edge network (zero cold start)
- `GROQ_API_KEY` set as Vercel Environment Variable — never in browser source
- Local development bypasses the proxy and calls Groq directly (key is in `index.html` for dev only)

---

## localStorage Keys

| Key | Contents | Saved when |
|-----|----------|------------|
| `prism_sessions` | `SESSIONS{}` object | Session created, starred |
| `prism_state` | `STATE.messages` with segments + verified flags | Claim verified |
| `prism_counters` | `{ msgCounter, sessionCounter }` | Any of the above |
| `prism_chat_v1` | `{ [sessionId]: ChatEntry[] }` | Each user/assistant message |
| `prism_onboarded` | `"1"` | Onboarding dismissed |

**Scope:** Single browser/device — sufficient for prototype.
**For multi-device:** Replace `persistSave()`/`persistLoad()` with calls to Vercel KV, Firebase, or Supabase. All other code is storage-agnostic.

---

## Claim Detection

```js
// Patterns applied to 'sentence' and 'bullet' token types only
// Priority: quantitative > recent > null (conceptual)
// Cap: 5 flags per response

QUANTITATIVE_PATTERNS:
  /\d+(\.\d+)?\s*%/                  — percentages
  /₹[\d,]+|\$[\d,.]+/               — currency figures
  /\b(FY|Q)[0-9]{2,4}\b/            — financial periods
  /\b\d[\d,.]*\s*(crore|billion...)/  — large numbers
  /\b(EBITDA|margin|NIM|...)\b.*\d/  — metric + number combos
  /\b(bps|basis points)\b/           — basis points

RECENT_PATTERNS:
  /currently|recently|as of|latest/  — time anchors
  /in 20\d\d|last (quarter|year)/   — period references
  /growing|declining|has been/       — trend verbs
  /is expected|are projected/        — forward statements
```

---

## Response Tokenizer

```
tokenizeResponse(text):
  split on \n+ → classify each line:

  Line pattern              →  tokenType
  ─────────────────────────────────────────
  **Short answer:** ...     →  short-answer  (💡 callout)
  ## Heading text           →  header        (bold section divider)
  **Positive drivers:**     →  subheader     (italic sub-label)
  **Sources to verify:**    →  sources       (📎 grey block)
  | col | col |             →  table         (buffered → HTML <table>)
  • or - or * text          →  bullet        (list item, can be flagged)
  plain text                →  sentence      (split further on ". A")
```

---

## Phase-by-Phase Build Plan

| Phase | Status | What was built |
|-------|--------|----------------|
| 1 | ✅ | Shell, sidebar, welcome/chat views, mobile layout, suggestion chips |
| 2 | ✅ | Groq API, claim detection engine, tooltip, assumes panel, quiet mode |
| 3 | ✅ | Tooltip positioning, click-outside, Escape dismiss, mobile bottom sheet |
| 4 | ✅ | Verify state, progress bar, all-verified banner, check-pop animation |
| 5 | ✅ | Collapsible assumes panel, dynamic assumptions + missing info |
| 6 | ✅ | Quiet mode auto-trigger, ℹ️ quiet label |
| 7 | ✅ | Message entrance animation, send spinner, progress bar easing, smooth scroll |
| 7b | ✅ | Chip dialogs, chat sessions, sidebar Recents/Starred, Verified Claims view, image upload/paste, model selector (High/Medium/Low), Claude logo, profile greeting, structured output with tables |
| 7c | ✅ | Mobile drawer sidebar + hamburger, localStorage persistence, onboarding modal (4 steps), claim jump navigation (↗ View → scroll + yellow highlight) |
| 7d | ✅ | **Problem 1 fix:** Chat messages persist across page refresh — `prism_chat_v1` stores raw messages, `replayLastSession()` rebuilds DOM on load, verified states restored automatically |
| 7d | ✅ | **Problem 2 fix:** API key hidden on Vercel — `api/chat.js` Edge Function proxy; local dev uses hardcoded key; production reads `process.env.GROQ_API_KEY` server-side |
| 8 | ⏳ | Vercel deploy → shareable link |

---

## Colour & Visual System

```css
:root {
  --bg:             #f0ece5;   /* warm cream */
  --surface:        #ffffff;   /* cards, bubbles */
  --text:           #1a1916;
  --text-muted:     #6b6760;
  --text-light:     #9e9a94;
  --border:         #ddd8d0;
  --prism-accent:   #7c3aed;   /* purple — flags, progress, callouts */
  --prism-light:    #ede9fe;
  --prism-star:     #c2410c;   /* orange — Claude logo colour */
  --flag-red:       #dc2626;   /* quantitative flag */
  --flag-yellow:    #d97706;   /* recent flag */
  --verified:       #16a34a;   /* verified checkmark */
  --assumes-bg:     #fefce8;   /* amber assumes panel */
  --assumes-border: #fde68a;
  --font:           'Inter', system-ui, sans-serif;
  --font-serif:     'Lora', Georgia, serif;
}
```

---

## Security Notes

| Concern | Status |
|---------|--------|
| API key in browser (local) | Key in `index.html` — dev only, never deployed via network request |
| API key in browser (production) | Never reaches browser — Edge Function reads from Vercel env vars |
| `.env` in git | Excluded via `.gitignore` |
| localStorage contents | Session titles + verified states only — no PII, no financial data |
| Images | Stay in browser memory (FileReader) — never sent to any server |
