import { supabaseAdmin } from '../services/supabaseAdmin';
import { generateOutfit } from '../services/outfitEngine.service';

interface WeatherResult {
  temp: number;
  desc: string;
}

async function fetchWeatherForCity(city: string | null): Promise<WeatherResult> {
  const defaultWeather: WeatherResult = { temp: 18, desc: 'clear' };
  if (!city) return defaultWeather;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // Geocode city name to coordinates
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
      { signal: controller.signal }
    );
    const geoData = await geoRes.json();
    clearTimeout(timeout);

    if (!geoData.results?.[0]) return defaultWeather;
    const { latitude, longitude } = geoData.results[0];

    // Fetch current weather
    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), 5000);
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode`,
      { signal: controller2.signal }
    );
    const weatherData = await weatherRes.json();
    clearTimeout(timeout2);

    const temp = Math.round(weatherData.current?.temperature_2m ?? 18);
    const desc = weatherCodeToDesc(weatherData.current?.weathercode ?? 0);
    return { temp, desc };
  } catch {
    return defaultWeather;
  }
}

function weatherCodeToDesc(code: number): string {
  if (code === 0) return 'clear';
  if (code <= 3) return 'partly cloudy';
  if (code <= 48) return 'fog';
  if (code <= 55) return 'drizzle';
  if (code <= 65) return 'rain';
  if (code <= 77) return 'snow';
  if (code <= 82) return 'rain showers';
  if (code <= 86) return 'snow showers';
  return 'stormy';
}

export async function generateDailySuggestionsForAllUsers(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id, city');

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

      const weather = await fetchWeatherForCity(user.city ?? null);

      await generateOutfit(user.id, {
        weatherTemp: weather.temp,
        weatherDesc: weather.desc,
        occasion: 'casual',
        date: today,
      });
    })
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;
  console.log(`[dailySuggestions] Done — ${succeeded} generated, ${failed} failed`);
}
