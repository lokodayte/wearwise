// =============================================================================
// Wearwise — Shared TypeScript types (used by /app and /backend)
// =============================================================================

// ---------------------------------------------------------------------------
// Enums (mirror the SQL enums)
// ---------------------------------------------------------------------------
export type GarmentCategory =
  | 'top'
  | 'bottom'
  | 'shoes'
  | 'outerwear'
  | 'dress'
  | 'accessory';

export type GarmentFormality = 'casual' | 'smart-casual' | 'formal';

export type OutfitRating = 'loved' | 'worn' | 'skipped';

export type SubscriptionTier = 'free' | 'pro' | 'premium';

// ---------------------------------------------------------------------------
// Database row types
// ---------------------------------------------------------------------------
export interface User {
  id: string;
  email: string;
  created_at: string;
  style_profile: StyleProfile | null;
  subscription_tier: SubscriptionTier;
  push_token: string | null;
  timezone: string | null;
  city: string | null;
  calendar_connected: boolean;
}

export interface StyleProfile {
  preferred_styles?: string[];
  preferred_colors?: string[];
  avoided_colors?: string[];
  body_shape?: string;
  style_icons?: string[];
  occasion_frequency?: Record<string, number>;
  [key: string]: unknown;
}

export interface Garment {
  id: string;
  user_id: string;
  image_url: string;
  category: GarmentCategory;
  color: string | null;
  pattern: string | null;
  formality: GarmentFormality | null;
  season: string[];
  brand: string | null;
  purchase_price: number | null;
  tags: string[];
  times_worn: number;
  last_worn: string | null;
  created_at: string;
}

export interface Outfit {
  id: string;
  user_id: string;
  garment_ids: string[];
  ai_explanation: string | null;
  occasion: string | null;
  weather_context: WeatherContext | null;
  rating: OutfitRating | null;
  worn_on: string | null;
  created_at: string;
}

export interface WearLog {
  id: string;
  user_id: string;
  outfit_id: string | null;
  garment_ids: string[];
  worn_date: string;
  occasion: string | null;
  weather_temp: number | null;
  weather_desc: string | null;
  user_rating: number | null;
  notes: string | null;
  created_at: string;
}

export interface DailySuggestion {
  id: string;
  user_id: string;
  date: string;
  outfit_id: string | null;
  score: number;
  reason_codes: string[];
  weather_snapshot: WeatherSnapshot | null;
  viewed: boolean;
  acted_on: boolean;
  created_at: string;
}

export interface ShoppingRec {
  id: string;
  user_id: string;
  gap_type: string | null;
  product_name: string;
  product_url: string | null;
  price: number | null;
  image_url: string | null;
  clicked: boolean;
  purchased: boolean;
  created_at: string;
}

export interface StyleReport {
  id: string;
  user_id: string;
  month: string;
  pdf_url: string | null;
  insights: ReportInsights | null;
  most_worn: string[];
  least_worn: string[];
  cost_per_wear_avg: number | null;
  generated_at: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Nested JSON types
// ---------------------------------------------------------------------------
export interface WeatherContext {
  temp_c?: number;
  feels_like_c?: number;
  condition?: string;
  humidity?: number;
  wind_kph?: number;
}

export interface WeatherSnapshot extends WeatherContext {
  city?: string;
  fetched_at?: string;
}

export interface ReportInsights {
  total_outfits?: number;
  unique_garments_used?: number;
  most_worn_category?: GarmentCategory;
  avg_daily_rating?: number;
  wardrobe_utilization_pct?: number;
  style_notes?: string[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// API request / response shapes
// ---------------------------------------------------------------------------
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  per_page: number;
}

export interface CreateGarmentRequest {
  image_url: string;
  category: GarmentCategory;
  color?: string;
  pattern?: string;
  formality?: GarmentFormality;
  season?: string[];
  brand?: string;
  purchase_price?: number;
  tags?: string[];
}

export interface CreateOutfitRequest {
  garment_ids: string[];
  occasion?: string;
  weather_context?: WeatherContext;
}

export interface LogWearRequest {
  outfit_id?: string;
  garment_ids: string[];
  worn_date: string;
  occasion?: string;
  weather_temp?: number;
  weather_desc?: string;
  user_rating?: number;
  notes?: string;
}

export interface RateOutfitRequest {
  outfit_id: string;
  rating: OutfitRating;
}

export interface UpdateStyleProfileRequest {
  style_profile: Partial<StyleProfile>;
}
