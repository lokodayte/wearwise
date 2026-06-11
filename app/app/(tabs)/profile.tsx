import { router } from 'expo-router';
import { ProfileScreen } from '../../src/screens/ProfileScreen';

export default function ProfileTab() {
  return <ProfileScreen onSignOut={() => router.replace('/onboarding')} />;
}
