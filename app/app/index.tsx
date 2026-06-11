import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../src/services/supabase';
import { registerPushToken } from '../src/services/notifications';

export default function Index() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/(tabs)');
        registerPushToken();
      } else {
        router.replace('/onboarding');
      }
      setChecking(false);
    }).catch(() => {
      router.replace('/onboarding');
      setChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace('/(tabs)');
        registerPushToken();
      } else {
        router.replace('/onboarding');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAF8' }}>
        <ActivityIndicator color="#1A1A1A" />
      </View>
    );
  }
  return null;
}
