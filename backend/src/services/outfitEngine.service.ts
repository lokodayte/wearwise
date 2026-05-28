import Anthropic from '@anthropic-ai/sdk';
import type { Garment, GarmentCategory } from '@wearwise/shared';
import { supabaseAdmin } from './supabaseAdmin';

// =============================================================================
// Types
// =============================================================================

export interface OutfitContext {
  weatherTemp: number;
  weatherDesc: string;
  occasion: string;
  date: string;
}

export interface OutfitResult {
  outfitId: string;
  garments: Garment[];
  explanation: string;
  score: number;
  occasion: string;
  weatherContext: {
    temp_c: number;
    condition: string;
  };
}

interface OutfitCombination {
  top?: Garment;
  bottom?: Garment;
  dress?: Garment;
  outerwear?: Garment;
  shoes?: Garment;
}

interface ScoredCombination {
  combo: OutfitCombination;
  score: number;
  breakdown: {
    colorScore: number;
    preferenceScore: number;
    noveltyScore: number;
    weatherFitScore: number;
  };
}

// =============================================================================
// Main export
// =============================================================================

export async function generateOutfit(
  userId: string,
  context: OutfitContext
): Promise<OutfitResult> {
  // -------------------------------------------------------------------------
  // STEP 1 — FILTER
  // -------------------------------------------------------------------------
  const filtered = await filterGarments(userId, context);

  if (filtered.length === 0) {
    throw new Error('No suitable garments found after filtering. Add more items to your wardrobe.');
  }

  // -------------------------------------------------------------------------
  // STEP 2 — BUILD COMBINATIONS
  // -------------------------------------------------------------------------
  const combinations = buildCombinations(filtered, context.weatherTemp);

  if (combinations.length === 0) {
    throw new Error(
      'Could not build a valid outfit combination. Make sure you have tops and bottoms (or a dress) in your wardrobe.'
    );
  }

  // -------------------------------------------------------------------------
  // STEP 3 — SCORE
  // -------------------------------------------------------------------------
  const lovedPatterns = await fetchLovedPatterns(userId);
  const recentOutfitGarmentSets = await fetchRecentOutfitGarmentSets(userId);

  const scored: ScoredCombination[] = combinations.map((combo) =>
    scoreCombo(combo, context, lovedPatterns, recentOutfitGarmentSets)
  );

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  const bestGarments = comboToArray(best.combo);

  // -------------------------------------------------------------------------
  // STEP 4 — EXPLAIN
  // -------------------------------------------------------------------------
  const explanation = await explainOutfit(bestGarments, context);

  // -------------------------------------------------------------------------
  // STEP 5 — SAVE AND RETURN
  // -------------------------------------------------------------------------
  const garmentIds = bestGarments.map((g) => g.id);

  // Upsert outfit row
  const { data: outfit, error: outfitErr } = await supabaseAdmin
    .from('outfits')
    .insert({
      user_id: userId,
      garment_ids: garmentIds,
      ai_explanation: explanation,
      occasion: context.occasion,
      weather_context: {
        temp_c: context.weatherTemp,
        condition: context.weatherDesc,
      },
    })
    .select()
    .single();

  if (outfitErr || !outfit) {
    throw new Error(`Failed to save outfit: ${outfitErr?.message}`);
  }

  // Upsert daily_suggestion (unique per user+date)
  const reasonCodes = buildReasonCodes(best);
  await supabaseAdmin
    .from('daily_suggestions')
    .upsert(
      {
        user_id: userId,
        date: context.date,
        outfit_id: outfit.id,
        score: best.score,
        reason_codes: reasonCodes,
        weather_snapshot: {
          temp_c: context.weatherTemp,
          condition: context.weatherDesc,
          fetched_at: new Date().toISOString(),
        },
        viewed: false,
        acted_on: false,
      },
      { onConflict: 'user_id,date' }
    );

  return {
    outfitId: outfit.id,
    garments: bestGarments,
    explanation,
    score: best.score,
    occasion: context.occasion,
    weatherContext: {
      temp_c: context.weatherTemp,
      condition: context.weatherDesc,
    },
  };
}

// =============================================================================
// STEP 1 — Filter helpers
// =============================================================================

