import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/services/supabase';

export default function ScamShieldIndex() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/scamshield/(home)/check');
      } else {
        router.replace('/scamshield/welcome');
      }
    }).catch(() => {
      router.replace('/scamshield/welcome');
    });
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F8FA' }}>
      <ActivityIndicator color="#2D7DD2" size="large" />
    </View>
  );
}
