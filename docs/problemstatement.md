# Prism — Problem Statement

## Prism: A Claim-Level Evaluation Layer That Helps Junior Financial Analysts Verify AI Outputs Before Submission

---

## Background / Context

Junior financial analysts use AI chat tools daily to validate model assumptions, summarise annual reports, and prepare research briefs. However, these tools generate polished, confident-looking outputs even when they contain hidden assumptions, outdated figures, or generalised claims that may not apply to the specific company or sector being researched.

These analysts — with 0–2 years of experience — have no internal benchmark to evaluate output quality. They follow a consistent pattern: **Prompt → Generate → Accept**. Errors travel undetected to senior analysts and clients.

Existing solutions fail:
- Citations verify factual sources but miss hidden assumptions
- AI disclaimers are treated like terms and conditions — 34.4% of users never noticed them
- Confidence scores increase blind trust rather than reducing it

**The core problem:** AI tools hide their assumptions inside polished output. There is no signal distinguishing verified facts from assumed ones. The problem is invisible by design.

---

## Objective

Build a working prototype of Prism — a claim-level evaluation layer built into a Claude-like chat interface. Prism makes AI hidden assumptions visible by:

- Flagging specific sentences that contain numbers, recent claims, or hidden assumptions — directly inline with the output
- Showing a tooltip on each flagged claim telling the user exactly what to verify and where
- Displaying a "What Prism Assumes" panel below each response summarising the key assumptions made
- Allowing users to mark claims as verified — giving them control and building confidence

The prototype must demonstrate that Prism helps users evaluate AI outputs without replacing their judgment.

---

## LLM Backend

**Groq API** (`llama-3.3-70b-versatile` model) is used to generate real, dynamic responses — not hardcoded mock text. Groq's API is OpenAI-compatible and runs LLaMA 3.3, a capable open-source model from Meta.

The API key is handled via a **Vercel Edge Function** (`api/chat.js`) in production — the key never reaches the browser. For local development, the key is read from a hardcoded constant in `index.html`.

A **system prompt** instructs the model to respond as a senior equity research analyst and write structured financial analysis that naturally contains:
- Specific financial figures, percentages, or metrics with period references (triggers 🔴 flags)
- Statements about current or recent market conditions (triggers 🟡 flags)
- Conceptual explanations of underlying principles (no flag — quiet content)

This ensures Prism's claim detection engine reliably finds flags in every analytical response, while definitional/explanatory prompts naturally produce clean outputs that trigger quiet mode.

---

## System Workflow

1. User opens the Prism interface — a Claude-like chat UI with a full sidebar
2. User types a research prompt directly, or uses a **chip shortcut** (Verify Margins, Analyse Report, Compare Peers, Explain Terms) which opens a focused input dialog to build the prompt
3. **Groq / LLaMA 3.3 generates a real response** structured as:
   - A **Short Answer** callout with the direct verdict
   - A **historical data table** (markdown → rendered HTML) where relevant
   - **Key Drivers** section (positive and headwinds as bullet points)
   - **Key Risks** bullets
   - A **Bottom Line** paragraph
   - A **Sources to verify** block naming specific filings and data sources
4. Prism analyses the response token by token and automatically flags:
   - 🔴 **Quantitative claims** — specific numbers, percentages, financial metrics, period references
   - 🟡 **Recent claims** — current state, recent events, time-sensitive information
   - ✅ **Conceptual claims** — general principles, no flag needed
5. User clicks a flag icon to see the verification tooltip
6. Tooltip shows: claim type + what to verify + where to verify (BSE filing, RBI report, Bloomberg, etc.)
7. User clicks **"Mark as Verified"** on each claim — flag animates to a green ✓
8. **"What Prism Assumes"** panel below the response shows key assumptions made dynamically based on what flag types were found
9. Progress bar updates: *"2 of 5 claims verified"*
10. Once all flagged claims are verified: **"All claims checked ✓ — ready to submit"**
11. Chat session is saved to browser localStorage — full conversation persists across page refresh

---

## Functional Requirements

### F1 — Chat Interface
- Claude-style UI with full sidebar navigation
- Sidebar: New Chat, Chats, Projects, Verified Claims, Prism Settings
- **Starred section** — users can star any chat session; starred chats shown separately
- **Recents section** — all chat sessions listed with first message as title
- Welcome state: time-aware greeting with Claude logo, centered input box, suggestion chips
- Chat state: scrollable message thread, bottom input bar
- **Chip dialog** — clicking Verify Margins / Analyse Report / Compare Peers / Explain Terms opens a focused input asking for specifics, builds a contextual prompt, auto-sends
- Mobile responsive — sidebar becomes a slide-in drawer with hamburger toggle
- **Onboarding modal** — 4-step first-visit guide explaining the 🔴/🟡 markers and how to verify

### F2 — Prism Claim Flagging
- Automatically detect and flag tokens in real LLM output containing:
  - Specific numbers, percentages, financial figures, period references (FY24, Q3)
  - Time-sensitive phrases: "currently", "recently", "as of", "latest", "growing", "has been"
  - Hidden assumptions in trend statements
- Maximum **5 flags per response**
- Flag icon appears inline next to the flagged sentence or bullet point
- Conceptual claims: no flag, no disruption to reading flow
- Response tokenizer handles: Short Answer callout, `##` section headers, markdown tables, bullet lists, Sources blocks — all rendered correctly

