import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const SETTINGS = [
  { icon: 'person-outline' as const, label: 'Edit Profile', sub: 'Name, email, avatar' },
  { icon: 'card-outline' as const, label: 'Subscription', sub: 'Free tier · 3 scans left today', badge: 'Upgrade', badgeColor: '#2563eb' },
  { icon: 'link-outline' as const, label: 'Linked Accounts', sub: 'Connect bank via Plaid' },
  { icon: 'notifications-outline' as const, label: 'Notifications', sub: 'Bill reminders, alerts' },
  { icon: 'shield-checkmark-outline' as const, label: 'Security', sub: 'Biometric lock, password' },
  { icon: 'globe-outline' as const, label: 'Currency & Region', sub: 'USD · United States' },
  { icon: 'download-outline' as const, label: 'Export My Data', sub: 'GDPR / PIPEDA compliant' },
  { icon: 'trash-outline' as const, label: 'Delete Account', sub: 'Permanently remove all data', danger: true },
];

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.title}>Profile</Text>

        {/* Avatar + name */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>JS</Text>
          </View>
          <View>
            <Text style={styles.name}>Jane Smith</Text>
            <Text style={styles.email}>jane@example.com</Text>
            <View style={styles.tierBadge}>
              <Text style={styles.tierText}>⭐ Free Tier</Text>
            </View>
          </View>
        </View>

        {/* Usage */}
        <View style={styles.usageCard}>
          <Text style={styles.usageTitle}>Today's Usage</Text>
          <View style={styles.usageRow}>
            <Text style={styles.usageLabel}>Math Scans</Text>
            <Text style={styles.usageValue}>7 / 10</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '70%' }]} />
          </View>
          <View style={styles.usageRow}>
            <Text style={styles.usageLabel}>AI Messages</Text>
            <Text style={styles.usageValue}>14 / 20</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '70%', backgroundColor: '#7c3aed' }]} />
          </View>
          <TouchableOpacity style={styles.upgradeBtn}>
            <Text style={styles.upgradeBtnText}>Upgrade to Pro — $6.99/mo</Text>
          </TouchableOpacity>
        </View>

        {/* Settings list */}
        <View style={styles.settingsList}>
          {SETTINGS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.settingRow, i < SETTINGS.length - 1 && styles.settingDivider]}
            >
              <View style={[styles.settingIcon, item.danger && { backgroundColor: '#fee2e2' }]}>
                <Ionicons name={item.icon} size={18} color={item.danger ? '#ef4444' : '#2563eb'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, item.danger && { color: '#ef4444' }]}>{item.label}</Text>
                <Text style={styles.settingSub}>{item.sub}</Text>
              </View>
              {item.badge ? (
                <View style={[styles.badge, { backgroundColor: item.badgeColor }]}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>SolveSphere AI v1.0.0</Text>
          <TouchableOpacity>
            <Text style={styles.signOut}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', padding: 16, paddingBottom: 8 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  name: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  email: { fontSize: 13, color: '#64748b', marginTop: 2 },
  tierBadge: { marginTop: 6, backgroundColor: '#fef9c3', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  tierText: { fontSize: 11, fontWeight: '600', color: '#854d0e' },
  usageCard: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12, gap: 8 },
  usageTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  usageRow: { flexDirection: 'row', justifyContent: 'space-between' },
  usageLabel: { fontSize: 13, color: '#64748b' },
  usageValue: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  progressTrack: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', backgroundColor: '#2563eb', borderRadius: 3 },
  upgradeBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  upgradeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  settingsList: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  settingDivider: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  settingIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  settingSub: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  footer: { alignItems: 'center', gap: 8, marginTop: 24 },
  footerText: { fontSize: 12, color: '#94a3b8' },
  signOut: { fontSize: 14, color: '#ef4444', fontWeight: '600' },
});
