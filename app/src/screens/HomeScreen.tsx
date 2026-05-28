import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  Animated,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonBox } from '../components/SkeletonBox';
import { useOutfitSuggestion } from '../hooks/useOutfitSuggestion';
import type { GarmentItem } from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
const MAIN_CARD_HEIGHT = SCREEN_H * 0.60;

const COLORS = {
  bg: '#FAFAF8',
  card: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#9B9B9B',
  accent: '#2D2D2D',
  chipBg: '#F0EFE9',
  chipText: '#5A5A52',
  divider: '#EFEFEB',
  loveRed: '#E05555',
  wearGreen: '#4CAF80',
  refreshBlue: '#5B8DEF',
  skeletonBase: '#E8E8E4',
} as const;

const WEATHER_EMOJIS: Record<string, string> = {
  clear: '☀️', sunny: '☀️', cloudy: '☁️', overcast: '☁️',
  rain: '🌧️', rainy: '🌧️', drizzle: '🌦️', snow: '❄️',
  snowy: '❄️', storm: '⛈️', fog: '🌫️', foggy: '🌫️',
  windy: '💨', humid: '🌫️', hot: '🌡️',
};

function weatherEmoji(desc: string): string {
  const lower = desc.toLowerCase();
  for (const [key, emoji] of Object.entries(WEATHER_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return '🌤️';
}

function greetingPrefix(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HomeScreen
// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { state, loadToday, refresh, loveIt, wearIt } = useOutfitSuggestion();

  // Card slide animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [wornDone, setWornDone] = useState(false);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  // Animate card in on new outfit
  useEffect(() => {
    if (state.status === 'success') {
      slideAnim.setValue(SCREEN_W);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 12,
        useNativeDriver: true,
      }).start();
    }
  }, [state.outfitId]);

  const handleRefresh = useCallback(async () => {
    // Slide current card out left, then fetch
    Animated.timing(slideAnim, {
      toValue: -SCREEN_W,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      refresh(false, state.weatherTemp ?? 18, state.weatherDesc, state.occasion);
    });
  }, [state, refresh]);

  const handleWearIt = useCallback(async () => {
    await wearIt();
    setWornDone(true);
    setTimeout(() => setWornDone(false), 2200);
  }, [wearIt]);

  const isLoading = state.status === 'idle' || state.status === 'loading';
  const isRefreshing = state.status === 'refreshing';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() =>
              refresh(false, state.weatherTemp ?? 18, state.weatherDesc, state.occasion)
            }
            tintColor={COLORS.textTertiary}
          />
        }
      >
        {/* ── 1. Header ── */}
        <Header
          name={state.userFirstName}
          weatherTemp={state.weatherTemp}
          weatherDesc={state.weatherDesc}
          isLoading={isLoading}
        />

        {/* ── 2. Section label ── */}
        <Text style={styles.sectionLabel}>Today's outfit</Text>

        {/* ── 3. Main outfit card ── */}
        {isLoading ? (
          <OutfitCardSkeleton />
        ) : (
          <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
            <OutfitCard
              garments={state.garments}
              explanation={state.explanation}
              occasion={state.occasion}
              weatherTemp={state.weatherTemp}
              weatherDesc={state.weatherDesc}
            />
          </Animated.View>
        )}

        {/* ── 4. Action buttons ── */}
        <ActionRow
          onLove={loveIt}
          onWear={handleWearIt}
          onRefresh={handleRefresh}
          wornDone={wornDone}
          disabled={isLoading || isRefreshing}
        />

        {/* ── 5. Alternative outfits placeholder ── */}
        <AlternativesRow isLoading={isLoading} />

        {/* ── 6. Forgotten items ── */}
        <ForgottenRow items={state.forgottenItems} isLoading={isLoading} />

        {/* Error state */}
        {state.status === 'error' && state.error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{state.error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

// ── Header ────────────────────────────────────────────────────────────────────

interface HeaderProps {
  name: string;
  weatherTemp: number | null;
  weatherDesc: string;
  isLoading: boolean;
}

function Header({ name, weatherTemp, weatherDesc, isLoading }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>
          {greetingPrefix()}{name ? `, ${name}` : ''}
        </Text>
        <Text style={styles.dateText}>{formatDate()}</Text>
      </View>

      {isLoading ? (
        <SkeletonBox width={80} height={32} borderRadius={20} />
      ) : (
        <View style={styles.weatherChip}>
          <Text style={styles.weatherChipText}>
            {weatherTemp !== null ? `${Math.round(weatherTemp)}°C ` : ''}
            {weatherDesc ? weatherEmoji(weatherDesc) : '🌤️'}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Main outfit card ──────────────────────────────────────────────────────────

interface OutfitCardProps {
  garments: GarmentItem[];
  explanation: string;
  occasion: string;
  weatherTemp: number | null;
  weatherDesc: string;
}

function OutfitCard({
  garments,
  explanation,
  occasion,
  weatherTemp,
  weatherDesc,
}: OutfitCardProps) {
  // Show up to 4 garments in the grid (top, bottom, shoes, outerwear)
  const displayGarments = garments.slice(0, 4);
  const itemSize = (SCREEN_W - 48 - 24) / 3; // 3 columns, 16px padding each side, 8px gaps

  return (
    <View style={[styles.card, styles.mainCard]}>
      {/* Garment photo grid */}
      {displayGarments.length === 0 ? (
        <View style={styles.emptyGarmentsBox}>
          <Text style={styles.emptyGarmentsText}>
            Add items to your wardrobe to get outfit suggestions
          </Text>
        </View>
      ) : (
        <View style={styles.garmentGrid}>
          {displayGarments.map((g) => (
            <GarmentTile key={g.id} garment={g} size={itemSize} />
          ))}
        </View>
      )}

      {/* AI explanation */}
      {explanation ? (
        <Text style={styles.explanation}>{explanation}</Text>
      ) : null}

      {/* Chips row */}
      <View style={styles.chipsRow}>
        {occasion ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{occasion}</Text>
          </View>
        ) : null}
        {weatherTemp !== null && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>
              {Math.round(weatherTemp)}°C {weatherEmoji(weatherDesc)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function OutfitCardSkeleton() {
  const itemSize = (SCREEN_W - 48 - 24) / 3;
  return (
    <View style={[styles.card, styles.mainCard]}>
      <View style={styles.garmentGrid}>
        {[0, 1, 2].map((i) => (
          <SkeletonBox
            key={i}
            width={itemSize}
            height={itemSize}
            borderRadius={12}
          />
        ))}
      </View>
      <SkeletonBox width="90%" height={14} borderRadius={4} style={styles.skeletonLine} />
      <SkeletonBox width="70%" height={14} borderRadius={4} style={styles.skeletonLine} />
      <View style={styles.chipsRow}>
        <SkeletonBox width={80} height={28} borderRadius={14} />
        <SkeletonBox width={60} height={28} borderRadius={14} style={{ marginLeft: 8 }} />
      </View>
    </View>
  );
}

// ── Garment tile ──────────────────────────────────────────────────────────────

function GarmentTile({ garment, size }: { garment: GarmentItem; size: number }) {
  const [imgError, setImgError] = useState(false);

  return (
    <View
      style={[
        styles.garmentTile,
        { width: size, height: size },
      ]}
    >
      {garment.image_url && !imgError ? (
        <Image
          source={{ uri: garment.image_url }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <View style={styles.garmentPlaceholder}>
          <Text style={styles.garmentPlaceholderText}>
            {categoryEmoji(garment.category)}
          </Text>
        </View>
      )}
      {garment.color && (
        <View style={styles.colorDot} />
      )}
    </View>
  );
}

function categoryEmoji(cat: string): string {
  const map: Record<string, string> = {
    top: '👕', bottom: '👖', shoes: '👟',
    outerwear: '🧥', dress: '👗', accessory: '💍',
  };
  return map[cat] ?? '👚';
}

// ── Action row ────────────────────────────────────────────────────────────────

interface ActionRowProps {
  onLove: () => void;
  onWear: () => void;
  onRefresh: () => void;
  wornDone: boolean;
  disabled: boolean;
}

function ActionRow({ onLove, onWear, onRefresh, wornDone, disabled }: ActionRowProps) {
  return (
    <View style={styles.actionRow}>
      <ActionButton
        onPress={onLove}
        emoji="❤️"
        label="Love it"
        color={COLORS.loveRed}
        disabled={disabled}
      />
      <ActionButton
        onPress={onWear}
        emoji={wornDone ? '✅' : '✓'}
        label={wornDone ? 'Logged!' : 'Wearing this'}
        color={COLORS.wearGreen}
        disabled={disabled}
      />
      <ActionButton
        onPress={onRefresh}
        emoji="↻"
        label="New outfit"
        color={COLORS.refreshBlue}
        disabled={disabled}
      />
    </View>
  );
}

interface ActionButtonProps {
  onPress: () => void;
  emoji: string;
  label: string;
  color: string;
  disabled: boolean;
}

function ActionButton({ onPress, emoji, label, color, disabled }: ActionButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }], flex: 1 }}>
      <TouchableOpacity
        style={[styles.actionBtn, disabled && styles.actionBtnDisabled]}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.85}
      >
        <Text style={styles.actionBtnEmoji}>{emoji}</Text>
        <Text style={[styles.actionBtnLabel, { color }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Alternatives row ──────────────────────────────────────────────────────────

function AlternativesRow({ isLoading }: { isLoading: boolean }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Alternatives</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      >
        {isLoading
          ? [0, 1, 2, 3].map((i) => (
              <SkeletonBox key={i} width={120} height={150} borderRadius={12} style={styles.altCardSkeleton} />
            ))
          : [0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.altCard}>
                <View style={styles.altCardInner}>
                  <Text style={styles.altCardPlaceholder}>✦</Text>
                </View>
                <Text style={styles.altCardLabel}>Outfit {i + 2}</Text>
              </View>
            ))}
      </ScrollView>
    </View>
  );
}

// ── Forgotten items row ───────────────────────────────────────────────────────

interface ForgottenRowProps {
  items: GarmentItem[];
  isLoading: boolean;
}

function ForgottenRow({ items, isLoading }: ForgottenRowProps) {
  if (!isLoading && items.length === 0) return null;

  return (
    <View style={[styles.section, styles.sectionBottom]}>
      <Text style={styles.sectionLabel}>Forgotten in your wardrobe</Text>
      <Text style={styles.sectionSubLabel}>
        Items you haven't worn in 30+ days
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      >
        {isLoading
          ? [0, 1, 2, 3].map((i) => (
              <SkeletonBox key={i} width={90} height={110} borderRadius={12} style={styles.forgottenSkeleton} />
            ))
          : items.map((g) => <ForgottenTile key={g.id} garment={g} />)}
      </ScrollView>
    </View>
  );
}

function ForgottenTile({ garment }: { garment: GarmentItem }) {
  const [imgError, setImgError] = useState(false);
  const daysSince = garment.last_worn
    ? Math.floor((Date.now() - new Date(garment.last_worn).getTime()) / 86_400_000)
    : null;

  return (
    <View style={styles.forgottenTile}>
      <View style={styles.forgottenImg}>
        {garment.image_url && !imgError ? (
          <Image
            source={{ uri: garment.image_url }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <Text style={styles.forgottenEmoji}>{categoryEmoji(garment.category)}</Text>
        )}
      </View>
      {daysSince !== null && (
        <Text style={styles.forgottenDays}>{daysSince}d ago</Text>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const SHADOW = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 3 },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingBottom: 48,
  },

  // ── Header ─────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  dateText: {
    fontSize: 13,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  weatherChip: {
    backgroundColor: COLORS.chipBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  weatherChipText: {
    fontSize: 14,
    color: COLORS.chipText,
    fontWeight: '500',
  },

  // ── Section labels ──────────────────────────────
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.2,
    paddingHorizontal: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  sectionSubLabel: {
    fontSize: 13,
    color: COLORS.textTertiary,
    paddingHorizontal: 20,
    marginTop: -6,
    marginBottom: 12,
  },
  section: {
    marginTop: 28,
  },
  sectionBottom: {
    marginBottom: 8,
  },

  // ── Cards ───────────────────────────────────────
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    ...SHADOW,
  },
  mainCard: {
    minHeight: MAIN_CARD_HEIGHT * 0.55,
    paddingBottom: 20,
  },

  // ── Garment grid ────────────────────────────────
  garmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  garmentTile: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.chipBg,
  },
  garmentPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  garmentPlaceholderText: {
    fontSize: 28,
  },
  colorDot: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  emptyGarmentsBox: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyGarmentsText: {
    textAlign: 'center',
    color: COLORS.textTertiary,
    fontSize: 14,
    lineHeight: 21,
  },

  // ── AI explanation ──────────────────────────────
  explanation: {
    fontSize: 15,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 14,
    // Closest to serif on both platforms
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
  },

  // ── Chips ───────────────────────────────────────
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: COLORS.chipBg,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.chipText,
    fontWeight: '500',
  },

  // ── Skeleton lines inside card ──────────────────
  skeletonLine: {
    marginBottom: 8,
    alignSelf: 'flex-start',
  },

  // ── Action row ──────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    gap: 10,
  },
  actionBtn: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  actionBtnDisabled: {
    opacity: 0.45,
  },
  actionBtnEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  // ── Horizontal lists ─────────────────────────────
  horizontalList: {
    paddingHorizontal: 16,
    gap: 12,
  },

  // ── Alternative cards ────────────────────────────
  altCard: {
    width: 120,
    alignItems: 'center',
  },
  altCardInner: {
    width: 120,
    height: 150,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  altCardPlaceholder: {
    fontSize: 24,
    color: COLORS.textTertiary,
  },
  altCardLabel: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  altCardSkeleton: {
    marginRight: 0,
  },

  // ── Forgotten items ──────────────────────────────
  forgottenTile: {
    width: 90,
    alignItems: 'center',
  },
  forgottenImg: {
    width: 90,
    height: 110,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  forgottenEmoji: {
    fontSize: 26,
  },
  forgottenDays: {
    marginTop: 5,
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  forgottenSkeleton: {
    marginRight: 0,
  },

  // ── Error ───────────────────────────────────────
  errorBox: {
    margin: 20,
    padding: 14,
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
  },
  errorText: {
    color: '#C0392B',
    fontSize: 13,
    lineHeight: 19,
  },
});
