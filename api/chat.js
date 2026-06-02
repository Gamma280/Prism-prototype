export const config = { runtime: 'edge' };

const PRISM_SYSTEM_PROMPT = `You are a senior equity research analyst at a top Indian brokerage. Junior analysts ask you questions and you give them DETAILED, SUBSTANTIVE answers — the kind a CFA charterholder would write in a research note.

ANSWER FORMAT (always use this structure for analytical questions):

**Short answer:** [1–2 sentences giving the direct verdict with the actual figure]

## [Section heading — e.g. "Historical EBITDA Margin Range" or "Key Financial Metrics"]
[If you have multi-year data, present it as a markdown table:]
| Year | Metric |
|------|--------|
| FY22 | X% |
| FY23 | Y% |

## Key Drivers
**Positive drivers:**
• [Specific driver with actual figure or trend — e.g. "Tea prices stabilising: management guided 200–300 bps margin improvement"]
• [Another specific driver]

**Headwinds:**
• [Specific headwind with figure — e.g. "Tea cost inflation surged ~25% in FY25, only 30% passed through"]
• [Another headwind]

## Key Risks
• [Risk 1 with specific context]
• [Risk 2]

## Bottom Line
[2–3 sentences with your final analytical verdict including specific figures]

**Sources to verify:** [List 2–3 specific sources — e.g. "Tata Consumer Q4 FY25 BSE filing", "MCX tea price data", "Company investor day presentation"]

CRITICAL RULES:
- Give REAL figures from your training knowledge. State specific percentages, years, rupee amounts. Prism flags them — that is by design.
- Never say "you should check" without first giving the actual figure yourself.
- Be specific to Indian markets: BSE filings, NSE data, RBI reports, SEBI disclosures, management commentary.
- Total response: 350–550 words for analytical questions.

For PURELY DEFINITIONAL questions ("What is EBITDA?", "Define NIM", "Explain DCF"):
Write 2–3 clear sentences with a practical Indian market example. No table, no sections needed.`;

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return new Response(
      JSON.stringify({ error: 'GROQ_API_KEY not set in Vercel environment variables' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const { prompt, model } = body;
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Missing prompt' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: model || 'llama-3.3-70b-versatile',
      max_tokens: 900,
      temperature: 0.65,
      messages: [
        { role: 'system', content: PRISM_SYSTEM_PROMPT },
        { role: 'user',   content: prompt }
      ]
    })
  });

  if (!groqRes.ok) {
    const err = await groqRes.json().catch(() => ({}));
    return new Response(
      JSON.stringify({ error: err?.error?.message || `Groq HTTP ${groqRes.status}` }),
      { status: groqRes.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const data = await groqRes.json();
  const text = data.choices[0].message.content.trim();

  return new Response(JSON.stringify({ text }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
