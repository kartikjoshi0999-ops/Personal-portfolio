import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const HOLDINGS = [
  { ticker: 'AAPL', name: 'Apple', shares: 15, avgCost: 167.50, price: 248.96, assetClass: 'Stock' },
  { ticker: 'VTI', name: 'Vanguard Total Market', shares: 42, avgCost: 215.20, price: 291.45, assetClass: 'ETF' },
  { ticker: 'GOOGL', name: 'Alphabet', shares: 8, avgCost: 142.30, price: 194.23, assetClass: 'Stock' },
  { ticker: 'BTC', name: 'Bitcoin', shares: 0.25, avgCost: 42000, price: 98450, assetClass: 'Crypto' },
];

export default function PortfolioScreen() {
  const enriched = HOLDINGS.map((h) => ({
    ...h,
    value: h.price * h.shares,
    gl: (h.price - h.avgCost) * h.shares,
    glPct: (h.price - h.avgCost) / h.avgCost,
  }));
  const totalValue = enriched.reduce((s, h) => s + h.value, 0);
  const totalGL = enriched.reduce((s, h) => s + h.gl, 0);
  const totalGLPct = totalGL / enriched.reduce((s, h) => s + h.avgCost * h.shares, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Portfolio</Text>
          <TouchableOpacity style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Value</Text>
          <Text style={styles.summaryValue}>${totalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</Text>
          <View style={styles.glRow}>
            <Ionicons name={totalGL >= 0 ? 'trending-up' : 'trending-down'} size={14} color={totalGL >= 0 ? '#86efac' : '#fca5a5'} />
            <Text style={[styles.glText, { color: totalGL >= 0 ? '#86efac' : '#fca5a5' }]}>
              {totalGL >= 0 ? '+' : ''}${totalGL.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({(totalGLPct * 100).toFixed(2)}%) all time
            </Text>
          </View>
        </View>

        {/* Holdings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Holdings</Text>
          {enriched.map((h) => (
            <TouchableOpacity key={h.ticker} style={styles.holdingCard}>
              <View style={styles.holdingLeft}>
                <Text style={styles.ticker}>{h.ticker}</Text>
                <Text style={styles.holdingName}>{h.name}</Text>
                <Text style={styles.holdingMeta}>{h.assetClass} · {h.shares} shares</Text>
              </View>
              <View style={styles.holdingRight}>
                <Text style={styles.holdingValue}>${h.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</Text>
                <Text style={[styles.holdingGL, { color: h.gl >= 0 ? '#16a34a' : '#dc2626' }]}>
                  {h.gl >= 0 ? '+' : ''}{(h.glPct * 100).toFixed(2)}%
                </Text>
                <Text style={styles.holdingPrice}>${h.price.toLocaleString()}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Ask AI */}
        <View style={[styles.section, { marginTop: 4 }]}>
          <View style={styles.aiCard}>
            <Text style={styles.aiTitle}>🤖 Ask AI about your portfolio</Text>
            <View style={styles.aiChips}>
              {['Should I rebalance?', 'Over-exposed to tech?', 'Tax-loss opportunities?'].map((q) => (
                <TouchableOpacity key={q} style={styles.aiChip}>
                  <Text style={styles.aiChipText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  summaryCard: { marginHorizontal: 16, borderRadius: 20, backgroundColor: '#1e40af', padding: 20, marginBottom: 4 },
  summaryLabel: { color: '#93c5fd', fontSize: 13 },
  summaryValue: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 4 },
  glRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  glText: { fontSize: 13 },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  holdingCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0' },
  holdingLeft: {},
  ticker: { fontSize: 16, fontWeight: '700', color: '#2563eb' },
  holdingName: { fontSize: 12, color: '#64748b', marginTop: 2 },
  holdingMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  holdingRight: { alignItems: 'flex-end' },
  holdingValue: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  holdingGL: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  holdingPrice: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  aiCard: { backgroundColor: '#eff6ff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#bfdbfe' },
  aiTitle: { fontSize: 14, fontWeight: '600', color: '#1e40af', marginBottom: 10 },
  aiChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  aiChip: { backgroundColor: '#dbeafe', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  aiChipText: { fontSize: 12, color: '#1d4ed8', fontWeight: '500' },
});
