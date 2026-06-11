import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { request } from '../services/api';

interface UserProfile {
  id: string;
  email: string;
  style_profile?: {
    preferred_styles?: string[];
    preferred_colors?: string[];
    avoided_colors?: string[];
    body_shape?: string;
  };
}

interface Props {
  onSignOut?: () => void;
}

export function ProfileScreen({ onSignOut }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await request<UserProfile>('GET', '/api/users/me');
      setProfile(data);
    } catch {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setProfile({ id: user.id, email: user.email ?? '' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
    onSignOut?.();
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account and all wardrobe data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await request('DELETE', '/api/users/me');
              await supabase.auth.signOut();
              onSignOut?.();
            } catch {
              Alert.alert('Error', 'Could not delete account. Please try again.');
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#1A1A1A" />
      </View>
    );
  }

  const styles_ = profile?.style_profile;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Profile</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{profile?.email ?? '—'}</Text>
        </View>

        {styles_ && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Style Profile</Text>
            {styles_.body_shape && (
              <Row label="Body shape" value={styles_.body_shape} />
            )}
            {styles_.preferred_styles?.length ? (
              <Row label="Styles" value={styles_.preferred_styles.join(', ')} />
            ) : null}
            {styles_.preferred_colors?.length ? (
              <Row label="Favourite colours" value={styles_.preferred_colors.join(', ')} />
            ) : null}
            {styles_.avoided_colors?.length ? (
              <Row label="Avoided colours" value={styles_.avoided_colors.join(', ')} />
            ) : null}
          </View>
        )}

        <TouchableOpacity
          style={styles.btn}
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.8}
        >
          {signingOut ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>Sign out</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDeleteAccount}
          activeOpacity={0.8}
        >
          <Text style={styles.deleteBtnText}>Delete account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAF8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAF8' },
  content: { padding: 24, gap: 16 },
  heading: { fontSize: 28, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#9B9B9B', marginBottom: 4 },
  row: { gap: 2 },
  label: { fontSize: 12, color: '#9B9B9B', fontWeight: '500' },
  value: { fontSize: 15, color: '#1A1A1A', fontWeight: '500' },
  btn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  deleteBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  deleteBtnText: { color: '#FF3B30', fontSize: 15, fontWeight: '600' },
});
