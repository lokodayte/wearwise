import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import type { GarmentItem } from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const { width: W } = Dimensions.get('window');
const TILE_GAP = 4;
const NUM_COLS = 3;
const TILE_SIZE = (W - TILE_GAP * (NUM_COLS + 1)) / NUM_COLS;

const C = {
  bg: '#FAFAF8',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#9B9B9B',
  chip: '#F0EFE9',
  chipSelected: '#1A1A1A',
  chipText: '#5A5A52',
  divider: '#EFEFEB',
  redDot: '#E05555',
  overlay: 'rgba(0,0,0,0.45)',
  btn: '#1A1A1A',
} as const;

const CATEGORIES = ['All', 'Tops', 'Bottoms', 'Shoes', 'Outerwear', 'Dresses', 'Accessories'] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_MAP: Record<string, string> = {
  Tops: 'top', Bottoms: 'bottom', Shoes: 'shoes',
  Outerwear: 'outerwear', Dresses: 'dress', Accessories: 'accessory',
};

const SORT_OPTIONS = ['Recently added', 'Most worn', 'Least worn', 'Cost per wear'] as const;
type SortOption = typeof SORT_OPTIONS[number];

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;

const COLOR_SWATCHES = [
  { name: 'black', hex: '#1A1A1A' },
  { name: 'white', hex: '#F0EFE9', border: true },
  { name: 'navy', hex: '#1B2A4A' },
  { name: 'grey', hex: '#9B9B9B' },
  { name: 'beige', hex: '#D4B896' },
  { name: 'brown', hex: '#7B4F2E' },
  { name: 'red', hex: '#C0392B' },
  { name: 'green', hex: '#27AE60' },
  { name: 'blue', hex: '#2980B9' },
  { name: 'pink', hex: '#E91E8C' },
] as const;

const SHADOW = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  android: { elevation: 2 },
});

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  onTilePress: (item: GarmentItem) => void;
  onAddPress: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// WardrobeScreen
// ─────────────────────────────────────────────────────────────────────────────