async function filterGarments(userId: string, ctx: OutfitContext): Promise<Garment[]> {
  const { data: garments, error } = await supabaseAdmin
    .from('garments')
    .select('*')
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to fetch garments: ${error.message}`);
  if (!garments || garments.length === 0) return [];

  // Fetch garments worn in the last 3 days
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const cutoff = threeDaysAgo.toISOString().slice(0, 10);

  const { data: recentLogs } = await supabaseAdmin
    .from('wear_logs')
    .select('garment_ids')
    .eq('user_id', userId)
    .gte('worn_date', cutoff);

  const recentlyWornIds = new Set<string>(
    (recentLogs ?? []).flatMap((log: { garment_ids: string[] }) => log.garment_ids)
  );

  return garments.filter((g: Garment) => {
    // Exclude recently worn
    if (recentlyWornIds.has(g.id)) return false;

    // Weather filters
    const temp = ctx.weatherTemp;
    const tags = (g.tags ?? []).map((t: string) => t.toLowerCase());
    const category = g.category;

    if (temp > 20 && (category === 'outerwear' || tags.some((t) => HEAVY_OUTERWEAR.has(t)))) {
      return false;
    }
    if (temp < 12 && tags.some((t) => WARM_WEATHER_TAGS.has(t))) {
      return false;
    }
    if (temp > 18 && tags.some((t) => HEAVY_FABRIC_TAGS.has(t))) {
      return false;
    }

    // Occasion filters
    const occasion = ctx.occasion.toLowerCase();
    if (SPORT_OCCASIONS.some((kw) => occasion.includes(kw))) {
      // Only keep athletic/sport items
      return tags.some((t) => ATHLETIC_TAGS.has(t));
    }
    if (FORMAL_OCCASIONS.some((kw) => occasion.includes(kw))) {
      // Exclude casual-only items
      if (g.formality === 'casual') return false;
    }

    return true;
  });
}

const HEAVY_OUTERWEAR = new Set(['coat', 'parka', 'puffer', 'trench coat', 'heavy coat']);
const WARM_WEATHER_TAGS = new Set(['shorts', 'sandals', 'flip flops', 'tank top', 'sleeveless']);
const HEAVY_FABRIC_TAGS = new Set(['heavy wool', 'thick wool', 'fleece', 'puffer', 'padded']);
const SPORT_OCCASIONS = ['gym', 'sport', 'workout', 'running', 'fitness', 'yoga'];
const FORMAL_OCCASIONS = ['formal', 'meeting', 'interview', 'wedding', 'gala', 'business'];
const ATHLETIC_TAGS = new Set([
  'athletic', 'sport', 'gym', 'activewear', 'running', 'workout',
  'leggings', 'joggers', 'track', 'jersey', 'compression',
]);

// =============================================================================
// STEP 2 — Build combinations
// =============================================================================

function buildCombinations(garments: Garment[], temp: number): OutfitCombination[] {
  const tops = garments.filter((g) => g.category === 'top');
  const bottoms = garments.filter((g) => g.category === 'bottom');
  const dresses = garments.filter((g) => g.category === 'dress');
  const outerwear = garments.filter((g) => g.category === 'outerwear');
  const shoes = garments.filter((g) => g.category === 'shoes');
  const needsOuterwear = temp < 15;

  const combos: OutfitCombination[] = [];

  // top + bottom combinations
  for (const top of tops) {
    for (const bottom of bottoms) {
      const base: OutfitCombination = { top, bottom };
      expandWithOuterwearAndShoes(base, outerwear, shoes, needsOuterwear, combos);
      if (combos.length >= 200) return combos;
    }
  }

  // dress combinations
  for (const dress of dresses) {
    const base: OutfitCombination = { dress };
    expandWithOuterwearAndShoes(base, outerwear, shoes, needsOuterwear, combos);
    if (combos.length >= 200) return combos;
  }

  return combos;
}

function expandWithOuterwearAndShoes(
  base: OutfitCombination,
  outerwear: Garment[],
  shoes: Garment[],
  needsOuterwear: boolean,
  out: OutfitCombination[]
): void {
  const outerOptions: (Garment | undefined)[] = needsOuterwear
    ? outerwear
    : [undefined, ...outerwear];

  const shoeOptions: (Garment | undefined)[] = [undefined, ...shoes];

  for (const ow of outerOptions) {
    for (const shoe of shoeOptions) {
      if (out.length >= 200) return;
      out.push({ ...base, outerwear: ow, shoes: shoe });
    }
  }
}

// =============================================================================
// STEP 3 — Scoring
// =============================================================================

interface LovedPatterns {
  colors: Record<string, number>;
  formalities: Record<string, number>;
}

async function fetchLovedPatterns(userId: string): Promise<LovedPatterns> {
  const { data: loved } = await supabaseAdmin
    .from('outfits')
    .select('garment_ids')
    .eq('user_id', userId)
    .eq('rating', 'loved');

  if (!loved || loved.length === 0) return { colors: {}, formalities: {} };

  const allIds = loved.flatMap((o: { garment_ids: string[] }) => o.garment_ids);
  if (allIds.length === 0) return { colors: {}, formalities: {} };

  const { data: garments } = await supabaseAdmin
    .from('garments')
    .select('color, formality')
    .in('id', allIds);

  const colors: Record<string, number> = {};
  const formalities: Record<string, number> = {};

  for (const g of garments ?? []) {
    if (g.color) colors[g.color] = (colors[g.color] ?? 0) + 1;
    if (g.formality) formalities[g.formality] = (formalities[g.formality] ?? 0) + 1;
  }

  return { colors, formalities };
}

async function fetchRecentOutfitGarmentSets(userId: string): Promise<Set<string>[]> {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const { data: logs } = await supabaseAdmin
    .from('wear_logs')
    .select('garment_ids')
    .eq('user_id', userId)
    .gte('worn_date', fourteenDaysAgo.toISOString().slice(0, 10));

  return (logs ?? []).map(
    (log: { garment_ids: string[] }) => new Set(log.garment_ids)
  );
}

function scoreCombo(
  combo: OutfitCombination,
  ctx: OutfitContext,
  lovedPatterns: LovedPatterns,
  recentSets: Set<string>[]
): ScoredCombination {
  const items = comboToArray(combo);

  const colorScore = computeColorScore(items);
  const preferenceScore = computePreferenceScore(items, lovedPatterns);
  const noveltyScore = computeNoveltyScore(items, recentSets);
  const weatherFitScore = computeWeatherFitScore(items, ctx.weatherTemp, ctx.date);

  return {
    combo,
    score: colorScore + preferenceScore + noveltyScore + weatherFitScore,
    breakdown: { colorScore, preferenceScore, noveltyScore, weatherFitScore },
  };
}

// ---------------------------------------------------------------------------
// colorScore (0–40)
// ---------------------------------------------------------------------------
const NEUTRALS = new Set([
  'white', 'black', 'grey', 'gray', 'navy', 'beige', 'camel', 'cream',
  'off-white', 'ivory', 'charcoal', 'stone', 'tan',
]);

// Simplified color wheel groups for analogous / complementary detection
const COLOR_WHEEL: Record<string, number> = {
  red: 0, 'red-orange': 30, orange: 60, 'yellow-orange': 90,
  yellow: 120, 'yellow-green': 150, green: 180, 'blue-green': 210,
  blue: 240, 'blue-violet': 270, violet: 300, 'red-violet': 330,
  purple: 285, pink: 345, coral: 15, teal: 195, brown: 35,
};

function getWheelAngle(color: string): number | null {
  const lower = color.toLowerCase();
  for (const [key, angle] of Object.entries(COLOR_WHEEL)) {
    if (lower.includes(key)) return angle;
  }
  return null;
}

function angleDiff(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function computeColorScore(items: Garment[]): number {
  const colors = items.map((g) => (g.color ?? 'unknown').toLowerCase()).filter((c) => c !== 'unknown');
  if (colors.length === 0) return 20; // no data — neutral score

  const isNeutral = (c: string) => NEUTRALS.has(c);
  const neutralCount = colors.filter(isNeutral).length;

  // All neutrals
  if (neutralCount === colors.length) return 35;

  // At least one non-neutral
  const nonNeutrals = colors.filter((c) => !isNeutral(c));

  // Neutral + anything = near perfect
  if (neutralCount >= 1 && nonNeutrals.length === 1) return 39;
  if (neutralCount >= 1 && nonNeutrals.length > 1) return 36;

  // Two non-neutrals — check harmony
  if (nonNeutrals.length >= 2) {
    const angles = nonNeutrals.map(getWheelAngle).filter((a): a is number => a !== null);
    if (angles.length < 2) return 22; // unknown colors

    let minDiff = Infinity;
    for (let i = 0; i < angles.length - 1; i++) {
      for (let j = i + 1; j < angles.length; j++) {
        minDiff = Math.min(minDiff, angleDiff(angles[i], angles[j]));
      }
    }

    if (minDiff <= 60) return 32;   // analogous
    if (minDiff >= 150) return 27;  // complementary
    if (minDiff >= 120) return 24;  // triadic-ish
    return 8;                        // clashing
  }

  return 22;
}

// ---------------------------------------------------------------------------
// preferenceScore (0–30)
// ---------------------------------------------------------------------------
function computePreferenceScore(items: Garment[], patterns: LovedPatterns): number {
  if (Object.keys(patterns.colors).length === 0) return 15; // no history yet

  const totalColorVotes = Object.values(patterns.colors).reduce((a, b) => a + b, 0);
  const totalFormalityVotes = Object.values(patterns.formalities).reduce((a, b) => a + b, 0);

  let colorMatch = 0;
  let formalityMatch = 0;

  for (const item of items) {
    const c = (item.color ?? '').toLowerCase();
    if (c && patterns.colors[c]) {
      colorMatch += patterns.colors[c] / totalColorVotes;
    }
    const f = item.formality ?? '';
    if (f && patterns.formalities[f]) {
      formalityMatch += patterns.formalities[f] / totalFormalityVotes;
    }
  }

  const colorPct = Math.min(colorMatch / items.length, 1);
  const formalityPct = Math.min(formalityMatch / items.length, 1);

  return Math.round((colorPct * 18) + (formalityPct * 12));
}

// ---------------------------------------------------------------------------
// noveltyScore (0–20)
// ---------------------------------------------------------------------------
function computeNoveltyScore(items: Garment[], recentSets: Set<string>[]): number {
  if (recentSets.length === 0) return 20; // nothing worn recently = maximum novelty

  const ids = new Set(items.map((g) => g.id));
  let maxOverlap = 0;

  for (const worn of recentSets) {
    let overlap = 0;
    for (const id of ids) {
      if (worn.has(id)) overlap++;
    }
    maxOverlap = Math.max(maxOverlap, overlap / ids.size);
  }

  // 0 overlap → 20 pts, full overlap → 0 pts
  return Math.round((1 - maxOverlap) * 20);
}

// ---------------------------------------------------------------------------
// weatherFitScore (0–10)
// ---------------------------------------------------------------------------
const SEASON_TEMP_MAP: Record<string, [number, number]> = {
  spring: [10, 18],
  summer: [18, 50],
  autumn: [8, 18],
  winter: [-20, 12],
};

function getCurrentSeason(date: string): string {
  const month = new Date(date).getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function computeWeatherFitScore(items: Garment[], temp: number, date: string): number {
  const currentSeason = getCurrentSeason(date);
  let matched = 0;

  for (const item of items) {
    const seasons = item.season ?? [];
    if (seasons.length === 0) { matched += 0.5; continue; } // neutral
    if (seasons.includes(currentSeason)) {
      matched++;
    } else {
      // Partial credit if temperature is in the item's season range
      const inRange = seasons.some((s) => {
        const range = SEASON_TEMP_MAP[s];
        return range && temp >= range[0] && temp <= range[1];
      });
      if (inRange) matched += 0.5;
    }
  }

  return Math.round((matched / items.length) * 10);
}

// =============================================================================
// STEP 4 — Explain with Claude
// =============================================================================

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function explainOutfit(items: Garment[], ctx: OutfitContext): Promise<string> {
  const itemDescriptions = items
    .map((g) => `${g.color ?? ''} ${g.category}${g.brand ? ` (${g.brand})` : ''}`.trim())
    .join(', ');

  const prompt =
    `In exactly 2 friendly sentences, explain why this outfit works: ${itemDescriptions}. ` +
    `The weather today is ${ctx.weatherDesc} at ${ctx.weatherTemp}°C and the occasion is ${ctx.occasion}. ` +
    `Be specific about the color harmony and the weather suitability. Sound like a friendly personal stylist.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    });

    const block = message.content[0];
    return block.type === 'text' ? block.text.trim() : 'A great outfit choice for today!';
  } catch (err) {
    console.error('[outfitEngine] Claude explanation failed:', err);
    return `This outfit is a great match for ${ctx.occasion} in ${ctx.weatherDesc} conditions.`;
  }
}

// =============================================================================
// Utility helpers
// =============================================================================

function comboToArray(combo: OutfitCombination): Garment[] {
  return [combo.top, combo.bottom, combo.dress, combo.outerwear, combo.shoes].filter(
    (g): g is Garment => g !== undefined
  );
}

function buildReasonCodes(scored: ScoredCombination): string[] {
  const codes: string[] = [];
  const { colorScore, preferenceScore, noveltyScore, weatherFitScore } = scored.breakdown;
  if (colorScore >= 35) codes.push('great_color_harmony');
  if (preferenceScore >= 20) codes.push('matches_your_style');
  if (noveltyScore >= 18) codes.push('fresh_combination');
  if (noveltyScore <= 5) codes.push('familiar_favourite');
  if (weatherFitScore >= 8) codes.push('weather_perfect');
  if (codes.length === 0) codes.push('balanced_outfit');
  return codes;
}
