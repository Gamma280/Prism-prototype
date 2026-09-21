# Prism

**A claim-level evaluation layer for AI outputs.** Prism flags what to verify, right where you read it.

**Live demo:** https://prism-prototype-indol.vercel.app

> This is an independent product case study and interactive prototype. It is not affiliated with or endorsed by Anthropic or any other company. Claude is used as the reference product for the problem, and the prototype itself runs on a Groq-hosted model.

---

## The problem

AI tools produce polished, confident answers even when those answers rest on hidden assumptions or outdated data. Junior financial analysts often cannot tell the difference, because everything looks equally credible.

Existing fixes catch only one kind of failure:

| Failure type | What it means | Caught by existing tools? |
|---|---|---|
| Type A | Wrong facts | Partly (citations) |
| Type B | Correct facts that answer the wrong question, or rest on hidden assumptions | No |

Why current approaches fall short:

- **Citations** verify factual accuracy only and miss hidden assumptions.
- **Confidence scores** feed skimming behaviour. Users see "87%" and trust more, not less.
- **Generic disclaimers** are ignored. In my survey, 34.4% of users never noticed one.

So the real problem is not hallucination. It is **confident facts built on hidden assumptions**.

## Who it is for

**Priya, a junior financial analyst** (22, 0 to 2 years of experience). She uses AI for model validation and MD&A summaries under deadline pressure, with no benchmark to judge the output against.

> Job to be done: "When I use AI to validate my model assumptions under deadline, I want to know which specific parts might be wrong, so I can submit reports without errors, without spending hours re-researching everything."

I chose this segment over recruiters and lawyers because it combines high stakes with a low ability to detect errors: a wrong analysis can lead to a bad investment, client loss and regulatory risk.

## Research behind it

| Method | Sample | Note |
|---|---|---|
| Survey | n = 32 | Exploratory. Findings are directional, not statistically conclusive. |
| Interviews | 6 | Qualitative validation |
| Observation sessions | 2 | Behaviour stayed Prompt, Generate, Accept even after feedback |

Key findings:

- 55.6% of junior analysts accept AI output without any evaluation, compared with 0% of senior analysts.
- 5 out of 9 junior analysts said "it looks good so I don't do anything".
- Public data point: 66% of people use AI regularly but only 46% trust it (KPMG, 2025).

## The solution

I compared three places to intervene, scored with RICE (Reach x Impact x Confidence / Effort):

| Option | When it acts | RICE | Verdict |
|---|---|---|---|
| Intent Capture | Before the answer | 180 | Partial. Awareness before the answer does not guarantee evaluation of it. |
| Evaluation Scaffold | After the answer | 18 | Partial. Post-output nudges did not change behaviour. |
| **Prism** | **During the answer** | **150** | **Chosen.** Acts at the exact moment judgment breaks. |

Prism scores lower than Intent Capture on RICE because Intent Capture's score comes mostly from low effort, not high impact. I chose Prism because my research showed that behaviour changes at the moment of failure, not before or after it.

### How it works

**Layer 1: inline markers.** The model tags its own output at generation time, in three categories:

- **Quantitative claim** (specific numbers, percentages, figures): the marker tells the user what to check, for example "Verify against BSE quarterly filing".
- **Recent claim** (current state, recent events): "May have changed, check latest news".
- **Conceptual claim** (general principles, frameworks): treated as safe to use, so no marker.

**Layer 2: "What Prism assumes" panel.** After the output, a panel lists the assumptions the model made, information that may be missing, and what would change the conclusion.

### How human judgment is preserved

- Prism shows **where** to look, not **what** to conclude.
- The user marks a claim as verified. The user decides, not the model.
- Prism never gives a verdict on correctness.
- Users can manually flag claims that Prism missed.

### Edge cases

1. **Marker overload:** a maximum of 3 markers per output prevents marker blindness.
2. **Missed claims:** the user can tap anywhere to add a flag manually.
3. **Simple queries:** Prism stays quiet on definitional or conceptual questions, and its absence is itself a signal of safety.

## User flow

1. Trigger: a deadline and no benchmark.
2. Priya asks a research question (the prototype uses a Dr. Reddy's EBITDA margin example).
3. The answer arrives with markers on up to 3 claims.
4. She opens a marker, reads what to verify, checks the source, and taps **Mark as Verified**.
5. If a number is wrong, she fixes her model and goes back to the assistant.
6. Once everything is checked, she submits with confidence.

## Success metrics

The goal is to measure **verification behaviour**, not clicks or engagement.

| Metric | Definition | Target |
|---|---|---|
| North Star (lagging) | % of junior analysts who mark at least one verification as checked before closing a session | Higher is better |
| Leading indicator | % who tap at least one marker in their first two weeks | 40% or more |
| Guardrail | % who see every marker but act on none | Under 60% |

**A/B test plan:** standard assistant vs Prism, 10,000 junior-analyst users, 2 weeks. Ship if the lift is above 15% with p < 0.05. Hypothesis: +30% verification behaviour.

## Risks and trade-offs

- **Marker blindness:** users may ignore flags the way they ignored disclaimers. The guardrail metric exists to catch this early.
- **Wrong self-tagging:** the model may flag a safe claim or miss a wrong one. False safety is worse than none.
- **Power user resistance:** experienced analysts may find markers patronising and switch them off.
- **Speed vs accuracy:** Prism adds about 2 to 3 minutes of verification per output. That is acceptable for high-stakes reports and wrong for quick chat.
- **Assistance vs dependence:** the design aims to reduce markers as the user improves, so it builds judgment instead of replacing it.

Prism is not a perfect solution. It moves the trust problem from invisible to visible, but visibility alone does not guarantee action.

## Repository structure

```
Prism-prototype/
  index.html     Front end of the prototype
  api/           Serverless API used by the prototype
  docs/          Case study material
  Image/         Screenshots and images
  vercel.json    Vercel deployment configuration
```

## Tech

- Static front end (`index.html`)
- Serverless API in `api/`, deployed on Vercel
- LLM inference through Groq

## Status

Working prototype for a product case study. It is a proof of concept for testing the interaction, not a production system.
