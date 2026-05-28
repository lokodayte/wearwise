import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import type { GarmentItem } from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const { width: W } = Dimensions.get('window');
const PHOTO_HEIGHT = 300;

const C = {
  bg: '#FAFAF8',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#9B9B9B',
  chip: '#F0EFE9',
  chipText: '#5A5A52',
  divider: '#EFEFEB',
  red: '#E05555',
  green: '#27AE60',
  btn: '#1A1A1A',
} as const;

const SHADOW = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 3 },
});

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface WearLogEntry {
  id: string;
  worn_date: string;
  occasion: string | null;
  user_rating: number | null;
}

interface OutfitCard {
  id: string;
  garment_ids: string[];
  ai_explanation: string | null;
  occasion: string | null;
  created_at: string;
}

interface Props {
  item: GarmentItem;
  onBack: () => void;
  onEdit: (item: GarmentItem) => void;
  onDelete: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// ItemDetailScreen
// ─────────────────────────────────────────────────────────────────────────────

export default function ItemDetailScreen({ item, onBack, onEdit, onDelete }: Props) {
  const [wearLogs, setWearLogs] = useState<WearLogEntry[]>([]);
  const [relatedOutfits, setRelatedOutfits] = useState<OutfitCard[]>([]);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const userId = supabase.auth.getUser().then(({ data }) => data.user?.id);

    (async () => {
      const uid = await userId;
      if (!uid) return;

      const [logsRes, outfitsRes] = await Promise.all([
        supabase
          .from('wear_logs')
          .select('id, worn_date, occasion, user_rating')
          .eq('user_id', uid)
          .contains('garment_ids', [item.id])
          .order('worn_date', { ascending: false })
          .limit(20),
        supabase
          .from('outfits')
          .select('id, garment_ids, ai_explanation, occasion, created_at')
          .eq('user_id', uid)
          .contains('garment_ids', [item.id])
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      setWearLogs((logsRes.data ?? []) as WearLogEntry[]);
      setRelatedOutfits((outfitsRes.data ?? []) as OutfitCard[]);
    })();
  }, [item.id]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete item',
      'This will permanently remove this garment from your wardrobe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('garments').delete().eq('id', item.id);
            onDelete();
          },
        },
      ]
    );
  }, [item.id, onDelete]);

  // Parallax header photo
  const photoTranslate = scrollY.interpolate({
    inputRange: [-PHOTO_HEIGHT, 0, PHOTO_HEIGHT],
    outputRange: [PHOTO_HEIGHT / 2, 0, -PHOTO_HEIGHT / 3],
    extrapolate: 'clamp',
  });

  // Cost per wear
  const purchase = (item as any).purchase_price as number | null;
  const timesWorn = item.times_worn ?? 0;
  const cpw = purchase && timesWorn > 0 ? (purchase / timesWorn).toFixed(2) : null;

  // Last worn
  const lastWornText = item.last_worn
    ? new Date(item.last_worn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Never worn';

  const tags = (item as any).tags as string[] | undefined ?? [];
  const seasons = (item as any).season as string[] | undefined ?? [];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Back button (floats over photo) */}
      <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}>
        <Text style={styles.backBtnText}>‹</Text>
      </TouchableOpacity>

      <Animated.ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
      >
        {/* Photo */}
        <View style={styles.photoContainer}>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: photoTranslate }] }]}>
            <Image
              source={{ uri: item.image_url }}
              style={styles.photo}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        <View style={styles.body}>
          {/* Title */}
          <Text style={styles.itemTitle}>
            {item.color ? `${item.color.charAt(0).toUpperCase()}${item.color.slice(1)} ` : ''}{item.category}
            {(item as any).brand ? ` — ${(item as any).brand}` : ''}
          </Text>

          {/* Stats row */}
          <View style={[styles.statsRow, SHADOW]}>
            <StatCell label="Times worn" value={String(timesWorn)} />
            <View style={styles.statDivider} />
            <StatCell label="Last worn" value={lastWornText} small />
            <View style={styles.statDivider} />
            <StatCell
              label="Cost per wear"
              value={cpw ? `$${cpw}` : '—'}
              valueColor={cpw && Number(cpw) < 1 ? C.green : C.text}
            />
          </View>

          <View style={styles.divider} />

          {/* Tags */}
          <Section title="Tags">
            <View style={styles.chipRow}>
              {item.color && <Chip label={item.color} />}
              {(item as any).pattern && <Chip label={(item as any).pattern} />}
              {item.formality && <Chip label={item.formality} />}
              {seasons.map((s) => <Chip key={s} label={s} />)}
              {tags.slice(0, 5).map((t) => <Chip key={t} label={t} />)}
            </View>
          </Section>

          <View style={styles.divider} />

          {/* Outfits featuring this item */}
          {relatedOutfits.length > 0 && (
            <>
              <Section title="Outfits featuring this item">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.outfitScroll}
                >
                  {relatedOutfits.map((outfit) => (
                    <OutfitMiniCard key={outfit.id} outfit={outfit} />
                  ))}
                </ScrollView>
              </Section>
              <View style={styles.divider} />
            </>
          )}

          {/* Wear history */}
          <Section title="Wear history">
            {wearLogs.length === 0 ? (
              <Text style={styles.emptyText}>No wear history yet</Text>
            ) : (
              wearLogs.map((log) => <WearLogRow key={log.id} log={log} />)
            )}
          </Section>
        </View>

        {/* Bottom spacer for action row */}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* Floating action row */}
      <View style={[styles.actionRow, SHADOW]}>
        <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(item)} activeOpacity={0.85}>
          <Text style={styles.editBtnText}>Edit tags</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.85}>
          <Text style={styles.deleteBtnText}>Delete item</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function StatCell({
  label,
  value,
  small,
  valueColor,
}: {
  label: string;
  value: string;
  small?: boolean;
  valueColor?: string;
}) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, small && styles.statValueSmall, valueColor ? { color: valueColor } : {}]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function OutfitMiniCard({ outfit }: { outfit: OutfitCard }) {
  return (
    <View style={styles.outfitCard}>
      <View style={styles.outfitCardInner}>
        <Text style={styles.outfitCardEmoji}>👔</Text>
        <Text style={styles.outfitCardCount}>{outfit.garment_ids.length} items</Text>
      </View>
      <Text style={styles.outfitOccasion} numberOfLines={1}>
        {outfit.occasion ?? 'Casual'}
      </Text>
    </View>
  );
}

