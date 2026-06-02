# Prism — Problem Statement

## Prism: A Claim-Level Evaluation Layer for Claude That Helps Junior Financial Analysts Verify AI Outputs Before Submission

---

## Background / Context

Junior financial analysts use Claude daily to validate model assumptions, summarise annual reports, and prepare research briefs. However, Claude generates polished, confident-looking outputs even when they contain hidden assumptions, outdated figures, or generalised claims that may not apply to the specific company or sector being researched.

These analysts — with 0–2 years of experience — have no internal benchmark to evaluate output quality. They follow a consistent pattern: **Prompt → Generate → Accept**. Errors travel undetected to senior analysts and clients.

Existing solutions fail:
- Citations verify factual sources but miss hidden assumptions
- Claude's disclaimer is treated like terms and conditions — 34.4% of users never noticed it
- Confidence scores increase blind trust rather than reducing it

**The core problem:** Claude hides its assumptions inside polished output. There is no signal distinguishing verified facts from assumed ones. The problem is invisible by design.

---

## Objective

Build a working prototype of Prism — a claim-level evaluation layer built into a Claude-like chat interface. Prism makes LLM hidden assumptions visible by:

- Flagging specific sentences that contain numbers, recent claims, or hidden assumptions — directly inline with the output
- Showing a tooltip on each flagged claim telling the user exactly what to verify and where
- Displaying a "What Prism Assumes" panel at the bottom of each response summarising the key assumptions made
- Allowing users to mark claims as verified — giving them control and building confidence

The prototype must demonstrate that Prism helps users evaluate AI outputs without replacing their judgment.

---

## LLM Backend

**DeepSeek API** (`deepseek-chat` model) is used to generate real, dynamic responses — not hardcoded mock text. The DeepSeek API is OpenAI-compatible and called directly from the browser for this prototype.

A **system prompt** instructs the model to write financial analysis that naturally contains a mix of:
- Specific financial figures, percentages, or metrics with period references (triggers 🔴 flags)
- Statements about current or recent market conditions (triggers 🟡 flags)
- Conceptual explanations of underlying principles (no flag — conceptual)

This ensures Prism's claim detection engine reliably finds flags in every analytical response, while definitional/explanatory prompts naturally produce clean outputs that trigger quiet mode.

---

## System Workflow

1. User opens the Prism interface — a Claude-like chat UI
2. User types a research prompt (example: *"Is my 11% EBITDA margin assumption reasonable for Tata Consumer?"*)
3. **DeepSeek generates a real response** containing a mix of:
   - Specific numbers or financial figures
   - Recent or time-sensitive claims
   - Conceptual or general statements
4. Prism analyses the response and automatically flags:
   - 🔴 **Quantitative claims** — specific numbers, percentages, financial metrics
   - 🟡 **Recent claims** — current state, recent events, time-sensitive information
   - ✅ **Conceptual claims** — general principles, no flag needed
5. User clicks a flag icon to see the verification tooltip
6. Tooltip shows: what to verify + where to verify it (BSE filing, RBI report, Bloomberg, etc.)
7. User clicks **"Mark as Verified"** on each claim
8. **"What Prism Assumes"** panel at the bottom shows key assumptions made in generating this response
9. Once all critical claims are verified, Prism shows: **"All claims checked — ready to submit"**

---

## Functional Requirements

### F1 — Chat Interface
- Clean chat UI resembling Claude
- Sidebar navigation (New chat, History, Verified Claims, Settings)
- Welcome state: time-aware greeting, centered input box, suggestion chips
- Chat state: scrollable message thread, bottom input bar
- Mobile responsive layout

### F2 — Prism Claim Flagging
- Automatically detect and flag sentences in **real LLM output** containing:
  - Specific numbers, percentages, financial figures
  - Time-sensitive phrases: "currently", "recently", "as of", "latest", "in 2024", "growing"
  - Hidden assumptions or generalised sector claims
