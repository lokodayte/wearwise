import { useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import ItemDetailScreen from '../src/screens/ItemDetailScreen';
import type { GarmentItem } from '../src/services/api';

export default function ItemDetailRoute() {
  const { item: itemJson } = useLocalSearchParams<{ item: string }>();
  const item: GarmentItem = JSON.parse(itemJson ?? '{}');

  return (
    <ItemDetailScreen
      item={item}
      onBack={() => router.back()}
      onEdit={(g) => {}}
      onDelete={() => router.replace('/(tabs)/wardrobe')}
    />
  );
}
