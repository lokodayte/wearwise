import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  bg: '#FAFAF8',
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#9B9B9B',
  border: '#E0E0DA',
  borderFocus: '#1A1A1A',
  btn: '#1A1A1A',
  btnDisabled: '#AAAAAA',
  toggle: '#F0EFE9',
  toggleActive: '#1A1A1A',
  error: '#E05555',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Mode = 'signup' | 'signin';

interface Props {
  initialMode?: Mode;
  onAuthSuccess: () => void;
  onBack?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthScreen
// ─────────────────────────────────────────────────────────────────────────────

export default function AuthScreen({ initialMode = 'signup', onAuthSuccess, onBack }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setPassword('');
    setConfirmPassword('');
  };

  const validate = (): string | null => {
    const trimmed = email.trim();
    if (!trimmed) return 'Please enter your email.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Please enter a valid email address.';
    if (!password) return 'Please enter a password.';
    if (mode === 'signup' && password.length < 8) return 'Password must be at least 8 characters.';
    if (mode === 'signup' && password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { Alert.alert('Invalid input', err); return; }

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
        onAuthSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      // Surface rate-limit message clearly
      const display = msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many')
        ? 'Too many attempts. Please wait a moment before trying again.'
        : msg;
      Alert.alert(mode === 'signup' ? 'Sign up failed' : 'Sign in failed', display);
    } finally {
      setLoading(false);
    }
  };

  // ── Email sent confirmation ──────────────────────────────────────────────

  if (emailSent) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.emailSentWrap}>
          <Text style={styles.emailSentEmoji}>📬</Text>
          <Text style={styles.emailSentTitle}>Check your inbox</Text>
          <Text style={styles.emailSentBody}>
            We sent a confirmation link to{'\n'}
            <Text style={styles.emailSentAddr}>{email.trim().toLowerCase()}</Text>
            {'\n\n'}Click the link to activate your account, then sign in below.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => { setEmailSent(false); switchMode('signin'); }}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Go to sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main form ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {onBack && (
        <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.wordmark}>Wearwise</Text>
          <Text style={styles.headline}>
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </Text>
          <Text style={styles.subheadline}>
            {mode === 'signup'
              ? 'Your AI wardrobe stylist awaits.'
              : 'Sign in to see your wardrobe.'}
          </Text>

          {/* Mode toggle */}
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'signup' && styles.toggleBtnActive]}
              onPress={() => switchMode('signup')}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleText, mode === 'signup' && styles.toggleTextActive]}>
                Sign up
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'signin' && styles.toggleBtnActive]}
              onPress={() => switchMode('signin')}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleText, mode === 'signin' && styles.toggleTextActive]}>
                Sign in
              </Text>
            </TouchableOpacity>
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, focusedField === 'email' && styles.inputFocused]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#BBBBBB"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.passwordRow, focusedField === 'password' && styles.inputFocused]}>
              <TextInput
                ref={passwordRef}
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                placeholderTextColor="#BBBBBB"
                secureTextEntry={!showPassword}
                returnKeyType={mode === 'signup' ? 'next' : 'done'}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                onSubmitEditing={() => {
                  if (mode === 'signup') confirmRef.current?.focus();
                  else handleSubmit();
                }}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm password — signup only */}
          {mode === 'signup' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                ref={confirmRef}
                style={[styles.input, focusedField === 'confirm' && styles.inputFocused]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat password"
                placeholderTextColor="#BBBBBB"
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onFocus={() => setFocusedField('confirm')}
                onBlur={() => setFocusedField(null)}
                onSubmitEditing={handleSubmit}
              />
            </View>
          )}

          {/* Submit */}
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

          {/* Helper links */}
          <View style={styles.helperRow}>
            <TouchableOpacity onPress={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}>
              <Text style={styles.helperLink}>
                {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </Text>
            </TouchableOpacity>
          </View>

          {mode === 'signup' && (
            <Text style={styles.disclaimer}>
              By signing up you agree to our Terms of Service. Your account is protected by Supabase Auth — sign-up attempts are rate-limited to prevent abuse.
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48 },

  backBtn: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  backBtnText: { fontSize: 16, color: C.textSecondary },

  wordmark: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.5,
    marginBottom: 28,
  },
  headline: {
    fontSize: 30,
    fontWeight: '300',
    color: C.text,
    letterSpacing: -0.5,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    marginBottom: 6,
  },
  subheadline: {
    fontSize: 15,
    color: C.textSecondary,
    marginBottom: 32,
  },

  toggle: {
    flexDirection: 'row',
    backgroundColor: C.toggle,
    borderRadius: 12,
    padding: 4,
    marginBottom: 28,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  toggleBtnActive: { backgroundColor: C.toggleActive },
  toggleText: { fontSize: 15, fontWeight: '500', color: C.textSecondary },
  toggleTextActive: { color: '#FFF' },

  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 7 },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    color: C.text,
  },
  inputFocused: { borderColor: C.borderFocus },

  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    color: C.text,
  },
  eyeBtn: { padding: 6 },
  eyeText: { fontSize: 18 },

  primaryBtn: {
    backgroundColor: C.btn,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnDisabled: { backgroundColor: C.btnDisabled },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  helperRow: { alignItems: 'center', marginTop: 20 },
  helperLink: { fontSize: 14, color: C.textSecondary, textDecorationLine: 'underline' },

  disclaimer: {
    marginTop: 20,
    fontSize: 11,
    color: C.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Email sent state
  emailSentWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emailSentEmoji: { fontSize: 52 },
  emailSentTitle: {
    fontSize: 26,
    fontWeight: '600',
    color: C.text,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  emailSentBody: {
    fontSize: 15,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 8,
  },
  emailSentAddr: { color: C.text, fontWeight: '600' },
  primaryBtnFull: {
    backgroundColor: C.btn,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
});