### F3 — Verification Tooltip
- Clicking/tapping a flag opens a positioned tooltip (anchors to bottom on mobile)
- Tooltip contains:
  - Claim type chip (🔴 Quantitative / 🟡 Recent)
  - Specific verification action — what to check, including the extracted figure
  - Suggested source — inferred from content (BSE filing, RBI Monetary Policy, MCX commodity data, Bloomberg, etc.)
- **"Mark as Verified"** button inside tooltip
- Click-outside or Escape closes tooltip

### F4 — What Prism Assumes Panel
- Collapsible panel below each AI response (open by default)
- 2–3 key assumptions built dynamically from detected flag types
- 1–2 pieces of information that may be missing, inferred from prompt context
- Example assumptions:
  - *"Analysis is based on the model's training data — not real-time"*
  - *"Figures cited reflect historical averages — verify against latest filings"*
  - *"Recent trends may have shifted due to earnings, policy, or macro events"*

### F5 — Verification Progress
- Progress bar showing: *"2 of 5 claims verified"* with percentage
- Verified claims show a green ✓ checkmark with a pop animation (CSS keyframe)
- When all claims verified: animated green banner *"All claims checked ✓ — ready to submit"* replaces the progress bar

### F6 — Prism Quiet Mode
- If response contains only conceptual or definitional content — zero flags appear
- Label: *"ℹ️ General guidance — no specific figures to verify in this response"*
- Triggered automatically when `analyseResponse()` finds zero flaggable sentences
- Definitional prompts ("What is EBITDA?", "Explain DCF") naturally trigger quiet mode without any special casing

### F7 — Verified Claims View
- Dedicated sidebar view showing all flagged segments across all messages in the session
- Each claim shows: claim text, flag type (🔴/🟡), verified / pending status
- **↗ View button** — clicking jumps to that specific message in the chat and highlights the sentence with a yellow flash animation

### F8 — Session Management
- Each conversation creates a named session (first 45 chars of first message)
- Sessions appear in **Recents** sorted by most recent
- ★ Star button on each session → moves to **Starred** section
- **New Chat** resets to welcome state and starts a fresh session
- Full chat history (user messages + assistant responses) persists in `localStorage` across page refresh

### F9 — Image Attachment
- `+` button opens a file picker (images only)
- Paste a screenshot directly from clipboard — detected automatically
- Image thumbnails shown above the input with a × remove button

### F10 — Model Selector
- Toolbar dropdown: **High** (llama-3.3-70b) / **Medium** (llama3-70b) / **Low** (llama3-8b)
- Synced across welcome and chat toolbars
- Selection persists within the session

---

## Deployed Output

**Live URL:** [https://prism-prototype-indol.vercel.app](https://prism-prototype-indol.vercel.app)

A working single-page web application that:

- ✅ Displays a Claude-like chat interface with full sidebar navigation
- ✅ Accepts any financial research prompt and returns a real Groq LLM response
- ✅ Renders structured responses: Short Answer callout, data tables, section headers, bullet points, sources block
- ✅ Demonstrates all Prism features on live output: inline flags, tooltip, mark-as-verified, assumes panel, progress bar, all-checked banner
- ✅ Shows quiet mode on definitional prompts
- ✅ Persists full chat history across page refresh (localStorage)
- ✅ Mobile responsive with slide-in sidebar
- ✅ First-visit onboarding modal
- ✅ Verified Claims view with jump-to-chat
- ✅ API key secured via Vercel Edge Function — never exposed in browser
- ✅ Deployed to Vercel with a shareable link

---

## Known Limitations (Prototype Scope)

See [PrototypeNotes.md](PrototypeNotes.md) for full details. Summary:

| Item | Status |
|------|--------|
| Projects section | Visual placeholder — not functional |
| Prism Settings | Opens onboarding — not a real settings panel |
| Output accuracy | LLM training data only — figures may be outdated or hallucinated |
| Claude branding | Interface styled after Claude; actual AI backend is Groq / LLaMA 3.3 |
| Storage | Browser localStorage — single device only; no cross-device sync |

---

## Example Conversation

**User prompt:**
> "Is my 11% EBITDA margin assumption reasonable for Tata Consumer FY25?"

**Prism response (structured output, claim-analysed):**

> 💡 **Short Answer:** 11% is materially below Tata Consumer's actual consolidated EBITDA margin — the FY25 figure was approximately 14.2%.
>
> ## Historical EBITDA Margin Range
> | Year | Margin |
> |------|--------|
> | FY22 | ~13.5% |
> | FY23 | 13.5% |
> | FY24 | 15.0–15.3% 🔴 |
> | FY25 | ~14.2% 🔴 |
>
> ## Key Drivers
> **Positive drivers:**
> • Tea prices stabilising — management guided 200–300 bps margin improvement 🔴
> • Premiumisation driving higher-margin product mix
>
> **Headwinds:**
> • Tea cost inflation surged ~25% in FY25; only ~30% passed through 🟡
> • Coffee segment margin compression from falling global prices
>
> ## Bottom Line
> An 11% assumption would only be defensible as a stress/downside case. The correct historical range is ~13.5–15.3% over FY22–FY25.
>
> 📎 **Sources to verify:** Tata Consumer Q4 FY25 BSE quarterly filing, MCX tea price data, Company investor day presentation

**What Prism Assumes:**
- Analysis is based on the model's training data — not real-time
- Figures cited reflect historical averages — verify against latest filings
- Recent trends may have shifted due to earnings, policy, or macro events

**May be missing:**
- Latest BSE quarterly results or management commentary
- Real-time commodity prices or currency movements that affect margins
