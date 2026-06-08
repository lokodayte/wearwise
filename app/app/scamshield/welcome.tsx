import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const C = {
  bg: '#F7F8FA',
  text: '#1C1C1E',
  textSecondary: '#6B7280',
  accent: '#2D7DD2',
  border: '#E5E7EB',
} as const;

export default function ScamShieldWelcome() {
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>🛡️</Text>
        </View>

        <Text style={styles.appName}>ScamShield</Text>
        <Text style={styles.headline}>Check any suspicious{'\n'}message in seconds.</Text>
        <Text style={styles.body}>
          Got a strange text, email, or link? Paste it here and we'll tell you if it looks like a scam — and exactly what to do.
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/scamshield/auth?mode=signup')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Get started — it's free</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push('/scamshield/auth?mode=signin')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: '#EBF3FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  icon: { fontSize: 48 },
  appName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.accent,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  headline: {
    fontSize: 34,
    fontWeight: '300',
    color: C.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 42,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    marginBottom: 20,
  },
  body: {
    fontSize: 17,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: C.accent,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
  secondaryBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnText: { color: C.accent, fontSize: 16, fontWeight: '500' },
});
