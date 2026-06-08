import { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCheckHistory } from '../../../src/hooks/useCheck';
import { useScamStore } from '../../../src/store/scamStore';
import type { ScamCheck, ScamVerdict } from '@wearwise/shared';

const C = {
  bg: '#F7F8FA',
  text: '#1C1C1E',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  accent: '#2D7DD2',
  card: '#FFFFFF',
  border: '#E5E7EB',
} as const;

const VERDICT_DOT: Record<ScamVerdict, string> = {
  scam: '#DC2626',
  suspicious: '#D97706',
  likely_safe: '#16A34A',
  unclear: '#9CA3AF',
};

const VERDICT_LABEL: Record<ScamVerdict, string> = {
  scam: 'Scam',
  suspicious: 'Suspicious',
  likely_safe: 'Likely safe',
  unclear: 'Unclear',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function HistoryScreen() {
  const { checks, fetchHistory, deleteCheck, loading } = useCheckHistory();
  const setLastResult = useScamStore((s) => s.setLastResult);

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleOpen = useCallback(
    (item: ScamCheck) => {
      setLastResult({
        id: item.id,
        verdict: item.verdict,
        riskScore: item.riskScore,
        scamType: item.scamType,
        reasons: item.reasons,
        advice: item.advice,
        createdAt: item.createdAt,
      });
      router.push('/scamshield/result');
    },
    [setLastResult]
  );

  const renderItem = ({ item }: { item: ScamCheck }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => handleOpen(item)}
      activeOpacity={0.75}
    >
      <View
        style={[styles.dot, { backgroundColor: VERDICT_DOT[item.verdict] }]}
      />
      <View style={styles.rowBody}>
        <Text style={styles.rowContent} numberOfLines={2}>
          {item.inputContent.slice(0, 80)}
          {item.inputContent.length > 80 ? '…' : ''}
        </Text>
        <View style={styles.rowMeta}>
          <Text style={[styles.rowVerdict, { color: VERDICT_DOT[item.verdict] }]}>
            {VERDICT_LABEL[item.verdict]}
          </Text>
          <Text style={styles.rowDate}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => deleteCheck(item.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.deleteBtn}
      >
        <Text style={styles.deleteBtnText}>🗑</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyTitle}>Nothing checked yet.</Text>
      <Text style={styles.emptyBody}>
        When you get a suspicious message, paste it on the Check tab and I'll look it over for you.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
        <Text style={styles.headerSub}>Your recent checks</Text>
      </View>

      {loading && checks.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={checks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={
            checks.length === 0 ? { flex: 1 } : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchHistory}
              tintColor={C.accent}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 30, fontWeight: '700', color: C.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 15, color: C.textSecondary, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  dot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  rowBody: { flex: 1 },
  rowContent: { fontSize: 15, color: C.text, lineHeight: 22, marginBottom: 6 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowVerdict: { fontSize: 13, fontWeight: '600' },
  rowDate: { fontSize: 13, color: C.textTertiary },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 18 },
  separator: { height: 10 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 12,
  },
  emptyIcon: { fontSize: 56, marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: C.text, textAlign: 'center' },
  emptyBody: { fontSize: 16, color: C.textSecondary, textAlign: 'center', lineHeight: 24 },
});
