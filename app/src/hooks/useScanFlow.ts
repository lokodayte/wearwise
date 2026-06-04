import { useState, useCallback, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../services/supabase';
import Constants from 'expo-constants';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ScanState = 'select' | 'scanning' | 'review';

export interface SelectedPhoto {
  uri: string;
  /** local asset identifier */
  assetId: string;
}

export interface ScannedItem {
  localUri: string;
  /** URI returned after upload (Cloudflare R2) */
  remoteUrl: string | null;
  garmentId: string | null;
  category: string;
  color: string;
  secondaryColor?: string;
  pattern: string;
  fabric: string;
  formality: 'casual' | 'smart-casual' | 'formal';
  season: string[];
  styleTags: string[];
  /** processing state for the progress UI */
  status: 'pending' | 'processing' | 'done' | 'error';
  errorMsg?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useScanFlow() {
  const [scanState, setScanState] = useState<ScanState>('select');
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const abortRef = useRef(false);

  // ── Photo selection ───────────────────────────────────────────────────────

  const pickPhotos = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 20,
    });

    if (!result.canceled) {
      const selected: SelectedPhoto[] = result.assets.map((a, i) => ({
        uri: a.uri,
        assetId: a.assetId ?? `${Date.now()}-${i}`,
      }));
      setPhotos((prev) => {
        const existing = new Set(prev.map((p) => p.assetId));
        const fresh = selected.filter((s) => !existing.has(s.assetId));
        return [...prev, ...fresh].slice(0, 20);
      });
    }
  }, []);

  const removePhoto = useCallback((assetId: string) => {
    setPhotos((prev) => prev.filter((p) => p.assetId !== assetId));
  }, []);

  // Add a single photo captured from the camera
  const addCameraPhoto = useCallback((photo: SelectedPhoto) => {
    setPhotos((prev) => {
      if (prev.length >= 20) return prev;
      return [...prev, photo];
    });
  }, []);

  // ── Kick off the scan pipeline ────────────────────────────────────────────

  const startScan = useCallback(async () => {
    if (photos.length === 0) return;
    abortRef.current = false;

    // Initialise items as pending
    const initial: ScannedItem[] = photos.map((p) => ({
      localUri: p.uri,
      remoteUrl: null,
      garmentId: null,
      category: '',
      color: '',
      pattern: '',
      fabric: '',
      formality: 'casual',
      season: [],
      styleTags: [],
      status: 'pending',
    }));
    setItems(initial);
    setProcessedCount(0);
    setScanState('scanning');

    const apiUrl: string =
      Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3000';

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token ?? '';

    // Process one at a time to keep the progress UI smooth
    for (let i = 0; i < photos.length; i++) {
      if (abortRef.current) break;

      // Mark as processing
      setItems((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'processing' } : it))
      );

      try {
        const formData = new FormData();
        formData.append('photos[]', {
          uri: photos[i].uri,
          name: `photo_${i}.jpg`,
          type: 'image/jpeg',
        } as unknown as Blob);

        const res = await fetch(`${apiUrl}/api/scan/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const json = await res.json();
        const garment = json?.data?.[0];

        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: garment ? 'done' : 'error',
                  errorMsg: garment ? undefined : (json?.errors?.[0]?.error ?? 'Scan failed'),
                  remoteUrl: garment?.image_url ?? null,
                  garmentId: garment?.id ?? null,
                  category: garment?.category ?? 'top',
                  color: garment?.color ?? '',
                  pattern: garment?.pattern ?? 'solid',
                  fabric: garment?.ai_tags?.fabric ?? 'unknown',
                  formality: garment?.formality ?? 'casual',
                  season: garment?.season ?? [],
                  styleTags: garment?.tags ?? [],
                }
              : it
          )
        );
      } catch (err) {
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'error',
                  errorMsg: err instanceof Error ? err.message : 'Unknown error',
                }
              : it
          )
        );
      }

      setProcessedCount(i + 1);
    }

    setScanState('review');
  }, [photos]);

  // ── Item editing (called from the bottom sheet) ───────────────────────────

  const updateItem = useCallback(
    (index: number, patch: Partial<ScannedItem>) => {
      setItems((prev) =>
        prev.map((it, i) => (i === index ? { ...it, ...patch } : it))
      );
    },
    []
  );

  // ── Confirm and save all reviewed items ──────────────────────────────────

  const confirmAll = useCallback(async () => {
    const apiUrl: string =
      Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3000';
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token ?? '';

    const doneItems = items.filter((it) => it.status === 'done' && it.garmentId);

    await Promise.allSettled(
      doneItems.map((item) =>
        fetch(`${apiUrl}/api/garments/${item.garmentId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            category: item.category,
            color: item.color,
            formality: item.formality,
            season: item.season,
            tags: item.styleTags,
            pattern: item.pattern,
          }),
        })
      )
    );
  }, [items]);

  const reset = useCallback(() => {
    abortRef.current = true;
    setPhotos([]);
    setItems([]);
    setProcessedCount(0);
    setScanState('select');
  }, []);

  return {
    scanState,
    photos,
    items,
    processedCount,
    pickPhotos,
    removePhoto,
    addCameraPhoto,
    startScan,
    updateItem,
    confirmAll,
    reset,
  };
}
