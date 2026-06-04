import OpenAI from 'openai';
import sharp from 'sharp';
import type { GarmentCategory, GarmentFormality } from '@wearwise/shared';

// ---------------------------------------------------------------------------
// GPT-4o Vision tagging service
// ---------------------------------------------------------------------------

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT =
  'You are a fashion expert AI. Analyze this clothing item and return ONLY a JSON object with these fields: ' +
  'category (one of: top/bottom/shoes/outerwear/dress/accessory), ' +
  'color (primary color name), ' +
  'secondaryColor (optional), ' +
  'pattern (solid/striped/checked/floral/graphic/other), ' +
  'fabric (cotton/wool/denim/leather/synthetic/silk/linen/unknown), ' +
  'formality (casual/smart-casual/formal), ' +
  'season (array from: spring/summer/autumn/winter), ' +
  'style_tags (array of 3-5 descriptive style words). ' +
  'Return only valid JSON, no markdown, no explanation.';

export interface GarmentTags {
  category: GarmentCategory;
  color: string;
  secondaryColor?: string;
  pattern: string;
  fabric: string;
  formality: GarmentFormality;
  season: string[];
  style_tags: string[];
}

const FALLBACK_TAGS: GarmentTags = {
  category: 'top' as GarmentCategory, // caller should use 'unknown' semantically
  color: 'unknown',
  pattern: 'solid',
  fabric: 'unknown',
  formality: 'casual',
  season: [],
  style_tags: [],
};

/**
 * Ask GPT-4o Vision to analyse a clothing image (PNG buffer).
 * Retries once on failure before returning fallback tags.
 */
export async function tagGarmentWithAI(pngBuffer: Buffer): Promise<GarmentTags> {
  // Shrink to 512px max-side before encoding — detail: 'low' uses a fixed 512×512
  // tile anyway, so sending anything larger wastes bandwidth with no quality gain.
  const resized = await sharp(pngBuffer)
    .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const base64 = resized.toString('base64');
  const dataUrl = `data:image/jpeg;base64,${base64}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 250,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: dataUrl, detail: 'low' },
              },
            ],
          },
        ],
      });

      const raw = response.choices[0]?.message?.content ?? '';
      const tags = parseTagResponse(raw);
      return tags;
    } catch (err) {
      console.error(`[aiTagging] attempt ${attempt} failed:`, err);
      if (attempt === 2) {
        console.warn('[aiTagging] Both attempts failed — returning fallback tags');
        return FALLBACK_TAGS;
      }
      // brief back-off before retry
      await sleep(1500);
    }
  }

  return FALLBACK_TAGS;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseTagResponse(raw: string): GarmentTags {
  // Strip markdown code fences if GPT-4o disobeys the prompt
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  const validCategories: GarmentCategory[] = [
    'top', 'bottom', 'shoes', 'outerwear', 'dress', 'accessory',
  ];
  const validFormalities: GarmentFormality[] = ['casual', 'smart-casual', 'formal'];

  const category = validCategories.includes(parsed.category as GarmentCategory)
    ? (parsed.category as GarmentCategory)
    : 'top';

  const formality = validFormalities.includes(parsed.formality as GarmentFormality)
    ? (parsed.formality as GarmentFormality)
    : 'casual';

  return {
    category,
    color: String(parsed.color ?? 'unknown'),
    secondaryColor: parsed.secondaryColor ? String(parsed.secondaryColor) : undefined,
    pattern: String(parsed.pattern ?? 'solid'),
    fabric: String(parsed.fabric ?? 'unknown'),
    formality,
    season: Array.isArray(parsed.season) ? parsed.season.map(String) : [],
    style_tags: Array.isArray(parsed.style_tags) ? parsed.style_tags.map(String) : [],
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
