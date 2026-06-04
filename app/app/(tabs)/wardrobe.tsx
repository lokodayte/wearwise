import { useState } from 'react';
import { router } from 'expo-router';
import WardrobeScreen from '../../src/screens/WardrobeScreen';
import type { GarmentItem } from '../../src/services/api';

export default function WardrobeTab() {
  return (
    <WardrobeScreen
      onTilePress={(item: GarmentItem) => {
        router.push({ pathname: '/item-detail', params: { item: JSON.stringify(item) } });
      }}
      onAddPress={() => router.push('/scan')}
    />
  );
}
