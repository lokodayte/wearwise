import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const C = {
  bg: '#F7F8FA',
  text: '#1C1C1E',
  textSecondary: '#6B7280',
  accent: '#2D7DD2',
  card: '#FFFFFF',
  dot: '#D1D5DB',
  dotActive: '#2D7DD2',
} as const;

const CARDS = [
  {
    icon: '🔍',
    title: 'Got a suspicious message?',
    body: 'Got a strange text, email, or link? Paste it on the home screen and I\'ll tell you if it looks like a scam.',
  },
  {
    icon: '💡',
    title: 'Clear, honest answers.',
    body: 'I\'ll explain why it might be risky, and tell you exactly what to do. When in doubt, don\'t send money or click.',
  },
];

export default function ScamShieldOnboarding() {
  const [card, setCard] = useState(0);

  const handleNext = () => {
    if (card < CARDS.length - 1) {
      setCard(card + 1);
    } else {
      router.replace('/scamshield/(home)/check');
    }
  };

  const current = CARDS[card];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.appName}>🛡️ ScamShield</Text>

        <View style={styles.card}>
          <Text style={styles.cardIcon}>{current.icon}</Text>
          <Text style={styles.cardTitle}>{current.title}</Text>
          <Text style={styles.cardBody}>{current.body}</Text>
        </View>

        <View style={styles.dots}>
          {CARDS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === card && styles.dotActive]}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>
            {card < CARDS.length - 1 ? 'Next' : 'Get started'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  appName: { fontSize: 15, fontWeight: '700', color: C.accent, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 36 },
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    width: '100%',
  },
  cardIcon: { fontSize: 56, marginBottom: 24 },
  cardTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: C.text,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
  },
  cardBody: { fontSize: 17, color: C.textSecondary, textAlign: 'center', lineHeight: 26 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.dot },
  dotActive: { backgroundColor: C.dotActive, width: 24 },
  footer: { paddingHorizontal: 24, paddingBottom: 24 },
  primaryBtn: {
    backgroundColor: C.accent,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
});
