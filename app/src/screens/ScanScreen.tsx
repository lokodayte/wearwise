import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useScanFlow, type ScannedItem } from '../hooks/useScanFlow';
import { ItemEditSheet } from '../components/ItemEditSheet';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const C = {
  bg: '#0D0D0D',
  bgLight: '#FAFAF8',
  card: '#1A1A1A',
  cardLight: '#FFFFFF',
  text: '#FFFFFF',
  textDim: 'rgba(255,255,255,0.55)',
  textDark: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#9B9B9B',
  accent: '#FFFFFF',
  accentDark: '#1A1A1A',
  green: '#4CAF80',
  red: '#E05555',
  chipBg: '#F0EFE9',
  chipText: '#5A5A52',
  overlay: 'rgba(0,0,0,0.55)',
  progressTrack: 'rgba(255,255,255,0.15)',
  progressFill: '#FFFFFF',
} as const;

const SHADOW = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 4 },
});

function categoryLabel(item: ScannedItem): string {
  const parts: string[] = [];
  if (item.color) parts.push(item.color.charAt(0).toUpperCase() + item.color.slice(1));
  if (item.fabric && item.fabric !== 'unknown') parts.push(item.fabric);
  if (item.category) parts.push(item.category);
  return parts.join(' ') || 'Item';
}

// ─────────────────────────────────────────────────────────────────────────────
// ScanScreen
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  onDone?: () => void;
  onManualAdd?: () => void;
}

export default function ScanScreen({ onDone, onManualAdd }: Props) {
  const {
    scanState,
    photos,
    items,
    processedCount,
    pickPhotos,
    removePhoto,
    startScan,
    updateItem,
    confirmAll,
    reset,
  } = useScanFlow();

  // State transitions — fade between the 3 panels
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevState = useRef(scanState);

  useEffect(() => {
    if (prevState.current !== scanState) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
      prevState.current = scanState;
    }
  }, [scanState]);

  // Bottom sheet state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleSaveEdit = useCallback(
    (patch: Partial<ScannedItem>) => {
      if (editingIndex !== null) updateItem(editingIndex, patch);
      setEditingIndex(null);
    },
    [editingIndex, updateItem]
  );

  const handleConfirm = useCallback(async () => {
    await confirmAll();
    onDone?.();
  }, [confirmAll, onDone]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.root}>
        <Animated.View style={[styles.fill, { opacity: fadeAnim }]}>
          {scanState === 'select' && (
            <SelectState
              photos={photos}
              onPickPhotos={pickPhotos}
              onRemovePhoto={removePhoto}
              onStartScan={startScan}
              onManualAdd={onManualAdd}
            />
          )}
          {scanState === 'scanning' && (
            <ScanningState
              items={items}
              total={photos.length}
              processed={processedCount}
            />
          )}
          {scanState === 'review' && (
            <ReviewState
              items={items}
              onTilePress={setEditingIndex}
              onConfirm={handleConfirm}
              onScanMore={reset}
            />
          )}
        </Animated.View>

        {/* Bottom sheet (always rendered, controlled by item prop) */}
        <ItemEditSheet
          item={editingIndex !== null ? items[editingIndex] ?? null : null}
          onSave={handleSaveEdit}
          onClose={() => setEditingIndex(null)}
        />
      </View>
    </GestureHandlerRootView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE 1 — Select photos
// ─────────────────────────────────────────────────────────────────────────────

interface SelectStateProps {
  photos: { uri: string; assetId: string }[];
  onPickPhotos: () => void;
  onRemovePhoto: (id: string) => void;
  onStartScan: () => void;
  onManualAdd?: () => void;
}

