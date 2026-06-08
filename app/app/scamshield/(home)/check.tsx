import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCheck } from '../../../src/hooks/useCheck';
import { useScamStore } from '../../../src/store/scamStore';

const C = {
  bg: '#F7F8FA',
  text: '#1C1C1E',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  accent: '#2D7DD2',
  border: '#D1D5DB',
  borderFocus: '#2D7DD2',
  btnDisabled: '#93BAE8',
  card: '#FFFFFF',
} as const;

function isUrl(text: string): boolean {
  const trimmed = text.trim();
  return /^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed);
}

export default function CheckScreen() {
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const { submitCheck, loading } = useCheck();
  const setLastResult = useScamStore((s) => s.setLastResult);

  const inputType = isUrl(input) ? 'link' : 'text';
  const canSubmit = input.trim().length > 0 && !loading;

  const handleCheck = async () => {
    if (!canSubmit) return;
    const result = await submitCheck(inputType, input.trim());
    if (result) {
      setLastResult(result);
      router.push('/scamshield/result');
    } else {
      Alert.alert(
        'Something went wrong',
        'We couldn\'t check that right now. Please try again in a moment.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.appName}>🛡️ ScamShield</Text>
          <Text style={styles.headline}>Is this a scam?</Text>
          <Text style={styles.subheadline}>
            Paste a suspicious message, email, or link and I'll check it for you.
          </Text>

          <View style={[styles.inputCard, focused && styles.inputCardFocused]}>
            <TextInput
              style={styles.textInput}
              value={input}
              onChangeText={setInput}
              placeholder="Paste the message or link here…"
              placeholderTextColor={C.textTertiary}
              multiline
              textAlignVertical="top"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              maxLength={5000}
              editable={!loading}
            />
            {input.length > 0 && (
              <Text style={styles.typeTag}>
                {inputType === 'link' ? '🔗 Link detected' : '💬 Text message'}
              </Text>
            )}
          </View>

          {input.length > 0 && (
            <Text style={styles.charCount}>{input.length} / 5000</Text>
          )}

          <TouchableOpacity
            style={[styles.checkBtn, !canSubmit && styles.checkBtnDisabled]}
            onPress={handleCheck}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#FFF" size="small" />
                <Text style={styles.checkBtnText}>Taking a careful look…</Text>
              </View>
            ) : (
              <Text style={styles.checkBtnText}>Check it</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footnoteCard}>
            <Text style={styles.footnote}>
              This is guidance to help you decide — not a guarantee. When in doubt, don't send money or click.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 48 },
  appName: { fontSize: 15, fontWeight: '700', color: C.accent, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 18 },
  headline: {
    fontSize: 34,
    fontWeight: '300',
    color: C.text,
    letterSpacing: -0.5,
    lineHeight: 42,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    marginBottom: 10,
  },
  subheadline: { fontSize: 17, color: C.textSecondary, lineHeight: 25, marginBottom: 28 },
  inputCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: 16,
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 8,
  },
  inputCardFocused: { borderColor: C.borderFocus },
  textInput: { fontSize: 17, color: C.text, lineHeight: 26, flex: 1, minHeight: 120 },
  typeTag: { fontSize: 13, color: C.textSecondary, marginTop: 10, fontWeight: '500' },
  charCount: { fontSize: 12, color: C.textTertiary, textAlign: 'right', marginBottom: 20 },
  checkBtn: {
    backgroundColor: C.accent,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 28,
  },
  checkBtnDisabled: { backgroundColor: C.btnDisabled },
  checkBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  footnoteCard: {
    backgroundColor: '#EBF3FB',
    borderRadius: 12,
    padding: 14,
  },
  footnote: { fontSize: 14, color: '#4A7CB5', textAlign: 'center', lineHeight: 21 },
});
