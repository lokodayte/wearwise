import { useState } from 'react';
import { router } from 'expo-router';
import WelcomeScreen from '../src/screens/WelcomeScreen';
import AuthScreen from '../src/screens/AuthScreen';
import StyleQuizScreen from '../src/screens/StyleQuizScreen';
import ScanInstructionScreen from '../src/screens/ScanInstructionScreen';

type Step = 'welcome' | 'signup' | 'signin' | 'quiz' | 'scan-instructions';

export default function OnboardingFlow() {
  const [step, setStep] = useState<Step>('welcome');

  if (step === 'welcome') {
    return (
      <WelcomeScreen
        onGetStarted={() => setStep('signup')}
        onSignIn={() => setStep('signin')}
      />
    );
  }

  if (step === 'signup') {
    return (
      <AuthScreen
        initialMode="signup"
        onAuthSuccess={() => setStep('quiz')}
        onBack={() => setStep('welcome')}
      />
    );
  }

  if (step === 'signin') {
    return (
      <AuthScreen
        initialMode="signin"
        onAuthSuccess={() => router.replace('/(tabs)')}
        onBack={() => setStep('welcome')}
      />
    );
  }

  if (step === 'quiz') {
    return (
      <StyleQuizScreen
        onComplete={() => setStep('scan-instructions')}
      />
    );
  }

  return (
    <ScanInstructionScreen
      onStartScan={() => router.replace('/scan')}
      onSkip={() => router.replace('/(tabs)')}
    />
  );
}
