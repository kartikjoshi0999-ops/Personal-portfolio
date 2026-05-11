import { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '@solvesphere/shared';

const CATEGORIES = [
  { category: 'FOOD_DINING', limit: 600, spent: 487.32 },
  { category: 'TRANSPORT', limit: 300, spent: 142.50 },
  { category: 'RENT_MORTGAGE', limit: 2000, spent: 2000 },
  { category: 'ENTERTAINMENT', limit: 150, spent: 178.99 },
  { category: 'SUBSCRIPTIONS', limit: 80, spent: 45.97 },
  { category: 'HEALTHCARE', limit: 200, spent: 0 },
];

export default function BudgetScreen() {
  const totalBudget = CATEGORIES.reduce((s, c) => s + c.limit, 0);
  const totalSpent = CATEGORIES.reduce((s, c) => s + c.spent, 0);
  const overall = totalSpent / totalBudget;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Budget</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="camera-outline" size={20} color="#2563eb" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="add" size={20} color="#2563eb" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Overall progress */}
        <View style={styles.overallCard}>
          <View style={styles.overallRow}>
            <Text style={styles.overallLabel}>December 2024</Text>
            <Text style={styles.overallPct}>{(overall * 100).toFixed(0)}% used</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {
              width: `${Math.min(overall * 100, 100)}%` as any,
              backgroundColor: overall > 1 ? '#ef4444' : overall > 0.8 ? '#f59e0b' : '#2563eb'
            }]} />
          </View>
          <View style={styles.overallAmounts}>
            <Text style={styles.spentText}>${totalSpent.toFixed(0)} spent</Text>
            <Text style={styles.remainText}>${(totalBudget - totalSpent).toFixed(0)} left</Text>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By Category</Text>
          {CATEGORIES.map((cat) => {
            const pct = cat.spent / cat.limit;
            const over = pct > 1;
            const near = pct >= 0.8 && !over;
            return (
              <View key={cat.category} style={styles.catCard}>
                <View style={styles.catHeader}>
                  <View style={styles.catLeft}>
                    <Text style={styles.catIcon}>{CATEGORY_ICONS[cat.category] ?? '📋'}</Text>
                    <View>
                      <Text style={styles.catName}>{CATEGORY_LABELS[cat.category] ?? cat.category}</Text>
                      <Text style={styles.catAmount}>${cat.spent.toFixed(2)} / ${cat.limit}</Text>
                    </View>
                  </View>
                  <Text style={[styles.catStatus, { color: over ? '#ef4444' : near ? '#f59e0b' : '#16a34a' }]}>
                    {over ? `+$${(cat.spent - cat.limit).toFixed(2)}` : `$${(cat.limit - cat.spent).toFixed(2)} left`}
                  </Text>
                </View>
                <View style={styles.catTrack}>
                  <View style={[styles.catFill, {
                    width: `${Math.min(pct * 100, 100)}%` as any,
                    backgroundColor: over ? '#ef4444' : near ? '#f59e0b' : '#2563eb',
                  }]} />
                </View>
              </View>
            );
          })}
        </View>

        {/* AI Insight */}
        <View style={[styles.section, { marginTop: 4 }]}>
          <View style={styles.aiInsight}>
            <Text style={styles.aiInsightTitle}>🤖 AI Spending Insight</Text>
            <Text style={styles.aiInsightText}>
              Your food spending is on track with 9 days left. Entertainment exceeded budget by $29 —
              consider pausing one streaming service. Saving ~18% this month — excellent! 🎉
            </Text>
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
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#bfdbfe' },
  overallCard: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 4 },
  overallRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  overallLabel: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  overallPct: { fontSize: 13, color: '#64748b' },
  progressTrack: { height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  overallAmounts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  spentText: { fontSize: 12, color: '#64748b' },
  remainText: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  catCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  catHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catIcon: { fontSize: 24 },
  catName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  catAmount: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  catStatus: { fontSize: 13, fontWeight: '600' },
  catTrack: { height: 7, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  catFill: { height: '100%', borderRadius: 4 },
  aiInsight: { backgroundColor: '#eff6ff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#bfdbfe' },
  aiInsightTitle: { fontSize: 14, fontWeight: '700', color: '#1e40af', marginBottom: 8 },
  aiInsightText: { fontSize: 13, color: '#1e40af', lineHeight: 19 },
});
