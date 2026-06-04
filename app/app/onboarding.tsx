import { useState } from 'react';
import { router } from 'expo-router';
import WelcomeScreen from '../src/screens/WelcomeScreen';
import StyleQuizScreen from '../src/screens/StyleQuizScreen';
import ScanInstructionScreen from '../src/screens/ScanInstructionScreen';

type Step = 'welcome' | 'quiz' | 'scan-instructions';

export default function OnboardingFlow() {
  const [step, setStep] = useState<Step>('welcome');

  if (step === 'welcome') {
    return (
      <WelcomeScreen
        onGetStarted={() => setStep('quiz')}
        onSignIn={() => setStep('quiz')}
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