- Maximum **3 flags per response** (prevents overwhelm)
- Flag icon appears inline next to the flagged sentence
- Safe conceptual claims: no flag, no disruption to reading

### F3 — Verification Tooltip
- Clicking/tapping a flag opens a tooltip
- Tooltip contains:
  - Claim type (Quantitative / Recent)
  - Specific verification action: what to check
  - Suggested source: where to verify (BSE filing, Bloomberg, RBI, company annual report)
  - Example: *"This EBITDA margin figure may be outdated — verify against latest BSE quarterly filing"*
- **"Mark as Verified"** button inside tooltip

### F4 — What Prism Assumes Panel
- Collapsible panel below each AI response
- Shows 2–3 key assumptions the model made to generate this response (built dynamically from detected flag types)
- Shows 1–2 pieces of information that may be missing
- Example assumptions:
  - *"Analysis is based on the model's training data — not real-time"*
  - *"Figures cited reflect historical averages — verify against latest filings"*
  - *"Recent trends may have shifted due to earnings, policy, or macro events"*

### F5 — Verification Progress
- Progress indicator showing: *"2 of 3 claims verified"*
- When all claims verified: *"All claims checked ✓ — ready to submit"*
- Verified claims show a green checkmark replacing the flag

### F6 — Prism Quiet Mode
- If response contains only conceptual or definitional content — no flags appear
- Small label: *"No verification needed — this response contains general guidance only"*
- Triggered automatically when `analyseResponse()` finds zero flaggable sentences

### F7 — API Key Configuration
- First-run config screen: user enters their DeepSeek API key
- Key stored in `localStorage` — no backend required
- Graceful error state if key is missing or call fails

---

## Expected Output

A working single-page web application (HTML/CSS/JavaScript) that:

- Displays a Claude-like chat interface with sidebar navigation
- Accepts **any financial research prompt** and returns a **real DeepSeek LLM response**
- Demonstrates all Prism features on live output:
  - Inline claim flags on up to 3 sentences
  - Tooltip with verification action on click
  - "Mark as Verified" interaction with checkmark animation
  - "What Prism Assumes" collapsible panel
  - Progress indicator updating as claims are verified
  - "All claims checked" final state
- Shows quiet mode naturally on definitional prompts ("What is EBITDA?")
- Is mobile responsive
- Is deployable to Vercel with a shareable link

---

## Optional Enhancements

- Manual flagging: user can tap any sentence to add a Prism flag manually
- Session history: "Claims verified this session: 5"
- Skill progress indicator: *"You have verified 12 claims this week — your evaluation skills are building"*
- Senior analyst toggle: hide Prism markers for experienced users
- Streaming output: show DeepSeek response word-by-word as it arrives, then run Prism analysis when complete

---

## Example Conversation (now real, not mock)

**User prompt:**
> "I'm preparing a research note on Tata Consumer Products. Is my EBITDA margin assumption of 11% for FY25 reasonable? Also what are the key margin drivers I should model?"

**DeepSeek response (real output, Prism-analysed):**

> *"Tata Consumer's EBITDA margins have historically ranged between 9–11% over the past three fiscal years."* 🔴
>
> *"Margin performance in FMCG is primarily driven by raw material costs — particularly tea, coffee, and salt — which are commodity-linked and subject to global price movements."* ✅
>
> *"The company has been aggressively expanding its rural distribution network, which has supported volume growth but added incremental distribution costs in recent quarters."* 🟡
>
> *"Your 11% assumption sits at the upper end of the historical range. Key risks include commodity price volatility and the pace of premiumisation revenue mix."* ✅

**What Prism Assumes:**
- Analysis is based on the model's training data — not real-time
- Figures cited reflect historical averages — verify against latest BSE filings
- Recent trends may have shifted due to earnings surprises or macro events

**May be missing:**
- Latest BSE quarterly results or management commentary
- Real-time commodity prices or currency movements that affect margins
