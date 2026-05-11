import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as LocalAuthentication from 'expo-local-authentication';
import { View, Text, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
    mutations: { retry: 0 },
  },
});

export default function RootLayout() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    authenticateWithBiometrics();
  }, []);

  async function authenticateWithBiometrics() {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        setAuthenticated(true);
        setChecking(false);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access SolveSphere AI',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
      });

      setAuthenticated(result.success);
    } catch {
      setAuthenticated(true); // fallback: allow access if biometric fails
    } finally {
      setChecking(false);
    }
  }

  if (checking) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>SolveSphere AI</Text>
      </View>
    );
  }

  if (!authenticated) {
    return (
      <View style={styles.locked}>
        <Text style={styles.lockedText}>🔒 Authentication Required</Text>
        <Text style={styles.lockedSub} onPress={authenticateWithBiometrics}>
          Tap to retry
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
        <StatusBar style="auto" />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563eb' },
  loadingText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  locked: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', gap: 12 },
  lockedText: { color: '#fff', fontSize: 20, fontWeight: '600' },
  lockedSub: { color: '#94a3b8', fontSize: 15 },
});
