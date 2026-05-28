import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
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

const { width: W, height: H } = Dimensions.get('window');

const C = {
  bg: '#FAFAF8',
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#9B9B9B',
  watermark: 'rgba(26,26,26,0.04)',
  btn: '#1A1A1A',
} as const;

interface Props {
  onGetStarted: () => void;
  onSignIn: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// WelcomeScreen
// ─────────────────────────────────────────────────────────────────────────────

export default function WelcomeScreen({ onGetStarted, onSignIn }: Props) {
  // Hanger swing animation
  const swing = useRef(new Animated.Value(0)).current;
  // Content fade-up
  const contentY = useRef(new Animated.Value(24)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Gentle swing: -8° → +8° → 0° with decreasing amplitude
    Animated.sequence([
      Animated.delay(300),
      Animated.spring(swing, {
        toValue: 1,
        tension: 30,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    // Fade + slide up content
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 700,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.timing(contentY, {
        toValue: 0,
        duration: 700,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const hangerRotate = swing.interpolate({
    inputRange: [0, 1],
    outputRange: ['-12deg', '0deg'],
  });

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Watermark */}
      <Text style={styles.watermark} numberOfLines={1} adjustsFontSizeToFit>
        Wearwise
      </Text>

      {/* Logo */}
      <View style={styles.logoArea}>
        <Animated.View style={{ transform: [{ rotate: hangerRotate }] }}>
          <HangerIcon size={72} color={C.text} />
        </Animated.View>
      </View>

      {/* Text content */}
      <Animated.View
        style={[
          styles.content,
          { opacity: contentOpacity, transform: [{ translateY: contentY }] },
        ]}
      >
        <Text style={styles.tagline}>Your clothes,{'\n'}finally organised.</Text>
        <Text style={styles.subtitle}>
          AI-powered daily outfit suggestions{'\n'}from what you already own.
        </Text>
      </Animated.View>

      {/* CTAs */}
      <Animated.View
        style={[
          styles.actions,
          { opacity: contentOpacity },
        ]}
      >
        <TouchableOpacity style={styles.primaryBtn} onPress={onGetStarted} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Get started</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signInLink} onPress={onSignIn} activeOpacity={0.6}>
          <Text style={styles.signInLinkText}>I already have an account</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hanger SVG (pure RN View-based)
// ─────────────────────────────────────────────────────────────────────────────

function HangerIcon({ size, color }: { size: number; color: string }) {
  // Approximate a hanger using View shapes
  const hook = size * 0.12;
  const bar = size * 0.85;
  const arm = size * 0.4;
  const stroke = size * 0.055;

  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      {/* Hook (small circle at top) */}
      <View
        style={{
          width: hook * 2,
          height: hook * 2,
          borderRadius: hook,
          borderWidth: stroke,
          borderColor: color,
          marginBottom: stroke,
          alignSelf: 'center',
        }}
      />
      {/* Left arm diagonal */}
      <View
        style={{
          position: 'absolute',
          top: hook * 1.8,
          left: size / 2 - arm,
          width: arm,
          height: stroke,
          backgroundColor: color,
          borderRadius: stroke / 2,
          transform: [{ rotate: '-30deg' }],
          transformOrigin: 'right center',
        }}
      />
      {/* Right arm diagonal */}
      <View
        style={{
          position: 'absolute',
          top: hook * 1.8,
          right: size / 2 - arm,
          width: arm,
          height: stroke,
          backgroundColor: color,
          borderRadius: stroke / 2,
          transform: [{ rotate: '30deg' }],
          transformOrigin: 'left center',
        }}
      />
      {/* Bottom bar */}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.08,
          left: (size - bar) / 2,
          width: bar,
          height: stroke,
          backgroundColor: color,
          borderRadius: stroke / 2,
        }}
      />
      {/* Left vertical */}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.08,
          left: (size - bar) / 2,
          width: stroke,
          height: size * 0.16,
          backgroundColor: color,
          borderRadius: stroke / 2,
        }}
      />
      {/* Right vertical */}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.08,
          right: (size - bar) / 2,
          width: stroke,
          height: size * 0.16,
          backgroundColor: color,
          borderRadius: stroke / 2,
        }}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  watermark: {
    position: 'absolute',
    fontSize: W * 0.28,
    fontWeight: '900',
    color: C.watermark,
    letterSpacing: -4,
    top: H * 0.28,
    alignSelf: 'center',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
  },
  logoArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 32,
  },
  content: {
    alignItems: 'center',
    marginBottom: 48,
  },
  tagline: {
    fontSize: 40,
    fontWeight: '300',
    color: C.text,
    textAlign: 'center',
    lineHeight: 48,
    letterSpacing: -1,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    marginBottom: 18,
  },
  subtitle: {
    fontSize: 16,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    width: '100%',
    paddingBottom: 12,
    gap: 14,
  },
  primaryBtn: {
    backgroundColor: C.btn,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  signInLink: { alignItems: 'center', paddingVertical: 4 },
  signInLinkText: {
    fontSize: 15,
    color: C.textSecondary,
    textDecorationLine: 'underline',
  },
});