export default function WardrobeScreen({ onTilePress, onAddPress }: Props) {
  const [garments, setGarments] = useState<GarmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [colorFilter, setColorFilter] = useState<string | null>(null);
  const [seasonFilter, setSeasonFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('Recently added');

  // Modal visibility
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [sortModalOpen, setSortModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.from('garments').select('*').order('created_at', { ascending: false });
      if (mounted) {
        setGarments((data ?? []) as GarmentItem[]);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ── Client-side filtering + sorting ────────────────────────────────────────

  const filtered = useMemo(() => {
    let items = [...garments];

    if (activeCategory !== 'All') {
      const cat = CATEGORY_MAP[activeCategory];
      items = items.filter((g) => g.category === cat);
    }
    if (colorFilter) {
      items = items.filter((g) => (g.color ?? '').toLowerCase() === colorFilter);
    }
    if (seasonFilter) {
      items = items.filter((g) =>
        Array.isArray((g as any).season) &&
        (g as any).season.includes(seasonFilter.toLowerCase())
      );
    }

    switch (sortBy) {
      case 'Most worn':
        items.sort((a, b) => b.times_worn - a.times_worn);
        break;
      case 'Least worn':
        items.sort((a, b) => a.times_worn - b.times_worn);
        break;
      case 'Cost per wear':
        items.sort((a, b) => {
          const cpwA = (a as any).purchase_price ? (a as any).purchase_price / Math.max(a.times_worn, 1) : Infinity;
          const cpwB = (b as any).purchase_price ? (b as any).purchase_price / Math.max(b.times_worn, 1) : Infinity;
          return cpwA - cpwB;
        });
        break;
      default:
        break; // 'Recently added' — already sorted by created_at
    }

    return items;
  }, [garments, activeCategory, colorFilter, seasonFilter, sortBy]);

  // ── Staggered entrance animation ───────────────────────────────────────────

  const getAnim = useCallback((index: number) => {
    const anim = new Animated.Value(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 300,
      delay: Math.min(index * 30, 600),
      useNativeDriver: true,
    }).start();
    return anim;
  }, []);

  const anims = useRef<Animated.Value[]>([]);
  useEffect(() => {
    anims.current = filtered.map((_, i) => getAnim(i));
  }, [filtered.length]);

  const renderItem = useCallback(
    ({ item, index }: { item: GarmentItem; index: number }) => {
      const anim = anims.current[index] ?? new Animated.Value(1);
      return (
        <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
          <GarmentTile item={item} onPress={() => onTilePress(item)} />
        </Animated.View>
      );
    },
    [onTilePress]
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>My Wardrobe</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{garments.length}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={onAddPress} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Filter bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterChip, activeCategory === cat && styles.filterChipSelected]}
            onPress={() => setActiveCategory(cat)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, activeCategory === cat && styles.filterChipTextSelected]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.filterIcon, colorFilter && styles.filterIconActive]}
          onPress={() => setColorModalOpen(true)}
        >
          <Text style={styles.filterIconText}>🎨</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterIcon, seasonFilter && styles.filterIconActive]}
          onPress={() => {
            const seasons = ['spring', 'summer', 'autumn', 'winter'];
            const idx = seasonFilter ? seasons.indexOf(seasonFilter) : -1;
            setSeasonFilter(idx < seasons.length - 1 ? seasons[idx + 1] : null);
          }}
        >
          <Text style={styles.filterIconText}>🗓️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterIcon}
          onPress={() => setSortModalOpen(true)}
        >
          <Text style={styles.filterIconText}>↕</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Active filter labels */}
      {(colorFilter || seasonFilter || sortBy !== 'Recently added') && (
        <View style={styles.activeFilters}>
          {colorFilter && (
            <TouchableOpacity style={styles.activeChip} onPress={() => setColorFilter(null)}>
              <Text style={styles.activeChipText}>{colorFilter} ✕</Text>
            </TouchableOpacity>
          )}
          {seasonFilter && (
            <TouchableOpacity style={styles.activeChip} onPress={() => setSeasonFilter(null)}>
              <Text style={styles.activeChipText}>{seasonFilter} ✕</Text>
            </TouchableOpacity>
          )}
          {sortBy !== 'Recently added' && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>{sortBy}</Text>
            </View>
          )}
        </View>
      )}

      {/* Grid */}
      {loading ? (
        <WardrobeSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState onScan={onAddPress} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(g) => g.id}
          numColumns={NUM_COLS}
          renderItem={renderItem}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
        />
      )}

      {/* Color filter modal */}
      <Modal
        visible={colorModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setColorModalOpen(false)}
      >
        <TouchableOpacity style={styles.modalBackdrop} onPress={() => setColorModalOpen(false)} activeOpacity={1}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Filter by color</Text>
            <View style={styles.swatchRow}>
              {COLOR_SWATCHES.map((s) => (
                <TouchableOpacity
                  key={s.name}
                  style={[
                    styles.swatch,
                    { backgroundColor: s.hex },
                    'border' in s && { borderWidth: 1, borderColor: '#D0D0C8' },
                    colorFilter === s.name && styles.swatchSelected,
                  ]}
                  onPress={() => {
                    setColorFilter(colorFilter === s.name ? null : s.name);
                    setColorModalOpen(false);
                  }}
                />
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Sort modal */}
      <Modal
        visible={sortModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSortModalOpen(false)}
      >
        <TouchableOpacity style={styles.modalBackdrop} onPress={() => setSortModalOpen(false)} activeOpacity={1}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Sort by</Text>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.sortRow, sortBy === opt && styles.sortRowSelected]}
                onPress={() => { setSortBy(opt); setSortModalOpen(false); }}
              >
                <Text style={[styles.sortRowText, sortBy === opt && styles.sortRowTextSelected]}>
                  {opt}
                </Text>
                {sortBy === opt && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GarmentTile
// ─────────────────────────────────────────────────────────────────────────────

function GarmentTile({ item, onPress }: { item: GarmentItem; onPress: () => void }) {
  const [imgError, setImgError] = useState(false);

  const daysSinceWorn = item.last_worn
    ? Math.floor((Date.now() - new Date(item.last_worn).getTime()) / 86_400_000)
    : Infinity;
  const showRedDot = daysSinceWorn >= 60;
  const isFavorited = (item as any).rating === 'loved';

  return (
    <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.88}>
      {item.image_url && !imgError ? (
        <Image
          source={{ uri: item.image_url }}
          style={styles.tileImage}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <View style={styles.tilePlaceholder}>
          <Text style={styles.tilePlaceholderEmoji}>{categoryEmoji(item.category)}</Text>
        </View>
      )}

      {/* Bottom gradient overlay */}
      <View style={styles.tileOverlay}>
        <Text style={styles.tileCategory} numberOfLines={1}>{item.category}</Text>
        {isFavorited && <Text style={styles.tileHeart}>♥</Text>}
      </View>

      {/* Unworn dot */}
      {showRedDot && <View style={styles.redDot} />}
    </TouchableOpacity>
  );
}

