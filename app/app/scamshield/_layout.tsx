import { Stack } from 'expo-router';

export default function ScamShieldLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(home)" />
      <Stack.Screen name="result" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
