import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  bg: '#FAFAF8',
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#9B9B9B',
  card: '#FFFFFF',
  btn: '#1A1A1A',
  divider: '#EFEFEB',
} as const;

const SHADOW = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 3 },
});

const TIPS = [
  {
    emoji: '👕',
    title: 'Lay items flat or hang them',
    body: 'A plain background helps the AI isolate your garment accurately.',
  },
  {
    emoji: '☀️',
    title: 'Use good lighting',
    body: 'Natural light near a window gives the most accurate color detection.',
  },
  {
    emoji: '📸',
    title: 'Take up to 20 photos at once',
    body: 'Batch scanning saves time — select your whole wardrobe in one go.',
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  onStartScan: () => void;
  onSkip: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// ScanInstructionScreen
// ─────────────────────────────────────────────────────────────────────────────

export default function ScanInstructionScreen({ onStartScan, onSkip }: Props) {
  const anims = useRef(TIPS.map(() => ({ y: new Animated.Value(24), op: new Animated.Value(0) }))).current;

  useEffect(() => {
    TIPS.forEach((_, i) => {
      Animated.parallel([
        Animated.timing(anims[i].op, {
          toValue: 1,
          duration: 400,
          delay: 100 + i * 120,
          useNativeDriver: true,
        }),
        Animated.timing(anims[i].y, {
          toValue: 0,
          duration: 400,
          delay: 100 + i * 120,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.heading}>Let's scan{'\n'}your wardrobe</Text>
        <Text style={styles.subheading}>
          A few tips for the best AI results
        </Text>

        <View style={styles.tips}>
          {TIPS.map((tip, i) => (
            <Animated.View
              key={i}
              style={[
                styles.tipCard,
                {
                  opacity: anims[i].op,
                  transform: [{ translateY: anims[i].y }],
                },
              ]}
            >
              <View style={styles.tipIconBox}>
                <Text style={styles.tipEmoji}>{tip.emoji}</Text>
              </View>
              <View style={styles.tipText}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipBody}>{tip.body}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Time estimate */}
        <View style={styles.timeRow}>
          <Text style={styles.timeDot}>⏱</Text>
          <Text style={styles.timeText}>Takes about 5 minutes</Text>
        </View>
      </View>

      {/* Footer actions */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={onStartScan} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Start scanning</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.ghostBtn} onPress={onSkip} activeOpacity={0.6}>
          <Text style={styles.ghostBtnText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 32 },

  heading: {
    fontSize: 36,
    fontWeight: '300',
    color: C.text,
    lineHeight: 44,
    letterSpacing: -0.5,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    marginBottom: 8,
  },
  subheading: {
    fontSize: 15,
    color: C.textSecondary,
    marginBottom: 36,
  },

  tips: { gap: 14 },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    ...SHADOW,
  },
  tipIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F5F4EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipEmoji: { fontSize: 26 },
  tipText: { flex: 1, gap: 3 },
  tipTitle: { fontSize: 15, fontWeight: '600', color: C.text },
  tipBody: { fontSize: 13, color: C.textSecondary, lineHeight: 19 },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    paddingHorizontal: 4,
  },
  timeDot: { fontSize: 16 },
  timeText: { fontSize: 14, color: C.textTertiary },

  footer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.divider,
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: C.btn,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  ghostBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D8D8D2',
  },
  ghostBtnText: { color: C.textSecondary, fontSize: 15, fontWeight: '500' },
});