function SelectState({
  photos,
  onPickPhotos,
  onRemovePhoto,
  onStartScan,
  onManualAdd,
}: SelectStateProps) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);

  const hasPhotos = photos.length > 0;

  return (
    <View style={styles.fill}>
      {/* Camera viewfinder */}
      <View style={styles.cameraContainer}>
        {cameraPermission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            onCameraReady={() => setCameraReady(true)}
          />
        ) : (
          <View style={styles.cameraFallback}>
            <Text style={styles.cameraFallbackEmoji}>📷</Text>
            <Text style={styles.cameraFallbackText}>
              {cameraPermission?.canAskAgain
                ? 'Allow camera for live view'
                : 'Camera access denied'}
            </Text>
            {cameraPermission?.canAskAgain && (
              <TouchableOpacity
                style={styles.cameraPermBtn}
                onPress={requestCameraPermission}
              >
                <Text style={styles.cameraPermBtnText}>Allow camera</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Dark gradient overlay */}
        <View style={styles.cameraOverlayTop} />
        <View style={styles.cameraOverlayBottom} />

        {/* Top bar */}
        <SafeAreaView style={styles.cameraTopBar} edges={['top']}>
          <Text style={styles.cameraTitle}>Scan wardrobe</Text>
          <Text style={styles.cameraSubtitle}>Select photos from your library</Text>
        </SafeAreaView>
      </View>

      {/* Bottom panel */}
      <View style={styles.selectBottom}>
        {/* Preview strip */}
        {hasPhotos && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.previewStrip}
          >
            {photos.map((p) => (
              <View key={p.assetId} style={styles.previewThumb}>
                <Image source={{ uri: p.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => onRemovePhoto(p.assetId)}
                  hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {/* Add more */}
            <TouchableOpacity style={styles.addMoreThumb} onPress={onPickPhotos}>
              <Text style={styles.addMoreText}>+</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Primary action */}
        <TouchableOpacity
          style={[styles.primaryBtn, !hasPhotos && styles.primaryBtnOutline]}
          onPress={hasPhotos ? onStartScan : onPickPhotos}
          activeOpacity={0.85}
        >
          <Text style={[styles.primaryBtnText, !hasPhotos && styles.primaryBtnTextOutline]}>
            {hasPhotos
              ? `Scan ${photos.length} item${photos.length !== 1 ? 's' : ''} with AI`
              : 'Select photos'}
          </Text>
        </TouchableOpacity>

        {onManualAdd && (
          <TouchableOpacity style={styles.secondaryLink} onPress={onManualAdd}>
            <Text style={styles.secondaryLinkText}>Add item manually instead</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE 2 — Scanning progress
// ─────────────────────────────────────────────────────────────────────────────

interface ScanningStateProps {
  items: ScannedItem[];
  total: number;
  processed: number;
}

function ScanningState({ items, total, processed }: ScanningStateProps) {
  const progress = total > 0 ? processed / total : 0;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.scanningRoot} edges={['top', 'bottom']}>
      <Text style={styles.scanningTitle}>Analyzing your clothes...</Text>
      <Text style={styles.scanningSubtitle}>
        AI is tagging each item — this takes a moment
      </Text>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: barWidth }]} />
      </View>
      <Text style={styles.progressCount}>
        {processed} of {total} items scanned
      </Text>

      {/* Live feed grid */}
      <ScrollView
        contentContainerStyle={styles.scanGrid}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item, i) => (
          <ScanningTile key={i} item={item} index={i} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ScanningTile({ item, index }: { item: ScannedItem; index: number }) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered fade-in
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 300,
      delay: index * 80,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (item.status === 'done') {
      Animated.spring(checkScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [item.status]);

  const isProcessing = item.status === 'processing';
  const isDone = item.status === 'done';
  const isError = item.status === 'error';

  return (
    <Animated.View style={[styles.scanTile, { opacity: fadeIn }]}>
      <View style={styles.scanTilePhoto}>
        <Image source={{ uri: item.localUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />

        {/* Processing shimmer overlay */}
        {isProcessing && (
          <View style={styles.scanTileOverlay}>
            <ProcessingDots />
          </View>
        )}

        {/* Done checkmark */}
        {isDone && (
          <Animated.View
            style={[styles.scanTileOverlay, styles.scanTileDone, { transform: [{ scale: checkScale }] }]}
          >
            <Text style={styles.checkmark}>✓</Text>
          </Animated.View>
        )}

        {/* Error */}
        {isError && (
          <View style={[styles.scanTileOverlay, styles.scanTileError]}>
            <Text style={styles.errorMark}>!</Text>
          </View>
        )}
      </View>

      <Text style={styles.scanTileLabel} numberOfLines={2}>
        {item.status === 'pending' ? '...' : categoryLabel(item)}
      </Text>
    </Animated.View>
  );
}

function ProcessingDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      );
    const a1 = pulse(dot1, 0);
    const a2 = pulse(dot2, 133);
    const a3 = pulse(dot3, 266);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={styles.dotsRow}>
      {[dot1, dot2, dot3].map((d, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: d }]} />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE 3 — Review
// ─────────────────────────────────────────────────────────────────────────────

interface ReviewStateProps {
  items: ScannedItem[];
  onTilePress: (index: number) => void;
  onConfirm: () => void;
  onScanMore: () => void;
}

function ReviewState({ items, onTilePress, onConfirm, onScanMore }: ReviewStateProps) {
  const doneCount = items.filter((i) => i.status === 'done').length;

  return (
    <SafeAreaView style={styles.reviewRoot} edges={['top', 'bottom']}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewTitle}>Review your wardrobe</Text>
        <Text style={styles.reviewSubtitle}>
          Tap any item to correct AI tags
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.reviewGrid}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item, i) => (
          <ReviewTile
            key={i}
            item={item}
            onPress={() => item.status === 'done' && onTilePress(i)}
          />
        ))}
      </ScrollView>

      <View style={styles.reviewFooter}>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={onConfirm}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmBtnText}>
            Add {doneCount} item{doneCount !== 1 ? 's' : ''} to wardrobe
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.scanMoreBtn} onPress={onScanMore} activeOpacity={0.75}>
          <Text style={styles.scanMoreText}>Scan more items</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function ReviewTile({ item, onPress }: { item: ScannedItem; onPress: () => void }) {
  const isError = item.status === 'error';
  const tileW = (SCREEN_W - 48) / 2;

  return (
    <TouchableOpacity
      style={[styles.reviewTile, { width: tileW }, isError && styles.reviewTileError]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={isError}
    >
      <Image
        source={{ uri: item.remoteUrl ?? item.localUri }}
        style={[styles.reviewTileImg, { height: tileW }]}
        resizeMode="cover"
      />

      <View style={styles.reviewTileInfo}>
        <View style={styles.reviewChipRow}>
          {item.category ? (
            <View style={styles.reviewChip}>
              <Text style={styles.reviewChipText}>{item.category}</Text>
            </View>
          ) : null}
          {item.color ? (
            <View style={[styles.reviewChip, styles.reviewColorChip]}>
              <Text style={styles.reviewChipText}>{item.color}</Text>
            </View>
          ) : null}
        </View>
        {isError ? (
          <Text style={styles.reviewErrText}>Scan failed — tap to skip</Text>
        ) : (
          <Text style={styles.reviewEditHint}>Tap to edit ›</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  fill: { flex: 1 },

  // ── State 1: Select ──────────────────────────────
  cameraContainer: {
    flex: 1,
    backgroundColor: '#111',
    overflow: 'hidden',
  },
  cameraFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    gap: 12,
  },
  cameraFallbackEmoji: { fontSize: 48 },
  cameraFallbackText: { color: 'rgba(255,255,255,0.6)', fontSize: 15, textAlign: 'center', paddingHorizontal: 32 },
  cameraPermBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  cameraPermBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  cameraOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'transparent',
    // gradient via opacity layers
    opacity: 0.6,
  },
  cameraOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: C.overlay,
  },
  cameraTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cameraTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', letterSpacing: -0.3 },
  cameraSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  selectBottom: {
    backgroundColor: C.bg,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    gap: 12,
  },
  previewStrip: { gap: 10, paddingRight: 8 },
  previewThumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E0E0D8',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  addMoreThumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CCCCC4',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreText: { fontSize: 28, color: '#AAAAAA' },

  primaryBtn: {
    backgroundColor: C.accentDark,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: C.accentDark,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  primaryBtnTextOutline: { color: C.accentDark },
  secondaryLink: { alignItems: 'center', paddingVertical: 4 },
  secondaryLinkText: { fontSize: 14, color: C.textSecondary, textDecorationLine: 'underline' },

  // ── State 2: Scanning ────────────────────────────
  scanningRoot: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20 },
  scanningTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: C.textDark,
    marginTop: 24,
    letterSpacing: -0.4,
  },
  scanningSubtitle: { fontSize: 14, color: C.textSecondary, marginTop: 4, marginBottom: 20 },

  progressTrack: {
    height: 6,
    backgroundColor: '#E8E8E4',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: C.accentDark,
    borderRadius: 3,
  },
  progressCount: { fontSize: 13, color: C.textTertiary, marginTop: 8, marginBottom: 20 },

  scanGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  scanTile: {
    width: (SCREEN_W - 40 - 36) / 4,
    alignItems: 'center',
  },
  scanTilePhoto: {
    width: (SCREEN_W - 40 - 36) / 4,
    height: (SCREEN_W - 40 - 36) / 4,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#E8E8E4',
  },
  scanTileOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  scanTileDone: { backgroundColor: 'rgba(76,175,128,0.75)' },
  scanTileError: { backgroundColor: 'rgba(224,85,85,0.75)' },
  checkmark: { fontSize: 22, color: '#FFF', fontWeight: '700' },
  errorMark: { fontSize: 22, color: '#FFF', fontWeight: '700' },
  scanTileLabel: {
    fontSize: 11,
    color: C.textSecondary,
    marginTop: 5,
    textAlign: 'center',
    lineHeight: 14,
  },
  dotsRow: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },

  // ── State 3: Review ──────────────────────────────
  reviewRoot: { flex: 1, backgroundColor: C.bgLight },
  reviewHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  reviewTitle: { fontSize: 24, fontWeight: '700', color: C.textDark, letterSpacing: -0.4 },
  reviewSubtitle: { fontSize: 14, color: C.textSecondary, marginTop: 3 },

  reviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 16,
    paddingBottom: 16,
  },
  reviewTile: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: C.cardLight,
    ...SHADOW,
  },
  reviewTileError: { opacity: 0.5 },
  reviewTileImg: { width: '100%', backgroundColor: '#E8E8E4' },
  reviewTileInfo: { padding: 10 },
  reviewChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  reviewChip: {
    backgroundColor: C.chipBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reviewColorChip: { backgroundColor: '#E8E8E4' },
  reviewChipText: { fontSize: 11, color: C.chipText, fontWeight: '500', textTransform: 'capitalize' },
  reviewEditHint: { fontSize: 11, color: C.textTertiary },
  reviewErrText: { fontSize: 11, color: C.red },

  reviewFooter: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 12,
    backgroundColor: C.bgLight,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEB',
  },
  confirmBtn: {
    backgroundColor: C.accentDark,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  scanMoreBtn: { alignItems: 'center', paddingVertical: 6 },
  scanMoreText: { fontSize: 14, color: C.textSecondary, textDecorationLine: 'underline' },
});
