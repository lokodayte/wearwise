import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import type { ScannedItem } from '../hooks/useScanFlow';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = {
  bg: '#FAFAF8',
  card: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#9B9B9B',
  chipBg: '#F0EFE9',
  chipSelected: '#1A1A1A',
  chipSelectedText: '#FFFFFF',
  accent: '#1A1A1A',
  divider: '#EFEFEB',
} as const;

const CATEGORIES = ['top', 'bottom', 'shoes', 'outerwear', 'dress', 'accessory'] as const;
const FORMALITIES = ['casual', 'smart-casual', 'formal'] as const;
const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;

const COLOR_SWATCHES = [
  { name: 'black', hex: '#1A1A1A' },
  { name: 'white', hex: '#F5F5F0' },
  { name: 'grey', hex: '#9B9B9B' },
  { name: 'navy', hex: '#1B2A4A' },
  { name: 'beige', hex: '#D4B896' },
  { name: 'camel', hex: '#C19A6B' },
  { name: 'brown', hex: '#7B4F2E' },
  { name: 'red', hex: '#C0392B' },
  { name: 'pink', hex: '#E91E8C' },
  { name: 'orange', hex: '#E67E22' },
  { name: 'yellow', hex: '#F1C40F' },
  { name: 'green', hex: '#27AE60' },
  { name: 'teal', hex: '#16A085' },
  { name: 'blue', hex: '#2980B9' },
  { name: 'purple', hex: '#8E44AD' },
  { name: 'denim', hex: '#5B7FA6' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  item: ScannedItem | null;
  onSave: (patch: Partial<ScannedItem>) => void;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ItemEditSheet({ item, onSave, onClose }: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['75%', '95%'], []);

  // Local editable state (mirrors the item)
  const [category, setCategory] = useState(item?.category ?? 'top');
  const [color, setColor] = useState(item?.color ?? 'black');
  const [formality, setFormality] = useState<'casual' | 'smart-casual' | 'formal'>(
    item?.formality ?? 'casual'
  );
  const [season, setSeason] = useState<string[]>(item?.season ?? []);

  // Sync when item changes (different tile tapped)
  useEffect(() => {
    if (item) {
      setCategory(item.category);
      setColor(item.color);
      setFormality(item.formality);
      setSeason(item.season);
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [item]);

  const toggleSeason = useCallback((s: string) => {
    setSeason((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }, []);

  const handleSave = useCallback(() => {
    onSave({ category, color, formality, season });
    sheetRef.current?.close();
  }, [category, color, formality, season, onSave]);

  const renderBackdrop = useCallback(
    (props: object) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
        pressBehavior="close"
        onPress={onClose}
      />
    ),
    [onClose]
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={item ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
        {/* Photo preview */}
        {item && (
          <View style={styles.photoRow}>
            <Image
              source={{ uri: item.remoteUrl ?? item.localUri }}
              style={styles.photo}
              resizeMode="cover"
            />
            <View style={styles.photoMeta}>
              <Text style={styles.sheetTitle}>Edit item</Text>
              <Text style={styles.sheetSubtitle}>
                Adjust tags detected by AI
              </Text>
            </View>
          </View>
        )}

        <View style={styles.divider} />

        {/* Category */}
        <FieldLabel>Category</FieldLabel>
        <SegmentedRow
          options={CATEGORIES}
          selected={category}
          onSelect={setCategory}
        />

        {/* Color */}
        <FieldLabel>Color</FieldLabel>
        <View style={styles.swatchGrid}>
          {COLOR_SWATCHES.map((s) => (
            <TouchableOpacity
              key={s.name}
              style={[
                styles.swatch,
                { backgroundColor: s.hex },
                color === s.name && styles.swatchSelected,
              ]}
              onPress={() => setColor(s.name)}
              activeOpacity={0.8}
            />
          ))}
        </View>
        <Text style={styles.colorLabel}>{color}</Text>

        {/* Formality */}
        <FieldLabel>Formality</FieldLabel>
        <SegmentedRow
          options={FORMALITIES}
          selected={formality}
          onSelect={(v) => setFormality(v as typeof formality)}
          capitalize
        />

        {/* Season */}
        <FieldLabel>Season</FieldLabel>
        <View style={styles.chipRow}>
          {SEASONS.map((s) => {
            const selected = season.includes(s);
            return (
              <TouchableOpacity
                key={s}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => toggleSeason(s)}
                activeOpacity={0.75}
              >
                <Text
                  style={[styles.chipText, selected && styles.chipTextSelected]}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Save button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>Save changes</Text>
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

interface SegmentedRowProps {
  options: readonly string[];
  selected: string;
  onSelect: (v: string) => void;
  capitalize?: boolean;
}

function SegmentedRow({ options, selected, onSelect, capitalize }: SegmentedRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.segmentedRow}
    >
      {options.map((opt) => {
        const isSelected = opt === selected;
        const label = capitalize ? opt.charAt(0).toUpperCase() + opt.slice(1) : opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.segmentChip, isSelected && styles.segmentChipSelected]}
            onPress={() => onSelect(opt)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentChipText,
                isSelected && styles.segmentChipTextSelected,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: COLORS.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  handle: { backgroundColor: '#D0CFC9', width: 36 },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 48, paddingTop: 8 },

  photoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 14 },
  photo: { width: 80, height: 80, borderRadius: 12, backgroundColor: COLORS.chipBg },
  photoMeta: { flex: 1 },
  sheetTitle: { fontSize: 17, fontWeight: '600', color: COLORS.textPrimary },
  sheetSubtitle: { fontSize: 13, color: COLORS.textTertiary, marginTop: 2 },

  divider: { height: 1, backgroundColor: COLORS.divider, marginBottom: 20 },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 18,
  },

  segmentedRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  segmentChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.chipBg,
  },
  segmentChipSelected: { backgroundColor: COLORS.chipSelected },
  segmentChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  segmentChipTextSelected: { color: '#FFFFFF' },

  swatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  swatchSelected: {
    borderWidth: 3,
    borderColor: COLORS.accent,
    transform: [{ scale: 1.15 }],
  },
  colorLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 8,
    textTransform: 'capitalize',
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.chipBg,
  },
  chipSelected: { backgroundColor: COLORS.chipSelected },
  chipText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  chipTextSelected: { color: '#FFFFFF' },

  saveBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
