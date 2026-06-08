import Anthropic from '@anthropic-ai/sdk';
import type { ScamResult } from '@wearwise/shared';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SAFE_FALLBACK: ScamResult = {
  verdict: 'unclear',
  riskScore: 50,
  scamType: null,
  reasons: ['I could not fully analyze this.'],
  advice:
    'To be safe, do not click anything or send money, and check with someone you trust before acting.',
};

const SYSTEM_PROMPT = `You are a scam-detection assistant for everyday people, including older adults who are not tech-savvy. You analyze a message, email, or link a person received and judge how likely it is to be a scam.

Common scam patterns to watch for: a sense of urgency or threat; requests to pay via gift cards, wire transfer, crypto, or payment apps; someone impersonating a bank, government agency, tech support, a delivery company, or a family member; prizes or lottery wins the person didn't enter; requests for passwords, login codes, PINs, or one-time verification codes; links that don't match the real company's website; romance or new-friend messages that move quickly toward money; "your account is locked / suspended, act now" pressure; too-good-to-be-true job or investment offers.

CRITICAL RULES:
- Err strongly toward caution. Missing a real scam is far worse than a false alarm.
- NEVER declare anything definitively safe. The most reassuring verdict is 'likely_safe', and even then your advice must remind the person to stay careful.
- If the content is harmless-looking but you cannot be sure, use 'unclear' and advise verifying through a trusted, independent channel.
- Write 'reasons' and 'advice' in warm, plain language a worried 70-year-old could understand. No jargon. No condescension.
- Advice should be concrete: e.g. 'Do not click the link. Do not send money or gift cards. If it claims to be your bank, call the number on the back of your card — not any number in this message.'

Return ONLY a valid JSON object with exactly these fields and nothing else (no markdown, no commentary):
{ "verdict": "...", "riskScore": 0, "scamType": null, "reasons": ["..."], "advice": "..." }`;

export async function analyzeInput(input: {
  type: 'text' | 'link';
  content: string;
}): Promise<ScamResult> {
  try {
    const userMessage =
      `The person received this ${input.type} and wants to know if it's a scam:\n\n` +
      input.content;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const raw =
      response.content[0]?.type === 'text' ? response.content[0].text : '';

    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const validVerdicts: ScamResult['verdict'][] = [
      'scam',
      'suspicious',
      'likely_safe',
      'unclear',
    ];

    if (
      !validVerdicts.includes(parsed.verdict as ScamResult['verdict']) ||
      typeof parsed.riskScore !== 'number' ||
      !Array.isArray(parsed.reasons) ||
      typeof parsed.advice !== 'string'
    ) {
      return SAFE_FALLBACK;
    }

    return {
      verdict: parsed.verdict as ScamResult['verdict'],
      riskScore: Math.min(100, Math.max(0, Math.round(parsed.riskScore as number))),
      scamType: parsed.scamType ? String(parsed.scamType) : null,
      reasons: (parsed.reasons as unknown[]).slice(0, 5).map(String),
      advice: String(parsed.advice),
    };
  } catch {
    return SAFE_FALLBACK;
  }
}