function categoryEmoji(cat: string): string {
  return ({ top: '👕', bottom: '👖', shoes: '👟', outerwear: '🧥', dress: '👗', accessory: '💍' } as Record<string, string>)[cat] ?? '👚';
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ onScan }: { onScan: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>👗</Text>
      <Text style={styles.emptyTitle}>Your wardrobe is empty</Text>
      <Text style={styles.emptyBody}>Scan your first items to get started</Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onScan} activeOpacity={0.85}>
        <Text style={styles.emptyBtnText}>Scan items</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function WardrobeSkeleton() {
  return (
    <View style={styles.grid}>
      {Array.from({ length: 9 }).map((_, i) => (
        <View key={i} style={[styles.tile, styles.tileSkeleton]} />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 22, fontWeight: '700', color: C.text, letterSpacing: -0.3 },
  countBadge: {
    backgroundColor: C.chip,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countText: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.btn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#FFF', fontSize: 22, lineHeight: 26 },

  filterBar: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: C.chip,
  },
  filterChipSelected: { backgroundColor: C.chipSelected },
  filterChipText: { fontSize: 13, color: C.chipText, fontWeight: '500' },
  filterChipTextSelected: { color: '#FFF' },
  filterIcon: {
    width: 36,
    height: 34,
    borderRadius: 18,
    backgroundColor: C.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIconActive: { backgroundColor: C.chipSelected },
  filterIconText: { fontSize: 16 },

  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  activeChip: {
    backgroundColor: '#E8E8E4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  activeChipText: { fontSize: 12, color: C.textSecondary },

  grid: {
    paddingHorizontal: TILE_GAP,
    paddingTop: TILE_GAP,
    paddingBottom: 24,
  },
  row: { gap: TILE_GAP, marginBottom: TILE_GAP },

  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    overflow: 'hidden',
  },
  tileSkeleton: { backgroundColor: '#E8E8E4' },
  tileImage: { width: '100%', height: '100%' },
  tilePlaceholder: {
    flex: 1,
    backgroundColor: '#F0EFE9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tilePlaceholderEmoji: { fontSize: 28 },
  tileOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    backgroundColor: C.overlay,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  tileCategory: { fontSize: 11, color: '#FFF', fontWeight: '500', flex: 1 },
  tileHeart: { fontSize: 11, color: '#FF6B6B' },
  redDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.redDot,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: C.text },
  emptyBody: { fontSize: 14, color: C.textSecondary, textAlign: 'center' },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: C.btn,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  emptyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitle: { fontSize: 17, fontWeight: '600', color: C.text, marginBottom: 18 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  swatch: { width: 44, height: 44, borderRadius: 22 },
  swatchSelected: { borderWidth: 3, borderColor: C.btn, transform: [{ scale: 1.15 }] },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  sortRowSelected: {},
  sortRowText: { fontSize: 16, color: C.text },
  sortRowTextSelected: { fontWeight: '600' },
  checkmark: { fontSize: 16, color: C.btn },
});
