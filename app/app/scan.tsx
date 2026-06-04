import { router } from 'expo-router';
import ScanScreen from '../src/screens/ScanScreen';

export default function ScanRoute() {
  return (
    <ScanScreen
      onDone={() => router.replace('/(tabs)/wardrobe')}
      onManualAdd={() => router.replace('/(tabs)/wardrobe')}
    />
  );
}
