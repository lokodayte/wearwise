import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/services/supabase';

const C = {
  bg: '#F7F8FA',
  text: '#1C1C1E',
  textSecondary: '#6B7280',
  accent: '#2D7DD2',
  border: '#D1D5DB',
  borderFocus: '#2D7DD2',
  error: '#DC2626',
} as const;

type Mode = 'signup' | 'signin';

export default function ScamShieldAuth() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>(
    params.mode === 'signin' ? 'signin' : 'signup'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const validate = (): string | null => {
    if (!email.trim()) return 'Please enter your email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return 'That doesn\'t look like a valid email address.';
    if (!password) return 'Please enter a password.';
    if (mode === 'signup' && password.length < 8)
      return 'Your password needs to be at least 8 characters.';
    if (mode === 'signup' && password !== confirmPassword)
      return 'The passwords you entered don\'t match.';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { Alert.alert('Please check your details', err); return; }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
        setEmailSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
        router.replace('/scamshield/onboarding');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      const display = msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many')
        ? 'Too many attempts. Please wait a moment before trying again.'
        : msg;
      Alert.alert('Oops', display);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.centeredContent}>
          <Text style={styles.bigEmoji}>📬</Text>
          <Text style={styles.sentTitle}>Check your inbox</Text>
          <Text style={styles.sentBody}>
            We sent a link to{'\n'}
            <Text style={{ fontWeight: '700', color: C.text }}>{email.trim().toLowerCase()}</Text>
            {'\n\n'}Click the link to confirm, then sign in.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => { setEmailSent(false); setMode('signin'); }}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Go to sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>‹ Back</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.appName}>🛡️ ScamShield</Text>
          <Text style={styles.headline}>
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </Text>

          <View style={styles.toggle}>
            {(['signup', 'signin'] as Mode[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
                onPress={() => setMode(m)}
                activeOpacity={0.7}
              >
                <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                  {m === 'signup' ? 'Sign up' : 'Sign in'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={[styles.input, focused === 'email' && styles.inputFocused]}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            ref={passwordRef}
            style={[styles.input, focused === 'password' && styles.inputFocused]}
            value={password}
            onChangeText={setPassword}
            placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            returnKeyType={mode === 'signup' ? 'next' : 'done'}
            onFocus={() => setFocused('password')}
            onBlur={() => setFocused(null)}
            onSubmitEditing={() => {
              if (mode === 'signup') confirmRef.current?.focus();
              else handleSubmit();
            }}
          />

          {mode === 'signup' && (
            <>
              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                ref={confirmRef}
                style={[styles.input, focused === 'confirm' && styles.inputFocused]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat your password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                returnKeyType="done"
                onFocus={() => setFocused('confirm')}
                onBlur={() => setFocused(null)}
                onSubmitEditing={handleSubmit}
              />
            </>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {mode === 'signup' ? 'Create account' : 'Sign in'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchLink}
            onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
          >
            <Text style={styles.switchLinkText}>
              {mode === 'signup'
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 48 },
  backBtn: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  backBtnText: { fontSize: 17, color: C.textSecondary },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  bigEmoji: { fontSize: 56 },
  sentTitle: { fontSize: 26, fontWeight: '600', color: C.text, textAlign: 'center' },
  sentBody: { fontSize: 16, color: C.textSecondary, textAlign: 'center', lineHeight: 24 },
  appName: { fontSize: 17, fontWeight: '700', color: C.accent, marginBottom: 16 },
  headline: { fontSize: 30, fontWeight: '300', color: C.text, marginBottom: 28, letterSpacing: -0.5 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#E9ECF0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 28,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9 },
  toggleBtnActive: { backgroundColor: C.accent },
  toggleText: { fontSize: 15, fontWeight: '500', color: C.textSecondary },
  toggleTextActive: { color: '#FFF' },
  label: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 15 : 13,
    fontSize: 17,
    color: C.text,
    marginBottom: 16,
  },
  inputFocused: { borderColor: C.borderFocus },
  primaryBtn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnDisabled: { backgroundColor: '#93BAE8' },
  primaryBtnText: { color: '#FFF', fontSize: 17, fontWeight: '600' },
  switchLink: { alignItems: 'center', marginTop: 20 },
  switchLinkText: { fontSize: 15, color: C.accent },
});
