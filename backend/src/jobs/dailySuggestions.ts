import { supabaseAdmin } from '../services/supabaseAdmin';
import { generateOutfit } from '../services/outfitEngine.service';

export async function generateDailySuggestionsForAllUsers(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id');

  if (error || !users) {
    console.error('[dailySuggestions] Failed to fetch users:', error?.message);
    return;
  }

  const results = await Promise.allSettled(
    users.map(async (user) => {
      // Skip if suggestion already exists for today
      const { data: existing } = await supabaseAdmin
        .from('daily_suggestions')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (existing) return;

      await generateOutfit(user.id, {
        weatherTemp: 18,
        weatherDesc: 'clear',
        occasion: 'casual',
        date: today,
      });
    })
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;
  console.log(`[dailySuggestions] Done — ${succeeded} generated, ${failed} failed`);
}
