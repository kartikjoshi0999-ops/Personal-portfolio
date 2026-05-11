import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const QUICK_ACTIONS = [
  { label: 'Scan Math', icon: 'camera' as const, route: '/(tabs)/scan', color: '#2563eb', bg: '#dbeafe' },
  { label: 'Scan Receipt', icon: 'receipt' as const, route: '/(tabs)/budget', color: '#16a34a', bg: '#dcfce7' },
  { label: 'Add Transaction', icon: 'add-circle' as const, route: '/(tabs)/budget', color: '#7c3aed', bg: '#ede9fe' },
  { label: 'Ask AI', icon: 'chatbubble-ellipses' as const, route: '/assistant', color: '#ea580c', bg: '#ffedd5' },
];

const MARKET_DATA = [
  { name: 'S&P 500', value: '5,918', change: '+0.53%', up: true },
  { name: 'NASDAQ', value: '19,310', change: '+0.82%', up: true },
  { name: 'BTC', value: '$98,450', change: '+1.34%', up: true },
  { name: 'ETH', value: '$3,840', change: '-0.67%', up: false },
];

const RECENT_TXS = [
  { merchant: 'Whole Foods', category: 'Food', icon: '🍔', amount: -87.42, date: 'Today' },
  { merchant: 'Shell Gas', category: 'Transport', icon: '🚗', amount: -65.00, date: 'Yesterday' },
  { merchant: 'Employer Inc', category: 'Salary', icon: '💰', amount: 3500.00, date: 'Dec 1' },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning 👋</Text>
            <Text style={styles.subGreeting}>Your financial overview</Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn}>
            <Ionicons name="person-circle-outline" size={32} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {/* Net Worth Card */}
        <View style={styles.netWorthCard}>
          <Text style={styles.netWorthLabel}>Net Worth</Text>
          <Text style={styles.netWorthValue}>$47,832.50</Text>
          <View style={styles.netWorthChange}>
            <Ionicons name="trending-up" size={14} color="#86efac" />
            <Text style={styles.netWorthChangeTxt}>+$1,243 (+2.67%) this month</Text>
          </View>
          <View style={styles.netWorthBreakdown}>
            {[
              { label: 'Assets', value: '$62,450' },
              { label: 'Liabilities', value: '$14,617' },
              { label: 'Portfolio', value: '$31,200' },
            ].map((item) => (
              <View key={item.label} style={styles.netWorthItem}>
                <Text style={styles.netWorthItemLabel}>{item.label}</Text>
                <Text style={styles.netWorthItemValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.label}
                onPress={() => router.push(action.route as any)}
                style={styles.quickBtn}
              >
                <View style={[styles.quickIcon, { backgroundColor: action.bg }]}>
                  <Ionicons name={action.icon} size={22} color={action.color} />
                </View>
                <Text style={styles.quickLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Market Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Markets</Text>
          <View style={styles.marketCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 24, paddingHorizontal: 4 }}>
                {MARKET_DATA.map((m) => (
                  <View key={m.name} style={{ alignItems: 'center' }}>
                    <Text style={styles.marketName}>{m.name}</Text>
                    <Text style={styles.marketValue}>{m.value}</Text>
                    <Text style={[styles.marketChange, { color: m.up ? '#16a34a' : '#dc2626' }]}>
                      {m.change}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/budget')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.txCard}>
            {RECENT_TXS.map((tx, i) => (
              <View key={i} style={[styles.txRow, i < RECENT_TXS.length - 1 && styles.txDivider]}>
                <Text style={styles.txIcon}>{tx.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txMerchant}>{tx.merchant}</Text>
                  <Text style={styles.txMeta}>{tx.category} · {tx.date}</Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.amount > 0 ? '#16a34a' : '#0f172a' }]}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  subGreeting: { fontSize: 13, color: '#64748b', marginTop: 2 },
  avatarBtn: { padding: 4 },
  netWorthCard: { marginHorizontal: 16, borderRadius: 20, backgroundColor: '#2563eb', padding: 20, marginBottom: 8, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  netWorthLabel: { color: '#bfdbfe', fontSize: 13, fontWeight: '500' },
  netWorthValue: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 4 },
  netWorthChange: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  netWorthChangeTxt: { color: '#86efac', fontSize: 13 },
  netWorthBreakdown: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, borderTopWidth: 1, borderTopColor: '#3b82f6', paddingTop: 14 },
  netWorthItem: {},
  netWorthItemLabel: { color: '#93c5fd', fontSize: 11 },
  netWorthItemValue: { color: '#fff', fontSize: 15, fontWeight: '600', marginTop: 2 },
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  seeAll: { fontSize: 13, color: '#2563eb', fontWeight: '500' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickBtn: { width: '47.5%', backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  quickIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickLabel: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  marketCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  marketName: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  marketValue: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  marketChange: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  txCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  txDivider: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  txIcon: { fontSize: 22 },
  txMerchant: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  txMeta: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  txAmount: { fontSize: 14, fontWeight: '700' },
});