function WearLogRow({ log }: { log: WearLogEntry }) {
  const date = new Date(log.worn_date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return (
    <View style={styles.wearRow}>
      <Text style={styles.wearDate}>{date}</Text>
      <View style={styles.wearRight}>
        {log.occasion && <Text style={styles.wearOccasion}>{log.occasion}</Text>}
        {log.user_rating && (
          <Text style={styles.wearRating}>{'★'.repeat(log.user_rating)}</Text>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },

  backBtn: {
    position: 'absolute',
    top: 48,
    left: 16,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  backBtnText: { fontSize: 24, color: C.text, lineHeight: 30, marginTop: -2 },

  photoContainer: {
    height: PHOTO_HEIGHT,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  photo: { width: W, height: PHOTO_HEIGHT },

  body: { paddingHorizontal: 20, paddingTop: 20 },

  itemTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: C.text,
    letterSpacing: -0.3,
    marginBottom: 16,
    textTransform: 'capitalize',
  },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 20,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 3 },
  statValueSmall: { fontSize: 13, fontWeight: '600' },
  statLabel: { fontSize: 11, color: C.textTertiary, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: C.divider, marginVertical: 4 },

  divider: { height: 1, backgroundColor: C.divider, marginVertical: 16 },

  section: { marginBottom: 4 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: C.chip,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  chipText: { fontSize: 13, color: C.chipText, fontWeight: '500', textTransform: 'capitalize' },

  outfitScroll: { gap: 12 },
  outfitCard: { width: 100, alignItems: 'center' },
  outfitCardInner: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: C.chip,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  outfitCardEmoji: { fontSize: 28 },
  outfitCardCount: { fontSize: 11, color: C.textSecondary },
  outfitOccasion: {
    marginTop: 5,
    fontSize: 11,
    color: C.textTertiary,
    textAlign: 'center',
    textTransform: 'capitalize',
  },

  wearRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  wearDate: { fontSize: 14, color: C.text, fontWeight: '500' },
  wearRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wearOccasion: { fontSize: 12, color: C.textSecondary, textTransform: 'capitalize' },
  wearRating: { fontSize: 12, color: '#F0A500' },

  emptyText: { fontSize: 14, color: C.textTertiary, fontStyle: 'italic' },

  actionRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  editBtn: {
    flex: 1,
    backgroundColor: C.btn,
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: 'center',
  },
  editBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  deleteBtn: {
    flex: 1,
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.red,
  },
  deleteBtnText: { color: C.red, fontSize: 15, fontWeight: '600' },
});
