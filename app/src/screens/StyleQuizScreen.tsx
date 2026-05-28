import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuizStore } from '../store/quizStore';
import { request } from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const { width: W } = Dimensions.get('window');

const C = {
  bg: '#FAFAF8',
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#9B9B9B',
  chip: '#F0EFE9',
  chipSelected: '#1A1A1A',
  chipTextSelected: '#FFFFFF',
  progressBg: '#E8E8E4',
  progressFill: '#1A1A1A',
  btn: '#1A1A1A',
  btnDisabled: '#CCCCC4',
  card: '#FFFFFF',
  cardSelected: '#1A1A1A',
  cardSelectedText: '#FFFFFF',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Question data
// ─────────────────────────────────────────────────────────────────────────────

const STYLE_OPTIONS = [
  { id: 'minimal', label: 'Minimal', emoji: '◻️' },
  { id: 'classic', label: 'Classic', emoji: '🎩' },
  { id: 'streetwear', label: 'Streetwear', emoji: '🧢' },
  { id: 'bohemian', label: 'Bohemian', emoji: '🌿' },
  { id: 'smart-casual', label: 'Smart-casual', emoji: '👔' },
  { id: 'eclectic', label: 'Eclectic', emoji: '🎨' },
] as const;

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

const OCCASION_OPTIONS = ['Work', 'Casual', 'Going out', 'Sport', 'Events', 'Travel'] as const;

const GOAL_OPTIONS = [
  { id: 'stop-overbuying', label: 'Stop overbuying', emoji: '🛑' },
  { id: 'wear-more', label: 'Wear more of what I own', emoji: '👗' },
  { id: 'save-time', label: 'Save time getting dressed', emoji: '⏱️' },
  { id: 'build-better', label: 'Build a better wardrobe', emoji: '✨' },
] as const;

const ADVENTURE_LABELS = ['Safe classics', 'Mostly safe', 'Balanced', 'Bold at times', 'Bold statements'];

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  onComplete: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// StyleQuizScreen
// ─────────────────────────────────────────────────────────────────────────────

export default function StyleQuizScreen({ onComplete }: Props) {
  const [step, setStep] = useState(0); // 0-4 = questions, 5 = loading
  const { answers, setAnswer, markCompleted } = useQuizStore();

  // Slide animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const TOTAL_STEPS = 5;

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: step / TOTAL_STEPS,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [step]);

  const canContinue = useCallback((): boolean => {
    switch (step) {
      case 0: return (answers.style?.length ?? 0) > 0;
      case 1: return (answers.colors?.length ?? 0) > 0;
      case 2: return (answers.adventurousness ?? 0) > 0;
      case 3: return (answers.occasions?.length ?? 0) > 0;
      case 4: return !!answers.goal;
      default: return false;
    }
  }, [step, answers]);

  const slideNext = useCallback(() => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -W, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      slideAnim.setValue(W);
      setStep((s) => s + 1);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 12,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  const handleContinue = useCallback(async () => {
    if (step < TOTAL_STEPS - 1) {
      slideNext();
      return;
    }
    // Last step → submit
    setStep(5);
    try {
      await request('PATCH', '/api/users/me', { style_profile: answers });
    } catch {
      // Non-fatal — quiz answers still saved locally
    }
    markCompleted();
    onComplete();
  }, [step, answers, slideNext, markCompleted, onComplete]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (step === 5) {
    return <BuildingProfileScreen />;
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>
      <Text style={styles.stepIndicator}>{step + 1} of {TOTAL_STEPS}</Text>

      {/* Question */}
      <Animated.View
        style={[styles.questionArea, { transform: [{ translateX: slideAnim }] }]}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.questionScroll}>
          {step === 0 && (
            <Q1StyleCards
              selected={answers.style ?? []}
              onToggle={(id) => {
                const cur = answers.style ?? [];
                setAnswer(
                  'style',
                  cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
                );
              }}
            />
          )}
          {step === 1 && (
            <Q2Colors
              selected={answers.colors ?? []}
              onToggle={(name) => {
                const cur = answers.colors ?? [];
                setAnswer(
                  'colors',
                  cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name]
                );
              }}
            />
          )}
          {step === 2 && (
            <Q3Adventure
              value={answers.adventurousness ?? 0}
              onChange={(v) => setAnswer('adventurousness', v)}
            />
          )}
          {step === 3 && (
            <Q4Occasions
              selected={answers.occasions ?? []}
              onToggle={(occ) => {
                const cur = answers.occasions ?? [];
                setAnswer(
                  'occasions',
                  cur.includes(occ) ? cur.filter((x) => x !== occ) : [...cur, occ]
                );
              }}
            />
          )}
          {step === 4 && (
            <Q5Goal
              selected={answers.goal ?? ''}
              onSelect={(id) => setAnswer('goal', id)}
            />
          )}
        </ScrollView>
      </Animated.View>

      {/* Continue button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, !canContinue() && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!canContinue()}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>
            {step === TOTAL_STEPS - 1 ? 'Finish' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual question components
// ─────────────────────────────────────────────────────────────────────────────

function QuestionHeading({ children }: { children: string }) {
  return <Text style={styles.qHeading}>{children}</Text>;
}

// Q1 — Style cards
function Q1StyleCards({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <View>
      <QuestionHeading>How would you describe your everyday style?</QuestionHeading>
      <View style={styles.cardGrid}>
        {STYLE_OPTIONS.map((opt) => {
          const active = selected.includes(opt.id);
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.styleCard, active && styles.styleCardSelected]}
              onPress={() => onToggle(opt.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.styleCardEmoji}>{opt.emoji}</Text>
              <Text style={[styles.styleCardLabel, active && styles.styleCardLabelSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Q2 — Color swatches
function Q2Colors({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (name: string) => void;
}) {
  return (
    <View>
      <QuestionHeading>What colors do you reach for most?</QuestionHeading>
      <Text style={styles.qSub}>Select all that apply</Text>
      <View style={styles.swatchGrid}>
        {COLOR_SWATCHES.map((s) => {
          const active = selected.includes(s.name);
          return (
            <TouchableOpacity
              key={s.name}
              style={[
                styles.swatch,
                { backgroundColor: s.hex },
                'border' in s && { borderWidth: 1, borderColor: '#D0D0C8' },
                active && styles.swatchSelected,
              ]}
              onPress={() => onToggle(s.name)}
              activeOpacity={0.8}
            >
              {active && <Text style={styles.swatchCheck}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Q3 — Adventure scale
function Q3Adventure({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View>
      <QuestionHeading>How adventurous are your outfit choices?</QuestionHeading>
      <View style={styles.scaleRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.scaleDot, value === n && styles.scaleDotSelected]}
            onPress={() => onChange(n)}
            activeOpacity={0.8}
          >
            <Text style={[styles.scaleDotLabel, value === n && styles.scaleDotLabelSelected]}>
              {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.scaleLabels}>
        <Text style={styles.scaleEnd}>Safe classics</Text>
        <Text style={styles.scaleEnd}>Bold statements</Text>
      </View>
      {value > 0 && (
        <Text style={styles.scaleValue}>{ADVENTURE_LABELS[value - 1]}</Text>
      )}
    </View>
  );
}

// Q4 — Occasions
function Q4Occasions({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (occ: string) => void;
}) {
  return (
    <View>
      <QuestionHeading>What occasions do you mostly dress for?</QuestionHeading>
      <Text style={styles.qSub}>Select all that apply</Text>
      <View style={styles.chipWrap}>
        {OCCASION_OPTIONS.map((occ) => {
          const active = selected.includes(occ);
          return (
            <TouchableOpacity
              key={occ}
              style={[styles.chip, active && styles.chipSelected]}
              onPress={() => onToggle(occ)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, active && styles.chipTextSelected]}>{occ}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Q5 — Goal cards
function Q5Goal({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  return (
    <View>
      <QuestionHeading>What's your main goal with Wearwise?</QuestionHeading>
      <View style={styles.goalList}>
        {GOAL_OPTIONS.map((opt) => {
          const active = selected === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.goalCard, active && styles.goalCardSelected]}
              onPress={() => onSelect(opt.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.goalEmoji}>{opt.emoji}</Text>
              <Text style={[styles.goalLabel, active && styles.goalLabelSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Building profile screen
function BuildingProfileScreen() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = (a: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(a, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0.2, duration: 500, useNativeDriver: true }),
        ])
      );
    [pulse(dot1, 0), pulse(dot2, 170), pulse(dot3, 340)].forEach((a) => a.start());
  }, []);

  return (
    <View style={styles.buildingRoot}>
      <Text style={styles.buildingTitle}>Building your{'\n'}style profile...</Text>
      <View style={styles.buildingDots}>
        {[dot1, dot2, dot3].map((d, i) => (
          <Animated.View key={i} style={[styles.buildingDot, { opacity: d }]} />
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  progressTrack: {
    height: 4,
    backgroundColor: C.progressBg,
    marginHorizontal: 0,
  },
  progressFill: { height: 4, backgroundColor: C.progressFill },
  stepIndicator: {
    fontSize: 12,
    color: C.textTertiary,
    textAlign: 'right',
    paddingRight: 20,
    marginTop: 6,
    marginBottom: 4,
  },
  questionArea: { flex: 1 },
  questionScroll: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 8 },

  qHeading: {
    fontSize: 24,
    fontWeight: '300',
    color: C.text,
    lineHeight: 32,
    marginBottom: 10,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    letterSpacing: -0.3,
  },
  qSub: { fontSize: 13, color: C.textTertiary, marginBottom: 18 },

  // Style cards grid
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  styleCard: {
    width: (W - 40 - 12) / 2,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  styleCardSelected: { borderColor: C.cardSelected, backgroundColor: C.cardSelected },
  styleCardEmoji: { fontSize: 28 },
  styleCardLabel: { fontSize: 15, fontWeight: '500', color: C.text },
  styleCardLabelSelected: { color: C.cardSelectedText },

  // Color swatches
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 16,
  },
  swatch: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: C.text,
    transform: [{ scale: 1.12 }],
  },
  swatchCheck: { fontSize: 18, color: '#FFF', fontWeight: '700' },

  // Adventure scale
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  scaleDot: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleDotSelected: { backgroundColor: C.chipSelected },
  scaleDotLabel: { fontSize: 18, fontWeight: '600', color: C.text },
  scaleDotLabelSelected: { color: '#FFF' },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  scaleEnd: { fontSize: 12, color: C.textTertiary },
  scaleValue: {
    fontSize: 15,
    color: C.textSecondary,
    textAlign: 'center',
    marginTop: 14,
    fontStyle: 'italic',
  },

  // Occasion chips
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: C.chip,
  },
  chipSelected: { backgroundColor: C.chipSelected },
  chipText: { fontSize: 15, fontWeight: '500', color: C.text },
  chipTextSelected: { color: '#FFF' },

  // Goal cards
  goalList: { gap: 12, marginTop: 12 },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  goalCardSelected: { borderColor: C.cardSelected, backgroundColor: C.cardSelected },
  goalEmoji: { fontSize: 24 },
  goalLabel: { fontSize: 16, fontWeight: '500', color: C.text },
  goalLabelSelected: { color: '#FFF' },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    paddingTop: 12,
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEB',
  },
  btn: {
    backgroundColor: C.btn,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: C.btnDisabled },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  // Building profile
  buildingRoot: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  buildingTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: C.text,
    textAlign: 'center',
    lineHeight: 38,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
  },
  buildingDots: { flexDirection: 'row', gap: 10 },
  buildingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.text },
});
