import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useScamStore } from '../../src/store/scamStore';
import type { ScamVerdict } from '@wearwise/shared';

// Editable constants — localize these as needed
const HELP_RESOURCES = [
  { label: 'If you already sent money or gave personal info, call your bank immediately.', link: null },
  { label: 'In the US, report scams to the FTC at reportfraud.ftc.gov', link: 'https://reportfraud.ftc.gov' },
  { label: 'For internet crimes, contact the FBI at ic3.gov', link: 'https://www.ic3.gov' },
  { label: 'If it involves your bank, call the number on the back of your card — not any number in the message.', link: null },
];

const VERDICT_CONFIG: Record<
  ScamVerdict,
  { bg: string; text: string; icon: string; headline: string }
> = {
  scam: {
    bg: '#FEF2F2',
    text: '#DC2626',
    icon: '⚠️',
    headline: 'This looks like a scam.',
  },
  suspicious: {
    bg: '#FFFBEB',
    text: '#D97706',
    icon: '⚠️',
    headline: 'Be careful — this looks suspicious.',
  },
  likely_safe: {
    bg: '#F0FDF4',
    text: '#16A34A',
    icon: '✓',
    headline: 'No obvious scam signs — but stay careful.',
  },
  unclear: {
    bg: '#F9FAFB',
    text: '#6B7280',
    icon: '?',
    headline: "I can't be sure about this one.",
  },
};

export default function ResultScreen() {
  const result = useScamStore((s) => s.lastResult);

  if (!result) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F8FA', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 17, color: '#6B7280' }}>No result to show.</Text>
        <TouchableOpacity onPress={() => router.replace('/scamshield/(home)/check')} style={{ marginTop: 20 }}>
          <Text style={{ color: '#2D7DD2', fontSize: 16 }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const config = VERDICT_CONFIG[result.verdict];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Verdict band */}
        <View style={[styles.verdictBand, { backgroundColor: config.bg }]}>
          <Text style={[styles.verdictIcon, { color: config.text }]}>{config.icon}</Text>
          <Text style={[styles.verdictHeadline, { color: config.text }]}>
            {config.headline}
          </Text>
          <View style={styles.riskRow}>
            <View style={styles.riskBarBg}>
              <View
                style={[
                  styles.riskBarFill,
                  { width: `${result.riskScore}%` as `${number}%`, backgroundColor: config.text },
                ]}
              />
            </View>
            <Text style={[styles.riskLabel, { color: config.text }]}>
              Risk: {result.riskScore}/100
            </Text>
          </View>
          {result.scamType && (
            <Text style={[styles.scamTypeTag, { color: config.text, borderColor: config.text }]}>
              {result.scamType.replace(/_/g, ' ')}
            </Text>
          )}
        </View>

        {/* Why section */}
        {result.reasons.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why we flagged this</Text>
            {result.reasons.map((reason, i) => (
              <View key={i} style={styles.reasonRow}>
                <Text style={styles.reasonBullet}>🚩</Text>
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Advice section */}
        <View style={styles.adviceCard}>
          <Text style={styles.adviceLabel}>What to do now</Text>
          <Text style={styles.adviceText}>{result.advice}</Text>
        </View>

        {/* Permanent footnote */}
        <View style={styles.footnoteCard}>
          <Text style={styles.footnote}>
            This is guidance to help you decide — not a guarantee. When in doubt, don't send money or click, and check with someone you trust.
          </Text>
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace('/scamshield/(home)/check')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Check something else</Text>
        </TouchableOpacity>

        {/* Help section */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Need more help?</Text>
          {HELP_RESOURCES.map((r, i) => (
            <TouchableOpacity
              key={i}
              style={styles.helpRow}
              onPress={() => r.link && Linking.openURL(r.link)}
              activeOpacity={r.link ? 0.7 : 1}
              disabled={!r.link}
            >
              <Text style={styles.helpBullet}>•</Text>
              <Text style={[styles.helpText, r.link && styles.helpLink]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F8FA' },
  scroll: { paddingBottom: 48 },
  verdictBand: {
    padding: 28,
    paddingTop: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 20,
  },
  verdictIcon: { fontSize: 48, marginBottom: 12 },
  verdictHeadline: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
  },
  riskRow: { alignItems: 'center', gap: 6, width: '100%' },
  riskBarBg: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  riskBarFill: { height: '100%', borderRadius: 3 },
  riskLabel: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  scamTypeTag: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderRadius: 20,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  section: { paddingHorizontal: 22, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', marginBottom: 14 },
  reasonRow: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  reasonBullet: { fontSize: 15, marginTop: 1 },
  reasonText: { flex: 1, fontSize: 16, color: '#374151', lineHeight: 24 },
  adviceCard: {
    marginHorizontal: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#2D7DD2',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  adviceLabel: { fontSize: 14, fontWeight: '700', color: '#2D7DD2', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  adviceText: { fontSize: 17, color: '#1C1C1E', lineHeight: 26 },
  footnoteCard: {
    marginHorizontal: 22,
    backgroundColor: '#EBF3FB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  footnote: { fontSize: 14, color: '#4A7CB5', textAlign: 'center', lineHeight: 21 },
  primaryBtn: {
    marginHorizontal: 22,
    backgroundColor: '#2D7DD2',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 28,
  },
  primaryBtnText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
  helpSection: { marginHorizontal: 22 },
  helpTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 12 },
  helpRow: { flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'flex-start' },
  helpBullet: { fontSize: 16, color: '#6B7280', marginTop: 2 },
  helpText: { flex: 1, fontSize: 15, color: '#6B7280', lineHeight: 22 },
  helpLink: { color: '#2D7DD2', textDecorationLine: 'underline' },
});
